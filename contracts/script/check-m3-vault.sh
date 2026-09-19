#!/bin/bash
set -euo pipefail

if [ "$#" -ne 0 ]; then
  echo 'check-m3-vault.sh accepts no arguments' >&2
  exit 2
fi

CONTRACT_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)

/bin/bash "$CONTRACT_ROOT/script/check-local.sh"

TASK_PYTHON="$CONTRACT_ROOT/../.checks/af-chain01/toolchain/slither-venv/bin/python"
env -i PATH=/usr/bin:/bin PYTHONNOUSERSITE=1 "$TASK_PYTHON" \
  "$CONTRACT_ROOT/script/check_vault_artifact.py" \
  "$CONTRACT_ROOT/../.checks/af-chain01/out/AlphaForgeVault.sol/AlphaForgeVault.json" \
  "$CONTRACT_ROOT/deployment/abi/AlphaForgeVault.abi.json"
