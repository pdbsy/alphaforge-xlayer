"""Validate the compiler-produced AlphaForgeVault ABI against the frozen M3 contract."""

import json
from pathlib import Path
import sys


def _input(name, type_name, *, indexed=None):
    value = {'name': name, 'type': type_name}
    if indexed is not None:
        value['indexed'] = indexed
    return value


def _function(name, inputs=(), outputs=(), mutability='view'):
    return {
        'type': 'function',
        'name': name,
        'inputs': [_input('', type_name) for type_name in inputs],
        'outputs': [_input('', type_name) for type_name in outputs],
        'stateMutability': mutability,
    }


def _error(name, inputs=()):
    return {
        'type': 'error',
        'name': name,
        'inputs': [_input('', type_name) for type_name in inputs],
    }


def _event(name, inputs):
    return {
        'type': 'event',
        'name': name,
        'inputs': [_input(param, type_name, indexed=indexed) for param, type_name, indexed in inputs],
        'anonymous': False,
    }


EXPECTED_ABI = [
    {
        'type': 'constructor',
        'inputs': [
            _input('owner_', 'address'),
            _input('strategyCreator_', 'address'),
            _input('strategyId_', 'bytes32'),
            _input('strategyRef_', 'bytes32'),
            _input('pass_', 'address'),
            _input('afUsdc_', 'address'),
            _input('afEth_', 'address'),
            _input('afBtc_', 'address'),
        ],
        'stateMutability': 'nonpayable',
    },
    _event('Deposited', (
        ('owner', 'address', True),
        ('usdcAmount', 'uint256', False),
        ('passRaw', 'uint256', False),
        ('principalBasis', 'uint256', False),
        ('trackedUsdcBalance', 'uint256', False),
    )),
    _event('Withdrawn', (
        ('owner', 'address', True),
        ('usdcAmount', 'uint256', False),
        ('profitAmount', 'uint256', False),
        ('principalAmount', 'uint256', False),
        ('passRawUnlocked', 'uint256', False),
        ('principalBasis', 'uint256', False),
        ('trackedUsdcBalance', 'uint256', False),
    )),
    _event('Closed', (
        ('owner', 'address', True),
        ('usdcReturned', 'uint256', False),
        ('passRawReleased', 'uint256', False),
    )),
    _event('TrackedUsdcBalanceChanged', (
        ('previousBalance', 'uint256', False),
        ('newBalance', 'uint256', False),
    )),
    _event('TrackedPositionChanged', (
        ('token', 'address', True),
        ('previousAmount', 'uint256', False),
        ('newAmount', 'uint256', False),
    )),
    _event('UntrackedTokenRescued', (
        ('token', 'address', True),
        ('owner', 'address', True),
        ('amount', 'uint256', False),
    )),
    _event('NativeRescued', (
        ('owner', 'address', True),
        ('amount', 'uint256', False),
    )),
    _error('Unauthorized', ('address',)),
    _error('ZeroAddress'),
    _error('DuplicateAsset', ('address',)),
    _error('InvalidStrategyIdentity'),
    _error('StrategyPassMismatch', ('address', 'bytes32', 'bytes32')),
    _error('UnexpectedDecimals', ('address', 'uint8', 'uint8')),
    _error('ZeroAmount'),
    _error('VaultClosed'),
    _error('VaultActive'),
    _error('AmountOverflow', ('uint256',)),
    _error('InexactPassAmount', ('uint256',)),
    _error('InsufficientTrackedUsdc', ('uint256', 'uint256')),
    _error('OpenTrackedPositions', ('uint256',)),
    _error('UnsupportedTrackedAsset', ('address',)),
    _error('TrackedBalanceDeficit', ('address', 'uint256', 'uint256')),
    _error('TokenTransferAmountMismatch', ('address', 'uint256', 'uint256')),
    _error('NoUntrackedExcess', ('address',)),
    _error('NativeTransferFailed'),
    _function('deposit', ('uint256',), (), 'nonpayable'),
    _function('withdraw', ('uint256',), (), 'nonpayable'),
    _function('close', (), (), 'nonpayable'),
    _function('rescueUntrackedToken', ('address',), ('uint256',), 'nonpayable'),
    _function('rescueNative', (), ('uint256',), 'nonpayable'),
    _function('usdcToPassRaw', ('uint256',), ('uint256',), 'pure'),
    _function('passToUsdcRaw', ('uint256',), ('uint256',), 'pure'),
    _function('realizedProfit', (), ('uint256',)),
    _function('withdrawableUsdc', (), ('uint256',)),
    _function('reservedTrackedBalance', ('address',), ('uint256',)),
    _function('untrackedExcess', ('address',), ('uint256',)),
    _function('owner', (), ('address',)),
    _function('strategyCreator', (), ('address',)),
    _function('strategyId', (), ('bytes32',)),
    _function('strategyRef', (), ('bytes32',)),
    _function('pass', (), ('address',)),
    _function('afUsdc', (), ('address',)),
    _function('afEth', (), ('address',)),
    _function('afBtc', (), ('address',)),
    _function('passLocker', (), ('address',)),
    _function('principalBasis', (), ('uint256',)),
    _function('trackedUsdcBalance', (), ('uint256',)),
    _function('trackedPosition', ('address',), ('uint256',)),
    _function('openTrackedPositionCount', (), ('uint256',)),
    _function('closed', (), ('bool',)),
]


def _canonical_constructor(item):
    return {
        'type': 'constructor',
        'inputs': [
            {'name': entry.get('name', ''), 'type': entry['type']}
            for entry in item.get('inputs', [])
        ],
        'stateMutability': item.get('stateMutability'),
    }


def _canonical_event(item):
    return {
        'type': 'event',
        'name': item['name'],
        'inputs': [
            {
                'name': entry.get('name', ''),
                'type': entry['type'],
                'indexed': entry.get('indexed', False),
            }
            for entry in item.get('inputs', [])
        ],
        'anonymous': item.get('anonymous', False),
    }


def _canonical_callable(item):
    value = (
        item['type'],
        item['name'],
        tuple(entry['type'] for entry in item.get('inputs', [])),
    )
    if item['type'] == 'function':
        value += (
            tuple(entry['type'] for entry in item.get('outputs', [])),
            item.get('stateMutability'),
        )
    return value


def validate_vault_abi(abi):
    constructors = [item for item in abi if item.get('type') == 'constructor']
    expected_constructor = next(item for item in EXPECTED_ABI if item['type'] == 'constructor')
    if len(constructors) != 1 or _canonical_constructor(constructors[0]) != expected_constructor:
        raise ValueError('AlphaForgeVault constructor ABI drift')

    actual_events = sorted(
        (_canonical_event(item) for item in abi if item.get('type') == 'event'),
        key=lambda item: item['name'],
    )
    expected_events = sorted(
        (item for item in EXPECTED_ABI if item['type'] == 'event'),
        key=lambda item: item['name'],
    )
    if actual_events != expected_events:
        raise ValueError('AlphaForgeVault events ABI drift')

    for kind in ('error', 'function'):
        actual = {_canonical_callable(item) for item in abi if item.get('type') == kind}
        expected = {_canonical_callable(item) for item in EXPECTED_ABI if item['type'] == kind}
        missing = expected - actual
        if missing:
            raise ValueError(f'AlphaForgeVault {kind}s ABI drift: missing {sorted(map(str, missing))}')


def validate_vault_artifact(path):
    artifact = json.loads(Path(path).read_text())
    abi = artifact.get('abi')
    if not isinstance(abi, list):
        raise ValueError('AlphaForgeVault artifact has no ABI list')
    validate_vault_abi(abi)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('usage: check_vault_artifact.py <AlphaForgeVault.json>')
    validate_vault_artifact(sys.argv[1])
    print('AlphaForgeVault ABI matches frozen M3 interface')
