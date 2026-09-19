export type M3DialogPhase = 'review' | 'confirm';

export interface M3DialogControl {
  disabled: boolean;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'CHAIN_REQUEST_FAILED';
}

export async function runM3DialogAction(
  phase: M3DialogPhase,
  control: M3DialogControl,
  action: () => Promise<void>,
  showError: (message: string) => void,
): Promise<boolean> {
  control.disabled = true;
  showError('');
  try {
    await action();
    return true;
  } catch (error) {
    const message = errorMessage(error);
    if (phase === 'review') {
      control.disabled = false;
      showError(message);
    } else {
      showError(
        `${message}. Do not retry automatically. Close this dialog and start a new review; if a wallet request may have been submitted, wait for reconciliation first.`,
      );
    }
    return false;
  }
}
