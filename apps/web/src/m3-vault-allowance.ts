import { PreparedActionFactory, type Eip1193Provider } from './chain-wallet.ts';
import {
  decodeM3VaultAddressResult,
  decodeM3VaultUintResult,
  encodeM3VaultCall,
} from '../../../packages/chain-adapter/src/vault-abi.ts';
import {
  asAddress,
  asHexData,
  type Address,
  type HexData,
} from '../../../packages/chain-adapter/src/types.ts';

export type M3AllowanceFailureCode =
  | 'M3_ALLOWANCE_WRONG_CHAIN'
  | 'M3_ALLOWANCE_OWNER_CHANGED'
  | 'M3_ALLOWANCE_SESSION_CHANGED'
  | 'M3_ALLOWANCE_INVALID_AMOUNT'
  | 'M3_ALLOWANCE_READ_FAILED';

export class M3AllowanceFailure extends Error {
  readonly code: M3AllowanceFailureCode;

  constructor(code: M3AllowanceFailureCode) {
    super(code);
    this.name = 'M3AllowanceFailure';
    this.code = code;
  }
}

function chainId(value: unknown): number {
  if (typeof value !== 'string' || !/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/.test(value))
    throw new M3AllowanceFailure('M3_ALLOWANCE_READ_FAILED');
  const parsed = BigInt(value);
  if (parsed <= 0n || parsed > BigInt(Number.MAX_SAFE_INTEGER))
    throw new M3AllowanceFailure('M3_ALLOWANCE_READ_FAILED');
  return Number(parsed);
}

const maximumUint256 = (1n << 256n) - 1n;

function requiredAmounts(value: string): { readonly usdc: bigint; readonly pass: bigint } {
  if (!/^[1-9][0-9]*$/.test(value)) throw new M3AllowanceFailure('M3_ALLOWANCE_INVALID_AMOUNT');
  const usdc = BigInt(value);
  const pass = usdc * 1_000_000_000_000n;
  if (usdc > maximumUint256 || pass > maximumUint256)
    throw new M3AllowanceFailure('M3_ALLOWANCE_INVALID_AMOUNT');
  return { usdc, pass };
}

function addressWord(value: Address): string {
  return value.slice(2).toLowerCase().padStart(64, '0');
}

function uintWord(value: bigint): string {
  return value.toString(16).padStart(64, '0');
}

function allowanceCall(owner: Address, spender: Address): HexData {
  return asHexData(`0xdd62ed3e${addressWord(owner)}${addressWord(spender)}`);
}

function approveCall(spender: Address, amount: bigint): HexData {
  return asHexData(`0x095ea7b3${addressWord(spender)}${uintWord(amount)}`);
}

async function ethCall(provider: Eip1193Provider, target: Address, data: HexData): Promise<HexData> {
  try {
    const result = await provider.request({
      method: 'eth_call',
      params: [{ to: target, data }, 'latest'],
    });
    return asHexData(String(result));
  } catch (error) {
    if (error instanceof M3AllowanceFailure) throw error;
    throw new M3AllowanceFailure('M3_ALLOWANCE_READ_FAILED');
  }
}

export interface M3ApprovalRequirement {
  readonly token: Address;
  readonly spender: Address;
  readonly requiredRaw: string;
  readonly allowance: string;
  readonly sufficient: boolean;
  readonly factory: PreparedActionFactory<{ readonly operationId: string }>;
}

export interface M3DepositAuthorization {
  readonly summary: Readonly<{
    vault: Address;
    owner: Address;
    afUsdc: Address;
    pass: Address;
    requiredUsdcBaseUnits: string;
    requiredPassRaw: string;
    usdcAllowance: string;
    passAllowance: string;
    usdcSufficient: boolean;
    passSufficient: boolean;
  }>;
  readonly usdcApproval: M3ApprovalRequirement;
  readonly passApproval: M3ApprovalRequirement;
}

function requirement(options: {
  readonly chainId: number;
  readonly owner: Address;
  readonly token: Address;
  readonly vault: Address;
  readonly required: bigint;
  readonly allowance: bigint;
}): M3ApprovalRequirement {
  return Object.freeze({
    token: options.token,
    spender: options.vault,
    requiredRaw: options.required.toString(),
    allowance: options.allowance.toString(),
    sufficient: options.allowance >= options.required,
    factory: new PreparedActionFactory<{ readonly operationId: string }>({
      chainId: options.chainId,
      target: options.token,
      operationId: (action) => action.operationId,
      encode: (_action, owner) => {
        if (owner.toLowerCase() !== options.owner.toLowerCase())
          throw new M3AllowanceFailure('M3_ALLOWANCE_OWNER_CHANGED');
        return { data: approveCall(options.vault, options.required), value: 0n };
      },
    }),
  });
}

export async function readM3VaultDepositAuthorization(
  provider: Eip1193Provider,
  options: {
    readonly chainId: number;
    readonly vault: Address;
    readonly owner: Address;
    readonly usdcBaseUnits: string;
  },
): Promise<M3DepositAuthorization> {
  const required = requiredAmounts(options.usdcBaseUnits);
  let sessionChanged = false;
  const changed = () => {
    sessionChanged = true;
  };
  const registered: Array<'accountsChanged' | 'chainChanged' | 'disconnect'> = [];
  const removeListeners = () => {
    for (const event of registered) {
      try {
        provider.removeListener(event, changed);
      } catch {
        // The read result remains failed closed even if provider cleanup is broken.
      }
    }
  };
  try {
    for (const event of ['accountsChanged', 'chainChanged', 'disconnect'] as const) {
      provider.on(event, changed);
      registered.push(event);
    }
  } catch {
    removeListeners();
    throw new M3AllowanceFailure('M3_ALLOWANCE_READ_FAILED');
  }
  try {
    const initialChainId = chainId(await provider.request({ method: 'eth_chainId' }));
    if (initialChainId !== options.chainId) throw new M3AllowanceFailure('M3_ALLOWANCE_WRONG_CHAIN');
    const initialAccounts = await provider.request({ method: 'eth_accounts' });
    if (!Array.isArray(initialAccounts) || initialAccounts.length < 1)
      throw new M3AllowanceFailure('M3_ALLOWANCE_OWNER_CHANGED');
    let initialOwner: Address;
    try {
      initialOwner = asAddress(String(initialAccounts[0]));
    } catch {
      throw new M3AllowanceFailure('M3_ALLOWANCE_READ_FAILED');
    }
    if (initialOwner.toLowerCase() !== options.owner.toLowerCase())
      throw new M3AllowanceFailure('M3_ALLOWANCE_OWNER_CHANGED');

    const [afUsdc, pass] = await Promise.all([
      ethCall(provider, options.vault, encodeM3VaultCall('afUsdc()', [])).then(decodeM3VaultAddressResult),
      ethCall(provider, options.vault, encodeM3VaultCall('pass()', [])).then(decodeM3VaultAddressResult),
    ]);
    const [usdcAllowance, passAllowance] = await Promise.all([
      ethCall(provider, afUsdc, allowanceCall(options.owner, options.vault)).then(decodeM3VaultUintResult),
      ethCall(provider, pass, allowanceCall(options.owner, options.vault)).then(decodeM3VaultUintResult),
    ]);
    const finalAccounts = await provider.request({ method: 'eth_accounts' });
    const finalChainId = chainId(await provider.request({ method: 'eth_chainId' }));
    let finalOwner: Address;
    try {
      if (!Array.isArray(finalAccounts) || finalAccounts.length < 1)
        throw new M3AllowanceFailure('M3_ALLOWANCE_OWNER_CHANGED');
      finalOwner = asAddress(String(finalAccounts[0]));
    } catch (error) {
      if (error instanceof M3AllowanceFailure) throw error;
      throw new M3AllowanceFailure('M3_ALLOWANCE_READ_FAILED');
    }
    if (sessionChanged || finalChainId !== initialChainId)
      throw new M3AllowanceFailure('M3_ALLOWANCE_SESSION_CHANGED');
    if (finalOwner.toLowerCase() !== initialOwner.toLowerCase())
      throw new M3AllowanceFailure('M3_ALLOWANCE_OWNER_CHANGED');

    const usdcApproval = requirement({
      chainId: options.chainId,
      owner: options.owner,
      token: afUsdc,
      vault: options.vault,
      required: required.usdc,
      allowance: usdcAllowance,
    });
    const passApproval = requirement({
      chainId: options.chainId,
      owner: options.owner,
      token: pass,
      vault: options.vault,
      required: required.pass,
      allowance: passAllowance,
    });
    return Object.freeze({
      summary: Object.freeze({
        vault: options.vault,
        owner: options.owner,
        afUsdc,
        pass,
        requiredUsdcBaseUnits: required.usdc.toString(),
        requiredPassRaw: required.pass.toString(),
        usdcAllowance: usdcAllowance.toString(),
        passAllowance: passAllowance.toString(),
        usdcSufficient: usdcApproval.sufficient,
        passSufficient: passApproval.sufficient,
      }),
      usdcApproval,
      passApproval,
    });
  } catch (error) {
    if (error instanceof M3AllowanceFailure) throw error;
    throw new M3AllowanceFailure('M3_ALLOWANCE_READ_FAILED');
  } finally {
    removeListeners();
  }
}
