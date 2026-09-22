"""Mutations must never turn an unconfigured X Layer template into deployment evidence."""

from copy import deepcopy
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'script'))
from check_xlayer_template import validate_template


class XLayerTemplateTests(unittest.TestCase):
    def setUp(self):
        self.template = json.loads((ROOT / 'deployment/m3-xlayer-testnet.template.json').read_text())

    def reject(self, path, value):
        candidate = deepcopy(self.template)
        parent = candidate
        for key in path[:-1]:
            parent = parent[key]
        parent[path[-1]] = value
        with self.assertRaises(ValueError) as error:
            validate_template(candidate)
        self.assertEqual(str(error.exception), 'Invalid unconfigured X Layer template')

    def test_accepts_unconfigured_testnet_template(self):
        self.assertIsNone(validate_template(self.template))

    def test_rejects_wrong_or_coerced_networks(self):
        for chain in (46630, 195, 196, 1, '1952', 1952.0, True, None):
            with self.subTest(chain=chain):
                self.reject(['chainId'], chain)
        self.reject(['networkKey'], 'robinhood-chain-testnet')
        self.reject(['nativeCurrency'], 'ETH')
        self.reject(['source', 'repository'], 'pdbsy/quantpass-arbitrum-hackathon')

    def test_rejects_endpoint_injection_without_echoing_it(self):
        for key in ('rpcUrl', 'alternateRpcUrl', 'explorerUrl'):
            for value in ('https://sensitive@example.invalid/?secret=value', 'http://localhost', None):
                with self.subTest(field=key):
                    self.reject([key], value)

    def test_rejects_deployment_or_artifact_claims(self):
        self.reject(['deploymentStatus'], 'DEPLOYED')
        for name in self.template['contracts']:
            with self.subTest(contract=name):
                for field in ('address', 'creationCodeHash', 'runtimeCodeHash', 'abiHash'):
                    self.reject(['contracts', name, field], 'non-null-claim')
                self.reject(['contracts', name, 'constructorInputs', 0, 'value'], 'configured')
        for key in ('deploymentBlock', 'deploymentTransactionHash', 'eventTopics'):
            self.reject(['indexing', key], 'claimed')
        for key in ('sourceRef', 'manifestRef', 'snapshotRef'):
            self.reject(['evidence', key], 'claimed')
        self.reject(['source', 'commit'], 'claimed')
        self.reject(['vaultConfig', 'owner'], 'configured')

    def test_preserves_precision_tool_pins_and_authority(self):
        self.reject(['tokenMetadata', 'afUsdc', 'decimals'], 18)
        self.reject(['tokenMetadata', 'strategyPass', 'decimals'], 6)
        self.reject(['tokenMetadata', 'afUsdc', 'symbol'], 'USDC')
        self.reject(['toolchain', 'solc'], '0.8.32')
        self.reject(['toolchain', 'evmVersion'], 'cancun')
        self.reject(['toolchain', 'optimizerEnabled'], True)
        self.reject(['authorization'], 'RELAYER')

    def test_refuses_writes_and_fabricated_finality(self):
        for key in ('realFundsEnabled', 'signingEnabled', 'broadcastEnabled'):
            self.reject(['boundary', key], True)
        for key in ('rpcIdentity', 'liveVmCompatibility'):
            self.reject(['boundary', key], 'PASS')
        self.reject(['boundary', 'mode'], 'testnet')
        self.reject(['boundary', 'adapter'], 'rpc')
        self.reject(['indexing', 'finalityStatus'], 'FINAL')
        self.reject(['indexing', 'softReadyDepth'], 0)
        self.reject(['indexing', 'reorgSearchLimit'], 1)
        self.reject(['boundary', 'indexingPolicy'], 'VERIFIED')

    def test_refuses_unexpected_missing_or_wrong_type_fields(self):
        self.reject(['extra'], 'secret')
        self.reject(['boundary', 'broadcastEnabled'], 0)
        self.reject(['contracts'], [])
        candidate = deepcopy(self.template)
        del candidate['boundary']
        with self.assertRaises(ValueError):
            validate_template(candidate)

    def test_cli_refuses_options_and_does_not_echo_values(self):
        result = subprocess.run(
            [sys.executable, str(ROOT / 'script/check_xlayer_template.py'), '--rpc=secret'],
            capture_output=True, text=True, timeout=10,
        )
        self.assertEqual(result.returncode, 2)
        self.assertNotIn('secret', result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
