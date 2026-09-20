# Macbeth02 Phase One Contract Coverage

- Task: `M3-02-PHASE1-CONTRACTS`
- Tool: pinned Forge `1.5.1`
- Mode: offline, optimizer and via-IR disabled by Forge for accurate source maps
- Status: `LOCAL EVIDENCE / NOT DEPLOYMENT EVIDENCE`

## Scope decision

The frozen Phase One authorization and accounting core is `AlphaForgeVault`, `PassLocker` and
`StrategyPass`. It owns the explicit-owner boundary, amount and capacity conversion, principal and
profit accounting, settlement rollback, terminal close/rescue behavior and Pass escrow. The
compiled TestVenue and SwapAdapter remain outside the minimum Phase One deployment candidate
because strategy execution, swaps and liquidity are excluded.

No threshold, production branch, assertion or acceptance standard was reduced. Coverage findings
were checked against source behavior before tests were added.

## Before correction

The 126-test candidate reported:

| Production source | Lines | Statements | Branches | Functions |
| --- | ---: | ---: | ---: | ---: |
| `AlphaForgeVault` | 96.69% | 94.52% | 72.09% | 100% |
| `PassLocker` | 97.44% | 96.08% | 77.78% | 100% |
| `StrategyPass` | 100% | 100% | 100% | 100% |

The missing core branches were real boundary cases rather than source-map-only artifacts: terminal
state rejection, zero/excess withdrawal, empty rescue, identity-call failure, asset aliasing,
accounting overflow, unsupported/unfunded positions and escrow deficit.

## Corrected result

The 134-test candidate reports:

| Production source | Lines | Statements | Branches | Functions |
| --- | ---: | ---: | ---: | ---: |
| `AlphaForgeVault` | 100% (151/151) | 100% (219/219) | 100% (43/43) | 100% (22/22) |
| `PassLocker` | 100% (39/39) | 100% (51/51) | 100% (9/9) | 100% (7/7) |
| `StrategyPass` | 100% (4/4) | 100% (4/4) | 100% (1/1) | 100% (1/1) |

The complete report, including optional compiled contracts and test support code, is 95.53% lines,
95.12% statements, 73.42% branches and 95.54% functions. Those totals are preserved rather than
presented as a global 100% claim.

## Reproduction

From `contracts/`, with the repository's pinned clean environment variables:

```bash
forge coverage --offline --report summary --report lcov \
  --report-file ../.checks/af-chain01/evidence/phase1-coverage-after.lcov
```

The LCOV output is derived local evidence under `.checks/`; it is regenerated from the committed
source and tests and is not a deployment artifact.
