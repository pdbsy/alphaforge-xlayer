export type Address = string & { readonly __address: unique symbol };
export type TransactionHash = string & { readonly __transactionHash: unique symbol };
export type BlockHash = string & { readonly __blockHash: unique symbol };
export type HexData = string & { readonly __hexData: unique symbol };

function checkedHex(value: string, bytes: number, code: string): string {
  if (typeof value !== 'string' || !new RegExp(`^0x[0-9a-fA-F]{${bytes * 2}}$`).test(value)) {
    throw new Error(code);
  }
  return value;
}

export function asAddress(value: string): Address {
  return checkedHex(value, 20, 'INVALID_ADDRESS') as Address;
}

export function asTransactionHash(value: string): TransactionHash {
  return checkedHex(value, 32, 'INVALID_TRANSACTION_HASH') as TransactionHash;
}

export function asBlockHash(value: string): BlockHash {
  return checkedHex(value, 32, 'INVALID_BLOCK_HASH') as BlockHash;
}

export function asHexData(value: string): HexData {
  if (typeof value !== 'string' || !/^0x(?:[0-9a-fA-F]{2})*$/.test(value))
    throw new Error('INVALID_HEX_DATA');
  return value as HexData;
}

export function sameAddress(left: Address, right: Address): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

export function sameHash(left: TransactionHash | BlockHash, right: TransactionHash | BlockHash): boolean {
  return left.toLowerCase() === right.toLowerCase();
}
