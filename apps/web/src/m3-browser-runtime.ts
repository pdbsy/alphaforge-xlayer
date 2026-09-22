import {
  asAddress,
  asBlockHash,
  asHexData,
  sameAddress,
  type Address,
  type BlockHash,
  type HexData,
  type TransactionHash,
} from '../../../packages/chain-adapter/src/types.ts';
import { decodeM3VaultCalldata } from '../../../packages/chain-adapter/src/vault-abi.ts';
import { ROBINHOOD_CHAIN_TESTNET } from '../../../packages/robinhood-chain/src/network.ts';
import {
  readM3BuildNetwork,
  resolveM3Network,
  type M3NetworkSelection,
  type M3Testnet,
} from './m3-network.ts';
import {
  Eip1193Wallet,
  Eip1193WalletConnection,
  WalletFailure,
  type Eip1193Provider,
  type WalletSession,
  type WalletSubmission,
} from './chain-wallet.ts';
import { M3ChainActionFlow, type M3ActionReview } from './m3-chain-action-flow.ts';
import { transactionPresentationFromEvidence, type M3ProductChainPresentation } from './m3-product-shell.ts';
import {
  type M3DepositApprovalKind,
  type M3DepositApprovalReview,
  type M3ProductActionRequest,
  type M3ProductActionReview,
  type M3ProductRuntime,
} from './m3-product-runtime.ts';
import { createM3VaultActionFactory } from './m3-vault-actions.ts';
import { readM3VaultDepositAuthorization, type M3DepositAuthorization } from './m3-vault-allowance.ts';
import { M3VaultApiClient, type M3VaultSnapshot } from './m3-vault-client.ts';
import { readM3VaultLiveSnapshot } from './m3-vault-live-reader.ts';
import {
  type ProductOperationEvidence,
  type SimulatingRobinhoodTestnetStrategyAdapter,
} from './strategy-adapter.ts';

export interface M3BrowserDeploymentConfig {
  readonly source: 'reviewed-deployment-manifest';
  readonly chainId: 46_630;
  readonly vaultAddress: Address;
  readonly deploymentBlock: string;
  readonly abiVersion: string;
  readonly manifestDigest: BlockHash;
  readonly runtimeBytecodeHash: BlockHash;
}

export interface M3VaultReader {
  readSnapshot(owner: Address): Promise<M3VaultSnapshot>;
  registerSubmission?(input: {
    readonly operationId: string;
    readonly chainId: 46_630;
    readonly owner: Address;
    readonly target: Address;
    readonly calldata: HexData;
    readonly txHash: TransactionHash;
  }): Promise<unknown>;
  readOperationEvidence?(operationId: string, owner: Address): Promise<ProductOperationEvidence>;
}

export interface M3BrowserRuntimeOptions {
  readonly network?: M3NetworkSelection;
  readonly provider?: Eip1193Provider;
  readonly deployment?: M3BrowserDeploymentConfig;
  readonly vaultReader?: M3VaultReader;
  readonly now?: () => string;
  readonly transportProvenance?: 'DEV_MOCK';
}

const supportedActions = ['deposit', 'withdraw', 'close'] as const;
type RuntimeSnapshot =
  | { readonly source: 'CANONICAL'; readonly value: M3VaultSnapshot }
  | { readonly source: 'LIVE_EXIT'; readonly value: M3VaultSnapshot };

interface PendingOperation {
  readonly operationId: string;
  readonly owner: Address;
  readonly txHash: TransactionHash;
}

function operationId(kind: M3ProductActionRequest['kind'] | `approve-${M3DepositApprovalKind}`): string {
  if (!globalThis.crypto?.randomUUID) throw new Error('M3_OPERATION_ID_UNAVAILABLE');
  const value = `m3-${kind}-${globalThis.crypto.randomUUID().replaceAll('-', '')}`;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value)) throw new Error('INVALID_OPERATION_ID');
  return value;
}

function validDeployment(value: M3BrowserDeploymentConfig | undefined): M3BrowserDeploymentConfig | null {
  if (!value) return null;
  if (
    value.source !== 'reviewed-deployment-manifest' ||
    value.chainId !== ROBINHOOD_CHAIN_TESTNET.chainId ||
    !/^(0|[1-9][0-9]*)$/.test(value.deploymentBlock) ||
    !/^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(value.abiVersion)
  )
    throw new Error('INVALID_M3_DEPLOYMENT_CONFIG');
  return Object.freeze({
    ...value,
    vaultAddress: asAddress(value.vaultAddress),
    manifestDigest: asBlockHash(value.manifestDigest),
    runtimeBytecodeHash: asBlockHash(value.runtimeBytecodeHash),
  });
}

function initialSnapshot(deployment: M3BrowserDeploymentConfig | null): M3ProductChainPresentation {
  const snapshot: M3ProductChainPresentation = {
    wallet: { status: 'DISCONNECTED' },
    network: { status: 'UNAVAILABLE' },
    transaction: { status: 'IDLE' },
    onchain: deployment
      ? {
          deployment: 'CONFIGURED',
          health: 'UNAVAILABLE',
          readiness: 'UNKNOWN',
          owner: 'UNKNOWN',
          writeMode: 'DISABLED',
          exitPath: 'UNAVAILABLE',
          supportedActions,
          vaultAddress: deployment.vaultAddress,
        }
      : {
          deployment: 'UNAVAILABLE',
          health: 'UNAVAILABLE',
          readiness: 'UNKNOWN',
          owner: 'UNKNOWN',
          writeMode: 'DISABLED',
          exitPath: 'UNAVAILABLE',
          supportedActions: [],
        },
  };
  return Object.freeze(snapshot);
}

function productAction(request: M3ProductActionRequest, operationId: string) {
  return request.kind === 'close'
    ? ({ operationId, type: 'close' } as const)
    : ({ operationId, type: request.kind, usdcBaseUnits: request.usdcBaseUnits } as const);
}

class M3BrowserRuntime implements M3ProductRuntime {
  readonly #network: M3Testnet;
  readonly #provider: Eip1193Provider | null;
  readonly #deployment: M3BrowserDeploymentConfig | null;
  readonly #reader: M3VaultReader | null;
  readonly #connection: Eip1193WalletConnection | null;
  readonly #flow: M3ChainActionFlow<RuntimeSnapshot, M3ProductActionRequest, never> | null;
  readonly #listeners = new Set<() => void>();
  #actionReviews = new WeakMap<M3ProductActionReview, M3ActionReview>();
  #approvalReviews = new WeakMap<M3DepositApprovalReview, M3DepositAuthorization>();
  readonly #now: () => string;
  readonly #writeMode: 'INJECTED_MOCK' | 'LIVE_AUTHORIZED';
  #pendingOperation: PendingOperation | null = null;
  #session: WalletSession | null = null;
  #sessionEpoch = 0;
  #snapshot: M3ProductChainPresentation;

  constructor(options: M3BrowserRuntimeOptions) {
    this.#network = resolveM3Network(options.network);
    if (options.deployment && options.deployment.chainId !== this.#network.chainId)
      throw new Error('M3_DEPLOYMENT_NETWORK_MISMATCH');
    this.#provider = options.provider ?? null;
    this.#deployment = validDeployment(options.deployment);
    this.#reader = this.#deployment ? (options.vaultReader ?? new M3VaultApiClient()) : null;
    this.#connection = this.#provider
      ? new Eip1193WalletConnection(this.#provider, this.#network.chainId)
      : null;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#writeMode = options.transportProvenance === 'DEV_MOCK' ? 'INJECTED_MOCK' : 'LIVE_AUTHORIZED';
    this.#snapshot = { ...initialSnapshot(this.#deployment), requiredNetwork: this.#networkSelection() };

    if (this.#provider && this.#deployment && this.#reader) {
      const factory = createM3VaultActionFactory({
        chainId: this.#deployment.chainId,
        target: this.#deployment.vaultAddress,
      });
      const wallet = new Eip1193Wallet(this.#provider, {
        chainId: this.#deployment.chainId,
        target: this.#deployment.vaultAddress,
        actionAuthority: factory.authority,
        now: this.#now,
      });
      const adapter: SimulatingRobinhoodTestnetStrategyAdapter<
        RuntimeSnapshot,
        M3ProductActionRequest,
        never
      > = {
        mode: 'robinhood-testnet',
        readSnapshot: ({ wallet: owner }) => {
          if (!owner) return Promise.reject(new Error('WALLET_CONNECTION_REQUIRED'));
          return this.#readFlowSnapshot(owner);
        },
        async observeOperation(): Promise<never> {
          throw new Error('M3_OPERATION_OBSERVATION_NOT_REQUESTED');
        },
        prepareAction: async (request, context) =>
          factory.prepare(productAction(request, operationId(request.kind)), context.owner),
        simulateAction: async (prepared, context) => {
          if (
            context.snapshot.source === 'LIVE_EXIT' &&
            decodeM3VaultCalldata(prepared.data)?.kind === 'DEPOSIT'
          )
            return { ok: false, errorCode: 'M3_CANONICAL_PROJECTION_REQUIRED' } as const;
          try {
            const result = await this.#provider!.request({
              method: 'eth_call',
              params: [
                {
                  from: prepared.owner,
                  to: prepared.target,
                  data: prepared.data,
                  value: `0x${prepared.value.toString(16)}`,
                },
                'latest',
              ],
            });
            asHexData(String(result));
            return { ok: true } as const;
          } catch {
            return { ok: false, errorCode: 'M3_LIVE_SIMULATION_FAILED' } as const;
          }
        },
        submitAction: async (prepared, port) => {
          const epoch = this.#sessionEpoch;
          const submission = this.#submissionForEpoch(await port.submit(prepared), epoch);
          if (submission.state !== 'SUBMITTED') return submission;
          try {
            if (!this.#reader?.registerSubmission) throw new Error('M3_SUBMISSION_REGISTRATION_UNAVAILABLE');
            await this.#reader.registerSubmission({
              operationId: prepared.operationId,
              chainId: this.#deployment!.chainId,
              owner: prepared.owner,
              target: prepared.target,
              calldata: prepared.data,
              txHash: submission.txHash,
            });
            if (epoch !== this.#sessionEpoch) return this.#submissionForEpoch(submission, epoch);
            this.#pendingOperation = Object.freeze({
              operationId: prepared.operationId,
              owner: prepared.owner,
              txHash: submission.txHash,
            });
            return submission;
          } catch {
            if (epoch !== this.#sessionEpoch) return this.#submissionForEpoch(submission, epoch);
            return Object.freeze({
              operationId: prepared.operationId,
              requestedChainId: prepared.chainId,
              requestedOwner: prepared.owner,
              target: prepared.target,
              state: 'SUBMISSION_AMBIGUOUS',
              txHash: submission.txHash,
              observedAt: this.#now(),
              reason: 'LOCAL_EVIDENCE_INVALID',
              retryable: false,
            });
          }
        },
      };
      this.#flow = new M3ChainActionFlow(adapter, wallet);
    } else {
      this.#flow = null;
    }
  }

  get snapshot(): M3ProductChainPresentation {
    return this.#snapshot;
  }

  #networkSelection(): M3NetworkSelection {
    return Object.freeze({ environment: this.#network.key, chainId: this.#network.chainId });
  }

  #publish(snapshot: M3ProductChainPresentation): void {
    this.#snapshot = Object.freeze({ ...snapshot, requiredNetwork: this.#networkSelection() });
    for (const listener of this.#listeners) listener();
  }

  async #readCanonicalSnapshot(owner: Address): Promise<M3VaultSnapshot> {
    if (!this.#reader || !this.#deployment) throw new Error('M3_DEPLOYMENT_NOT_CONFIGURED');
    const snapshot = await this.#reader.readSnapshot(owner);
    if (
      snapshot.chainId !== this.#deployment.chainId ||
      !sameAddress(snapshot.contract, this.#deployment.vaultAddress) ||
      !sameAddress(snapshot.owner, owner) ||
      !sameAddress(snapshot.state.owner, owner)
    )
      throw new Error('M3_VAULT_SNAPSHOT_MISMATCH');
    return snapshot;
  }

  async #readLiveExitSnapshot(): Promise<RuntimeSnapshot> {
    if (!this.#provider || !this.#deployment) throw new Error('M3_LIVE_EXIT_READ_UNAVAILABLE');
    return Object.freeze({
      source: 'LIVE_EXIT',
      value: await readM3VaultLiveSnapshot(this.#provider, {
        chainId: this.#deployment.chainId,
        vaultAddress: this.#deployment.vaultAddress,
      }),
    });
  }

  async #readFlowSnapshot(owner: Address): Promise<RuntimeSnapshot> {
    try {
      return Object.freeze({ source: 'CANONICAL', value: await this.#readCanonicalSnapshot(owner) });
    } catch {
      return this.#readLiveExitSnapshot();
    }
  }

  #presentation(
    session: WalletSession,
    snapshot: RuntimeSnapshot,
    authorization?: M3DepositAuthorization,
  ): M3ProductChainPresentation {
    const contractOwner = snapshot.value.owner;
    const vaultAddress = snapshot.value.contract;
    const owner = sameAddress(contractOwner, session.account);
    const live = snapshot.source === 'CANONICAL';
    const closed = snapshot.value.state.closed;
    return {
      wallet: { status: 'CONNECTED', address: session.account },
      network: { status: 'CORRECT', chainId: session.chainId },
      transaction: this.#snapshot.transaction,
      onchain: {
        deployment: 'CONFIGURED',
        health: live ? 'LIVE' : 'DEGRADED',
        readiness: 'FINALITY_UNKNOWN',
        owner: owner ? 'OWNER' : 'NON_OWNER',
        vaultClosed: closed,
        writeMode: owner && !closed ? this.#writeMode : 'DISABLED',
        exitPath: owner && !closed ? 'SIMULATION' : 'UNAVAILABLE',
        supportedActions: closed ? [] : live ? supportedActions : (['withdraw', 'close'] as const),
        vaultAddress,
        ...(authorization && !closed
          ? {
              depositAuthorization: {
                spender: authorization.summary.vault,
                afUsdcAllowanceBaseUnits: authorization.summary.usdcAllowance,
                passAllowanceBaseUnits: authorization.summary.passAllowance,
                approvalCapability: 'AVAILABLE' as const,
              },
            }
          : {}),
      },
    };
  }

  async #authorization(session: WalletSession, usdcBaseUnits: string): Promise<M3DepositAuthorization> {
    if (!this.#provider || !this.#deployment) throw new Error('M3_DEPLOYMENT_NOT_CONFIGURED');
    return readM3VaultDepositAuthorization(this.#provider, {
      chainId: this.#deployment.chainId,
      vault: this.#deployment.vaultAddress,
      owner: session.account,
      usdcBaseUnits,
    });
  }

  async #connectedPresentation(
    session: WalletSession,
    snapshot: RuntimeSnapshot,
  ): Promise<M3ProductChainPresentation> {
    if (snapshot.source === 'LIVE_EXIT') return this.#presentation(session, snapshot);
    try {
      return this.#presentation(session, snapshot, await this.#authorization(session, '1'));
    } catch {
      return this.#presentation(session, snapshot);
    }
  }

  #clearSession(): void {
    this.#sessionEpoch += 1;
    this.#session = null;
    this.#actionReviews = new WeakMap();
    this.#approvalReviews = new WeakMap();
  }

  #submissionForEpoch(submission: WalletSubmission, epoch: number): WalletSubmission {
    if (epoch === this.#sessionEpoch || submission.state !== 'SUBMITTED') return submission;
    return Object.freeze({
      state: 'SUBMISSION_AMBIGUOUS',
      operationId: submission.operationId,
      requestedChainId: submission.chainId,
      requestedOwner: submission.owner,
      target: submission.target,
      txHash: submission.txHash,
      observedAt: submission.submittedAt,
      reason: 'SESSION_CHANGED',
      retryable: false,
    });
  }

  async #withActiveSession<T>(
    run: (context: {
      readonly session: WalletSession;
      readonly epoch: number;
      readonly assertCurrent: () => void;
    }) => Promise<T>,
  ): Promise<T> {
    const session = this.#session;
    if (!session) throw new Error('WALLET_CONNECTION_REQUIRED');
    const epoch = this.#sessionEpoch;
    const assertCurrent = () => {
      if (epoch !== this.#sessionEpoch || session !== this.#session)
        throw new WalletFailure('WALLET_SESSION_CHANGED');
    };
    const invalidate = () => {
      if (epoch !== this.#sessionEpoch) return;
      this.#clearSession();
      this.#publish({
        ...this.#snapshot,
        wallet: { status: 'DISCONNECTED', errorCode: 'WALLET_SESSION_CHANGED' },
        network: { status: 'UNAVAILABLE' },
        onchain: { ...this.#snapshot.onchain, owner: 'UNKNOWN', writeMode: 'DISABLED' },
      });
    };
    const registered: ('accountsChanged' | 'chainChanged' | 'disconnect')[] = [];
    try {
      for (const event of ['accountsChanged', 'chainChanged', 'disconnect'] as const) {
        try {
          this.#provider!.on(event, invalidate);
          registered.push(event);
        } catch {
          throw new WalletFailure('WALLET_REQUEST_FAILED');
        }
      }
      assertCurrent();
      return await run({ session, epoch, assertCurrent });
    } catch (error) {
      // Late failures must not invalidate a newer connection or hide session drift.
      assertCurrent();
      if (
        error instanceof WalletFailure &&
        [
          'WALLET_SESSION_CHANGED',
          'WALLET_WRONG_CHAIN',
          'WALLET_ACCOUNT_CHANGED',
          'WALLET_DISCONNECTED',
        ].includes(error.code)
      )
        invalidate();
      throw error;
    } finally {
      for (const event of registered) {
        try {
          this.#provider!.removeListener(event, invalidate);
        } catch {
          // Keep the original result when provider cleanup fails.
        }
      }
    }
  }

  #sessionReadRevision = 0;

  async #withSessionRead(read: (assertCurrent: () => void) => Promise<void>): Promise<void> {
    const revision = ++this.#sessionReadRevision;
    let changed = false;
    const assertCurrent = () => {
      if (changed || revision !== this.#sessionReadRevision)
        throw new WalletFailure('WALLET_SESSION_CHANGED');
    };
    const invalidate = () => {
      changed = true;
      if (revision !== this.#sessionReadRevision) return;
      this.#clearSession();
      this.#publish({
        ...this.#snapshot,
        wallet: { status: 'DISCONNECTED', errorCode: 'WALLET_SESSION_CHANGED' },
        network: { status: 'UNAVAILABLE' },
        onchain: { ...this.#snapshot.onchain, owner: 'UNKNOWN', writeMode: 'DISABLED' },
      });
    };
    const registered: ('accountsChanged' | 'chainChanged' | 'disconnect')[] = [];
    try {
      for (const event of ['accountsChanged', 'chainChanged', 'disconnect'] as const) {
        try {
          this.#provider?.on(event, invalidate);
          registered.push(event);
        } catch {
          throw new WalletFailure('WALLET_REQUEST_FAILED');
        }
      }
      await read(assertCurrent);
      assertCurrent();
    } catch (error) {
      if (revision === this.#sessionReadRevision) {
        this.#clearSession();
        const code = error instanceof WalletFailure ? error.code : 'WALLET_REQUEST_FAILED';
        this.#publish({
          ...this.#snapshot,
          wallet: {
            status: code === 'WALLET_REJECTED' ? 'CONNECTION_REJECTED' : 'DISCONNECTED',
            errorCode: code,
          },
          network: code === 'WALLET_WRONG_CHAIN' ? this.#snapshot.network : { status: 'UNAVAILABLE' },
          onchain: { ...this.#snapshot.onchain, owner: 'UNKNOWN', writeMode: 'DISABLED' },
        });
      }
      throw error;
    } finally {
      for (const event of registered) {
        try {
          this.#provider?.removeListener(event, invalidate);
        } catch {
          // Preserve the original sanitized session result if provider cleanup fails.
        }
      }
    }
  }

  async #verifyCurrentSession(session: WalletSession, assertCurrent: () => void): Promise<void> {
    assertCurrent();
    const observed = await this.#connection!.observe();
    assertCurrent();
    if (!observed || !sameAddress(observed.account, session.account) || observed.chainId !== session.chainId)
      throw new WalletFailure('WALLET_SESSION_CHANGED');
  }

  async connect(): Promise<void> {
    return this.#withSessionRead(async (assertCurrent) => {
      if (!this.#connection) {
        const error = new Error('WALLET_PROVIDER_UNAVAILABLE');
        assertCurrent();
        this.#publish({
          ...this.#snapshot,
          wallet: { status: 'DISCONNECTED', errorCode: error.message },
          network: { status: 'UNAVAILABLE' },
        });
        throw error;
      }
      this.#clearSession();
      assertCurrent();
      this.#publish({
        ...this.#snapshot,
        wallet: { status: 'CONNECTING' },
        onchain: { ...this.#snapshot.onchain, owner: 'UNKNOWN', writeMode: 'DISABLED' },
      });
      try {
        if (this.#flow) {
          const connected = await this.#flow.connect();
          assertCurrent();
          const presentation = await this.#connectedPresentation(connected.session, connected.snapshot);
          await this.#verifyCurrentSession(connected.session, assertCurrent);
          assertCurrent();
          this.#session = connected.session;
          this.#publish(presentation);
        } else {
          const session = await this.#connection.connect();
          assertCurrent();
          this.#session = session;
          assertCurrent();
          this.#publish({
            ...this.#snapshot,
            wallet: { status: 'CONNECTED', address: session.account },
            network: { status: 'CORRECT', chainId: session.chainId },
          });
        }
      } catch (error) {
        assertCurrent();
        const code = error instanceof WalletFailure ? error.code : 'WALLET_REQUEST_FAILED';
        let observed = null;
        try {
          observed = await this.#connection.observe();
        } catch {
          // The original sanitized wallet error remains authoritative.
        }
        assertCurrent();
        this.#publish({
          ...this.#snapshot,
          wallet: {
            status: code === 'WALLET_REJECTED' ? 'CONNECTION_REJECTED' : 'DISCONNECTED',
            ...(observed ? { address: observed.account } : {}),
            errorCode: code,
          },
          network: observed
            ? {
                status: observed.chainId === this.#network.chainId ? 'CORRECT' : 'WRONG',
                chainId: observed.chainId,
              }
            : { status: code === 'WALLET_WRONG_CHAIN' ? 'WRONG' : 'UNAVAILABLE' },
        });
        throw error;
      }
    });
  }

  async refresh(): Promise<void> {
    return this.#withSessionRead(async (assertCurrent) => {
      if (!this.#connection) return;
      const session = this.#session;
      const observed = await this.#connection.observe();
      assertCurrent();
      if (!observed) {
        this.#clearSession();
        assertCurrent();
        this.#publish({
          ...this.#snapshot,
          wallet: { status: 'DISCONNECTED', errorCode: 'WALLET_DISCONNECTED' },
          network: { status: 'UNAVAILABLE' },
          onchain: { ...this.#snapshot.onchain, owner: 'UNKNOWN', writeMode: 'DISABLED' },
        });
        return;
      }
      if (session && !sameAddress(observed.account, session.account)) {
        this.#clearSession();
        assertCurrent();
        this.#publish({
          ...this.#snapshot,
          wallet: { status: 'ACCOUNT_CHANGED', address: observed.account },
          network: {
            status: observed.chainId === this.#network.chainId ? 'CORRECT' : 'WRONG',
            chainId: observed.chainId,
          },
          onchain: { ...this.#snapshot.onchain, owner: 'UNKNOWN', writeMode: 'DISABLED' },
        });
        return;
      }
      if (observed.chainId !== this.#network.chainId) {
        this.#clearSession();
        assertCurrent();
        this.#publish({
          ...this.#snapshot,
          wallet: { status: 'CONNECTED', address: observed.account },
          network: { status: 'WRONG', chainId: observed.chainId },
          onchain: { ...this.#snapshot.onchain, owner: 'UNKNOWN', writeMode: 'DISABLED' },
        });
        return;
      }
      if (this.#deployment && this.#reader && session) {
        let snapshot = await this.#readFlowSnapshot(session.account);
        let presentation = await this.#connectedPresentation(session, snapshot);
        const pending = this.#pendingOperation;
        if (pending && sameAddress(pending.owner, session.account) && this.#reader.readOperationEvidence) {
          try {
            const evidence = await this.#reader.readOperationEvidence(pending.operationId, pending.owner);
            if (evidence.indexerStatus === 'DEGRADED' && snapshot.source !== 'LIVE_EXIT') {
              snapshot = await this.#readLiveExitSnapshot();
              presentation = await this.#connectedPresentation(session, snapshot);
            }
            presentation = {
              ...presentation,
              transaction: transactionPresentationFromEvidence(evidence, pending.txHash),
              onchain: {
                ...presentation.onchain,
                health: evidence.indexerStatus === 'DEGRADED' ? 'DEGRADED' : presentation.onchain.health,
                readiness:
                  evidence.chainStatus === 'SOFT_READY'
                    ? 'SOFT_READY'
                    : evidence.chainStatus === 'REORGED'
                      ? 'REORGED'
                      : 'FINALITY_UNKNOWN',
              },
            };
          } catch {
            try {
              snapshot = await this.#readLiveExitSnapshot();
              presentation = {
                ...(await this.#connectedPresentation(session, snapshot)),
                transaction: this.#snapshot.transaction,
              };
            } catch {
              presentation = {
                ...presentation,
                onchain: { ...presentation.onchain, health: 'DEGRADED' },
              };
            }
          }
        }
        await this.#verifyCurrentSession(session, assertCurrent);
        assertCurrent();
        this.#publish(presentation);
      } else {
        assertCurrent();
        this.#publish({
          ...this.#snapshot,
          wallet: { status: 'CONNECTED', address: observed.account },
          network: {
            status: observed.chainId === this.#network.chainId ? 'CORRECT' : 'WRONG',
            chainId: observed.chainId,
          },
        });
      }
    });
  }

  async reviewDepositApprovals(
    request: Extract<M3ProductActionRequest, { readonly kind: 'deposit' }>,
  ): Promise<M3DepositApprovalReview> {
    const deployment = this.#deployment;
    if (!this.#session || !deployment) throw new Error('WALLET_CONNECTION_REQUIRED');
    return this.#withActiveSession(async ({ session, assertCurrent }) => {
      const snapshot = await this.#readCanonicalSnapshot(session.account);
      assertCurrent();
      const authorization = await this.#authorization(session, request.usdcBaseUnits);
      assertCurrent();
      await this.#verifyCurrentSession(session, assertCurrent);
      this.#publish(
        this.#presentation(session, Object.freeze({ source: 'CANONICAL', value: snapshot }), authorization),
      );
      const requirements: M3DepositApprovalReview['requirements'] = [
        Object.freeze({
          kind: 'af-usdc' as const,
          token: authorization.usdcApproval.token,
          spender: authorization.usdcApproval.spender,
          requiredRaw: authorization.usdcApproval.requiredRaw,
          allowance: authorization.usdcApproval.allowance,
          sufficient: authorization.usdcApproval.sufficient,
        }),
        Object.freeze({
          kind: 'pass' as const,
          token: authorization.passApproval.token,
          spender: authorization.passApproval.spender,
          requiredRaw: authorization.passApproval.requiredRaw,
          allowance: authorization.passApproval.allowance,
          sufficient: authorization.passApproval.sufficient,
        }),
      ];
      const review: M3DepositApprovalReview = Object.freeze({
        owner: session.account,
        vaultAddress: deployment.vaultAddress,
        request,
        requirements: Object.freeze(requirements),
      });
      assertCurrent();
      this.#approvalReviews.set(review, authorization);
      return review;
    });
  }

  async confirmDepositApproval(
    review: M3DepositApprovalReview,
    kind: M3DepositApprovalKind,
  ): Promise<WalletSubmission> {
    const authorization = this.#approvalReviews.get(review);
    if (!authorization || !this.#provider || !this.#deployment)
      throw new Error('INVALID_DEPOSIT_APPROVAL_REVIEW');
    return this.#withActiveSession(async ({ epoch, assertCurrent }) => {
      this.#approvalReviews.delete(review);
      const requirement = kind === 'af-usdc' ? authorization.usdcApproval : authorization.passApproval;
      if (requirement.sufficient) throw new Error('DEPOSIT_APPROVAL_ALREADY_SUFFICIENT');
      const wallet = new Eip1193Wallet(this.#provider!, {
        chainId: this.#deployment!.chainId,
        target: requirement.token,
        actionAuthority: requirement.factory.authority,
        now: this.#now,
      });
      const prepared = requirement.factory.prepare(
        { operationId: operationId(`approve-${kind}`) },
        review.owner,
      );
      assertCurrent();
      this.#publish({ ...this.#snapshot, transaction: { status: 'WALLET_PENDING' } });
      const submission = await wallet.submit(prepared, assertCurrent);
      if (epoch !== this.#sessionEpoch) return this.#submissionForEpoch(submission, epoch);
      assertCurrent();
      this.#publish({
        ...this.#snapshot,
        transaction:
          submission.state === 'SUBMITTED'
            ? { status: 'SUBMITTED', txHash: submission.txHash }
            : {
                status: 'SUBMISSION_AMBIGUOUS',
                ...(submission.txHash ? { txHash: submission.txHash } : {}),
                errorCode: submission.reason,
              },
      });
      return submission;
    });
  }

  async reviewAction(request: M3ProductActionRequest): Promise<M3ProductActionReview> {
    if (!this.#flow || !this.#session) throw new Error('M3_DEPLOYMENT_NOT_CONFIGURED');
    return this.#withActiveSession(async ({ session, assertCurrent }) => {
      if (request.kind === 'deposit') {
        const snapshot = await this.#readCanonicalSnapshot(session.account);
        assertCurrent();
        const authorization = await this.#authorization(session, request.usdcBaseUnits);
        assertCurrent();
        await this.#verifyCurrentSession(session, assertCurrent);
        this.#publish(
          this.#presentation(session, Object.freeze({ source: 'CANONICAL', value: snapshot }), authorization),
        );
        if (!authorization.usdcApproval.sufficient || !authorization.passApproval.sufficient)
          throw new Error('DEPOSIT_APPROVAL_REQUIRED');
      }
      assertCurrent();
      this.#publish({ ...this.#snapshot, transaction: { status: 'WALLET_APPROVAL_REQUIRED' } });
      const internal = await this.#flow!.review(request, assertCurrent);
      assertCurrent();
      await this.#verifyCurrentSession(session, assertCurrent);
      const review = Object.freeze({
        operationId: internal.operationId,
        owner: internal.owner,
        request,
      });
      assertCurrent();
      this.#actionReviews.set(review, internal);
      return review;
    });
  }

  async confirmAction(review: M3ProductActionReview): Promise<WalletSubmission> {
    if (!this.#flow) throw new Error('M3_DEPLOYMENT_NOT_CONFIGURED');
    const internal = this.#actionReviews.get(review);
    if (!internal) throw new Error('INVALID_PRODUCT_REVIEW');
    return this.#withActiveSession(async ({ epoch, assertCurrent }) => {
      this.#actionReviews.delete(review);
      assertCurrent();
      this.#publish({ ...this.#snapshot, transaction: { status: 'WALLET_PENDING' } });
      const submission = await this.#flow!.confirm(internal, assertCurrent);
      if (epoch !== this.#sessionEpoch) return this.#submissionForEpoch(submission, epoch);
      assertCurrent();
      this.#publish({
        ...this.#snapshot,
        transaction:
          submission.state === 'SUBMITTED'
            ? { status: 'SUBMITTED', txHash: submission.txHash }
            : {
                status: 'SUBMISSION_AMBIGUOUS',
                ...(submission.txHash ? { txHash: submission.txHash } : {}),
                errorCode: submission.reason,
              },
      });
      return submission;
    });
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
}

export function createM3BrowserRuntime(options: M3BrowserRuntimeOptions): M3ProductRuntime {
  const buildEnv = (import.meta as { readonly env?: Parameters<typeof readM3BuildNetwork>[0] }).env;
  return new M3BrowserRuntime({
    ...options,
    network: options.network ?? readM3BuildNetwork(buildEnv ?? {}),
  });
}
