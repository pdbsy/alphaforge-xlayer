#!/usr/bin/env python3.12
"""Validate the unconfigured template only; never authorize runtime use or deployment."""

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def _same_shape_and_values(value, expected):
    # bool/int and int/float compare equal in Python; deployment metadata must not coerce them.
    if type(value) is not type(expected):
        return False
    if isinstance(expected, dict):
        return value.keys() == expected.keys() and all(
            _same_shape_and_values(value[key], item) for key, item in expected.items()
        )
    if isinstance(expected, list):
        return len(value) == len(expected) and all(
            _same_shape_and_values(actual, item) for actual, item in zip(value, expected)
        )
    return value == expected


def validate_template(value):
    # The tracked inherited template supplies the existing unconfigured contract schema.
    # It is repository source, never caller input or a self-selected runtime trust root.
    expected = json.loads((ROOT / 'deployment/m3-robinhood-testnet.template.json').read_text())
    expected.update(
        chainId=1952,
        network='X Layer Testnet',
        networkKey='xlayer-testnet',
        nativeCurrency='OKB',
        rpcUrl='https://testrpc.xlayer.tech/terigon',
        alternateRpcUrl='https://xlayertestrpc.okx.com/terigon',
        explorerUrl='https://www.okx.com/web3/explorer/xlayer-test',
    )
    expected['source']['repository'] = 'pdbsy/alphaforge-xlayer'
    expected['boundary'] = {
        'mode': 'local', 'adapter': 'mock', 'realFundsEnabled': False,
        'signingEnabled': False, 'broadcastEnabled': False, 'rpcIdentity': 'NOT_RUN',
        'liveVmCompatibility': 'NOT_RUN', 'indexingPolicy': 'INHERITED_UNVERIFIED_DEFAULTS',
        'intentPreview': 'DIGEST_ONLY_NOT_AUTHORIZATION',
    }
    if not _same_shape_and_values(value, expected):
        raise ValueError('Invalid unconfigured X Layer template')


def main():
    if len(sys.argv) != 1:
        print('check_xlayer_template.py accepts no arguments', file=sys.stderr)
        return 2
    try:
        value = json.loads((ROOT / 'deployment/m3-xlayer-testnet.template.json').read_text())
        validate_template(value)
    except (OSError, ValueError):
        print('Invalid unconfigured X Layer template', file=sys.stderr)
        return 1
    print('X Layer 1952 template: local/mock, NOT_DEPLOYED; no runtime authorization')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
