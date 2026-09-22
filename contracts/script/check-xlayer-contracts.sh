#!/bin/bash
set -euo pipefail
if [ "$#" -ne 0 ]; then
  echo 'check-xlayer-contracts.sh accepts no arguments' >&2
  exit 2
fi
CONTRACT_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$CONTRACT_ROOT"
/bin/bash "$CONTRACT_ROOT/script/check-m3-vault.sh"
env -i PATH=/usr/bin:/bin PYTHONNOUSERSITE=1 \
  "$CONTRACT_ROOT/../.checks/af-chain01/toolchain/slither-venv/bin/python" \
  "$CONTRACT_ROOT/script/check_xlayer_template.py"
