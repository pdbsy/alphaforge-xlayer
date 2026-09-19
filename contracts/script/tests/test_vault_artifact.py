"""Mutation tests for the frozen AlphaForge Vault compiler artifact ABI."""

from copy import deepcopy
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from check_vault_artifact import EXPECTED_ABI, validate_published_abi, validate_vault_abi


class VaultArtifactTests(unittest.TestCase):
    def test_frozen_abi_is_accepted(self):
        self.assertIsNone(validate_vault_abi(deepcopy(EXPECTED_ABI)))

    def test_constructor_parameter_reorder_is_rejected(self):
        abi = deepcopy(EXPECTED_ABI)
        constructor = next(item for item in abi if item['type'] == 'constructor')
        constructor['inputs'][0], constructor['inputs'][1] = (
            constructor['inputs'][1],
            constructor['inputs'][0],
        )
        with self.assertRaisesRegex(ValueError, 'constructor'):
            validate_vault_abi(abi)

    def test_constructor_parameter_rename_is_rejected(self):
        abi = deepcopy(EXPECTED_ABI)
        constructor = next(item for item in abi if item['type'] == 'constructor')
        constructor['inputs'][0]['name'] = 'deployer_'
        with self.assertRaisesRegex(ValueError, 'constructor'):
            validate_vault_abi(abi)

    def test_event_rename_is_rejected(self):
        abi = deepcopy(EXPECTED_ABI)
        deposited = next(item for item in abi if item.get('name') == 'Deposited')
        deposited['name'] = 'Deposit'
        with self.assertRaisesRegex(ValueError, 'events'):
            validate_vault_abi(abi)

    def test_event_indexed_drift_is_rejected(self):
        abi = deepcopy(EXPECTED_ABI)
        deposited = next(item for item in abi if item.get('name') == 'Deposited')
        deposited['inputs'][0]['indexed'] = False
        with self.assertRaisesRegex(ValueError, 'events'):
            validate_vault_abi(abi)

    def test_error_removal_is_rejected(self):
        abi = [
            item for item in deepcopy(EXPECTED_ABI)
            if not (item['type'] == 'error' and item['name'] == 'Unauthorized')
        ]
        with self.assertRaisesRegex(ValueError, 'errors'):
            validate_vault_abi(abi)

    def test_function_parameter_drift_is_rejected(self):
        abi = deepcopy(EXPECTED_ABI)
        deposit = next(item for item in abi if item.get('name') == 'deposit')
        deposit['inputs'][0]['type'] = 'uint128'
        with self.assertRaisesRegex(ValueError, 'functions'):
            validate_vault_abi(abi)

    def test_published_abi_must_equal_compiler_artifact(self):
        import json
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            artifact = root / 'artifact.json'
            published = root / 'published.json'
            artifact.write_text(json.dumps({'abi': EXPECTED_ABI}))
            published.write_text(json.dumps(EXPECTED_ABI[:-1]))
            with self.assertRaisesRegex(ValueError, 'Published'):
                validate_published_abi(artifact, published)


if __name__ == '__main__':
    unittest.main()
