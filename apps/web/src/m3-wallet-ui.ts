import { renderM3DepositApprovalDialog, runM3DialogAction } from './m3-product-dialog.ts';
import { onchainActionEnabled } from './m3-product-shell.ts';
import type { OnchainProductAction } from './m3-product-shell.ts';
import {
  depositAllowanceCheck,
  parseM3RescueAction,
  parseM3PassTransfer,
  parseM3ProductAction,
  sameM3ProductAction,
  type M3ProductActionRequest,
  type M3ProductActionReview,
  type M3DepositApprovalKind,
  type M3DepositApprovalReview,
  type M3ProductRuntime,
  type M3PassTransferRequest,
  type M3PassTransferReview,
} from './m3-product-runtime.ts';

export interface M3WalletUiHost {
  app: { openDialog(html: string): void; closeDialog(): void };
}
const esc = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export function installM3WalletControls(
  AF: M3WalletUiHost,
  onchainRuntime: M3ProductRuntime,
  run: (action: () => Promise<void>) => Promise<void>,
  reportError: (message: string) => void,
): void {
  interface OnchainDraft {
    readonly action: OnchainProductAction;
    readonly request?: M3ProductActionRequest;
    readonly review?: M3ProductActionReview;
    readonly approval?: M3DepositApprovalReview;
  }
  let onchainDraft: OnchainDraft | null = null;
  interface PassTransferDraft {
    readonly request?: M3PassTransferRequest;
    readonly review?: M3PassTransferReview;
  }
  let passTransferDraft: PassTransferDraft | null = null;
  function openOnchainAction(action: OnchainProductAction): void {
    if (!onchainRuntime) throw Error('CHAIN_RUNTIME_UNAVAILABLE');
    if (!onchainActionEnabled(onchainRuntime.snapshot.onchain, action))
      throw Error('CHAIN_ACTION_UNAVAILABLE');
    onchainDraft = { action };
    const amount =
      action === 'close'
        ? '<p>Close returns protocol-accounted assets and remaining locked Pass to the immutable Vault owner.</p>'
        : action === 'rescue-native'
          ? '<p>Rescue sends untracked native currency from the closed Vault to its immutable owner.</p>'
          : action === 'rescue-token'
            ? '<label>Untracked token address<input name="chainToken" autocomplete="off" autofocus></label>'
            : '<label>USDT amount<input name="chainAmount" inputmode="decimal" autocomplete="off" autofocus></label>';
    AF.app.openDialog(
      `<span class="section-label">TESTNET / WALLET REVIEW</span><h2>Review ${esc(action)}.</h2>${amount}<p>Current wallet signature and contract authorization determine access. AlphaForge Account does not grant Vault ownership.</p><p data-product-dialog-error class="form-error" role="alert"></p><div class="inline-actions"><button class="primary-btn" data-chain-review>Read and simulate ↗</button><button class="text-link" data-close>Cancel</button></div>`,
    );
  }
  function showOnchainDialogError(message: string): void {
    const output = document.querySelector('[data-product-dialog-error]');
    if (output) output.textContent = message;
  }
  function currentDialog(control: HTMLElement): HTMLDialogElement | null {
    const dialog = control.closest('dialog');
    return control.isConnected && dialog?.open ? dialog : null;
  }
  function showConfirmDialogError(control: HTMLElement, message: string): void {
    const output = currentDialog(control)?.querySelector('[data-product-dialog-error]');
    if (output) output.textContent = message;
  }
  async function reviewOnchainAction(control: HTMLElement): Promise<void> {
    const draft = onchainDraft;
    if (!onchainRuntime || !draft) throw Error('CHAIN_REVIEW_REQUIRED');
    const stillCurrent = () =>
      onchainDraft === draft && control.isConnected && !!control.closest('dialog')?.open;
    const amountInput = document.querySelector<HTMLInputElement>('dialog[open] [name="chainAmount"]');
    const tokenInput = document.querySelector<HTMLInputElement>('dialog[open] [name="chainToken"]');
    const request =
      draft.action === 'rescue-token' || draft.action === 'rescue-native'
        ? parseM3RescueAction(draft.action, tokenInput?.value)
        : parseM3ProductAction(draft.action, amountInput?.value);
    if (request.kind === 'deposit') {
      if (onchainRuntime.reviewDepositApprovals) {
        let approval;
        try {
          approval = await onchainRuntime.reviewDepositApprovals(request);
        } catch (error) {
          if (!stillCurrent()) return;
          throw error;
        }
        if (!stillCurrent()) return;
        const required = approval.requirements.filter((requirement) => !requirement.sufficient);
        if (required.length > 0) {
          onchainDraft = { action: draft.action, request, approval };
          AF.app.openDialog(renderM3DepositApprovalDialog(approval));
          return;
        }
      } else {
        const onchain = onchainRuntime.snapshot.onchain;
        const authorization = onchain.depositAuthorization;
        if (!onchain.vaultAddress || !authorization) throw Error('DEPOSIT_ALLOWANCES_UNAVAILABLE');
        const check = depositAllowanceCheck(request, {
          vaultAddress: onchain.vaultAddress,
          ...authorization,
        });
        if (check.status === 'APPROVAL_REQUIRED')
          throw Error(
            `DEPOSIT_APPROVAL_REQUIRED_UNSUPPORTED: exact approvals to the Vault are required for ${check.required.afUsdcBaseUnits} USDT base units and ${check.required.passBaseUnits} Pass base units. Infinite approval is not used.`,
          );
        if (check.status !== 'READY') throw Error('DEPOSIT_ALLOWANCES_UNAVAILABLE');
      }
    }
    let review;
    try {
      review = await onchainRuntime.reviewAction(request);
    } catch (error) {
      if (!stillCurrent()) return;
      throw error;
    }
    if (!stillCurrent()) return;
    if (!sameM3ProductAction(request, review.request)) throw Error('CHAIN_ACTION_REVIEW_MISMATCH');
    onchainDraft = { action: draft.action, request, review };
    const amount =
      request.kind === 'deposit' || request.kind === 'withdraw'
        ? `${request.usdcBaseUnits} USDT base units`
        : request.kind === 'rescue-token'
          ? `Token ${request.token}`
          : 'No amount';
    AF.app.openDialog(
      `<span class="section-label">TESTNET / LIVE SIMULATION PASSED</span><h2>Confirm ${esc(request.kind)}.</h2><div class="receipt"><div class="receipt-lines"><div><span>Wallet owner</span><span>${esc(review.owner)}</span></div><div><span>Operation</span><span>${esc(review.operationId)}</span></div><div><span>Amount</span><span>${esc(amount)}</span></div></div></div><p>The wallet will show the exact contract transaction. Submission is not success; AlphaForge waits for receipt and canonical readback.</p><p data-product-dialog-error class="form-error" role="alert"></p><div class="inline-actions"><button class="primary-btn" data-chain-confirm>Request wallet confirmation ↗</button><button class="text-link" data-close>Cancel</button></div>`,
    );
  }
  function openPassTransfer(): void {
    if (!onchainRuntime?.reviewPassTransfer || !onchainRuntime.confirmPassTransfer)
      throw Error('PASS_TRANSFER_UNAVAILABLE');
    if (onchainRuntime.snapshot.onchain.passTransferMode === 'DISABLED')
      throw Error('PASS_TRANSFER_UNAVAILABLE');
    passTransferDraft = {};
    AF.app.openDialog(
      '<span class="section-label">TESTNET / PASS TRANSFER</span><h2>Review Pass transfer.</h2><label>Recipient address<input name="passRecipient" autocomplete="off" autofocus></label><label>Pass amount<input name="passAmount" inputmode="decimal" autocomplete="off"></label><p>Pass uses 18 decimals. Paid Buy and Sell are outside Phase One.</p><p data-product-dialog-error class="form-error" role="alert"></p><div class="inline-actions"><button class="primary-btn" data-pass-review>Read and simulate ↗</button><button class="text-link" data-close>Cancel</button></div>',
    );
  }
  async function reviewPassTransfer(control: HTMLElement): Promise<void> {
    const draft = passTransferDraft;
    if (!onchainRuntime?.reviewPassTransfer || !draft) throw Error('PASS_TRANSFER_REVIEW_REQUIRED');
    const recipient = document.querySelector<HTMLInputElement>('dialog[open] [name="passRecipient"]')?.value;
    const amount = document.querySelector<HTMLInputElement>('dialog[open] [name="passAmount"]')?.value;
    if (recipient === undefined || amount === undefined) throw Error('PASS_TRANSFER_INPUT_REQUIRED');
    const request = parseM3PassTransfer(recipient, amount);
    const stillCurrent = () =>
      passTransferDraft === draft && control.isConnected && !!control.closest('dialog')?.open;
    let review;
    try {
      review = await onchainRuntime.reviewPassTransfer(request);
    } catch (error) {
      if (!stillCurrent()) return;
      throw error;
    }
    if (!stillCurrent()) return;
    if (
      review.request.recipient.toLowerCase() !== request.recipient.toLowerCase() ||
      review.request.passBaseUnits !== request.passBaseUnits
    )
      throw Error('PASS_TRANSFER_REVIEW_MISMATCH');
    passTransferDraft = { request, review };
    AF.app.openDialog(
      `<span class="section-label">TESTNET / LIVE SIMULATION PASSED</span><h2>Confirm Pass transfer.</h2><div class="receipt"><div class="receipt-lines"><div><span>Wallet owner</span><span>${esc(review.owner)}</span></div><div><span>Pass contract</span><span>${esc(review.token)}</span></div><div><span>Recipient</span><span>${esc(request.recipient)}</span></div><div><span>Amount</span><span>${esc(request.passBaseUnits)} Pass base units</span></div><div><span>Operation</span><span>${esc(review.operationId)}</span></div></div></div><p>The wallet will show the exact ERC-20 transfer. One Pass equals 10^18 base units.</p><p data-product-dialog-error class="form-error" role="alert"></p><div class="inline-actions"><button class="primary-btn" data-pass-confirm>Request wallet confirmation ↗</button><button class="text-link" data-close>Cancel</button></div>`,
    );
  }
  document.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLElement>(
      '[data-chain-connect],[data-chain-refresh],[data-chain-action],[data-chain-review],[data-chain-confirm],[data-chain-approve],[data-pass-transfer],[data-pass-review],[data-pass-confirm]',
    );
    if (!target) return;
    event.preventDefault();
    try {
      if (target.hasAttribute('data-chain-connect')) {
        if (!onchainRuntime) throw Error('CHAIN_RUNTIME_UNAVAILABLE');
        void run(() => onchainRuntime.connect());
      } else if (target.hasAttribute('data-chain-refresh')) {
        if (!onchainRuntime) throw Error('CHAIN_RUNTIME_UNAVAILABLE');
        void run(() => onchainRuntime.refresh());
      } else if (target.hasAttribute('data-chain-action')) {
        openOnchainAction(target.dataset.chainAction as OnchainProductAction);
      } else if (target.hasAttribute('data-pass-transfer')) {
        onchainDraft = null;
        openPassTransfer();
      } else if (target.hasAttribute('data-pass-review')) {
        void runM3DialogAction(
          'review',
          target as HTMLButtonElement,
          () => reviewPassTransfer(target as HTMLButtonElement),
          showOnchainDialogError,
        );
      } else if (target.hasAttribute('data-pass-confirm')) {
        if (!onchainRuntime?.confirmPassTransfer || !passTransferDraft?.review)
          throw Error('PASS_TRANSFER_REVIEW_REQUIRED');
        const captured = passTransferDraft.review;
        passTransferDraft = null;
        void runM3DialogAction(
          'confirm',
          target as HTMLButtonElement,
          async () => {
            await onchainRuntime.confirmPassTransfer!(captured);
            if (currentDialog(target)) AF.app.closeDialog();
          },
          (message) => showConfirmDialogError(target, message),
        );
      } else if (target.hasAttribute('data-chain-review')) {
        void runM3DialogAction(
          'review',
          target as HTMLButtonElement,
          () => reviewOnchainAction(target as HTMLButtonElement),
          showOnchainDialogError,
        );
      } else if (target.hasAttribute('data-chain-confirm')) {
        if (!onchainRuntime || !onchainDraft?.review) throw Error('CHAIN_REVIEW_REQUIRED');
        const captured = onchainDraft.review;
        onchainDraft = null;
        void runM3DialogAction(
          'confirm',
          target as HTMLButtonElement,
          async () => {
            await onchainRuntime.confirmAction(captured);
            if (currentDialog(target)) AF.app.closeDialog();
          },
          (message) => showConfirmDialogError(target, message),
        );
      } else if (target.hasAttribute('data-chain-approve')) {
        if (!onchainRuntime?.confirmDepositApproval || !onchainDraft?.approval)
          throw Error('DEPOSIT_APPROVAL_REVIEW_REQUIRED');
        const approval = onchainDraft.approval;
        const kind = target.dataset.chainApprove as M3DepositApprovalKind;
        onchainDraft = null;
        void runM3DialogAction(
          'confirm',
          target as HTMLButtonElement,
          async () => {
            await onchainRuntime.confirmDepositApproval!(approval, kind);
            if (currentDialog(target)) AF.app.closeDialog();
          },
          (message) => showConfirmDialogError(target, message),
        );
      }
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'CHAIN_REQUEST_FAILED');
    }
  });
  document.addEventListener('change', (event) => {
    const input = event.target as HTMLSelectElement;
    if (input.hasAttribute('data-chain-vault-select')) {
      const selection = onchainRuntime?.vaultSelection?.options.find(
        (option) => `${option.chainId}:${option.vaultAddress}` === input.value,
      );
      if (!onchainRuntime?.selectVault || !selection) {
        reportError('M3_VAULT_SELECTION_NOT_ALLOWLISTED');
        return;
      }
      onchainDraft = null;
      passTransferDraft = null;
      AF.app.closeDialog();
      void run(() => onchainRuntime.selectVault!(selection));
      return;
    }
  });
  window.addEventListener('hashchange', () => {
    onchainDraft = null;
    passTransferDraft = null;
  });
}
