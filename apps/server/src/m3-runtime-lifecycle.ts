import type { M3ChainRuntime, M3RuntimeSyncResult } from './m3-chain-runtime.ts';

/** One sync queue and completion-based timer for both local and public servers. */
export function createM3RuntimeLifecycle(runtimes: readonly M3ChainRuntime[], interval?: number | null) {
  let closed = false;
  let started = false;
  let timer: NodeJS.Timeout | undefined;
  let tail: Promise<M3RuntimeSyncResult | null> = Promise.resolve(null);
  const syncNow = (): Promise<M3RuntimeSyncResult | null> => {
    if (closed) return Promise.reject(new Error('M3_SERVER_CLOSED'));
    const next = tail.then(async () => {
      if (!runtimes.length) return null;
      const settled = await Promise.allSettled(runtimes.map((runtime) => runtime.syncToHead()));
      if (settled.some((result) => result.status === 'rejected')) throw new Error('M3_RUNTIME_SYNC_FAILED');
      return Object.freeze(
        settled.reduce(
          (total, result) => {
            const value = (result as PromiseFulfilledResult<M3RuntimeSyncResult>).value;
            return {
              scannedBlocks: total.scannedBlocks + value.scannedBlocks,
              insertedEvents: total.insertedEvents + value.insertedEvents,
              reorgedBlocks: total.reorgedBlocks + value.reorgedBlocks,
              trackedOperations: total.trackedOperations + value.trackedOperations,
              trackingFailures: total.trackingFailures + value.trackingFailures,
            };
          },
          {
            scannedBlocks: 0,
            insertedEvents: 0,
            reorgedBlocks: 0,
            trackedOperations: 0,
            trackingFailures: 0,
          },
        ),
      );
    });
    tail = next.catch(() => null);
    return next;
  };
  const start = () => {
    if (started || closed || !runtimes.length || !interval) return;
    started = true;
    const schedule = () => {
      timer = setTimeout(() => {
        void syncNow()
          .catch(() => undefined)
          .finally(() => {
            if (!closed) schedule();
          });
      }, interval);
      timer.unref();
    };
    schedule();
  };
  const stop = async () => {
    closed = true;
    if (timer) clearTimeout(timer);
    await tail;
  };
  return Object.freeze({ syncNow, start, stop });
}
