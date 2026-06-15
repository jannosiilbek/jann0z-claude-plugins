# Variance measurement (judge noise)

_Measured 2026-06-15 · judge model claude-opus-4-8 · holding the spec FIXED and re-running
the buildability judge N times, to isolate judge noise from generation noise._

This answers: **how much of a BRI change is real vs run-to-run noise?** Without it, the
regression gate's ±5 tolerance is a guess. It is a **lower bound** on total noise — it does
not include generation variance (re-running the pipeline), which the full replicated matrix
(`run-pipeline.mjs --repeat 5`) will add.

## Result

| Spec (fixed) | n | clarity samples | clarity σ | BRI samples | BRI σ | committed n=1 |
|---|---|---|---|---|---|---|
| opus-01 (clean greenfield) | 4 | 76,76,76,76 | **0** | 93,93,93,93 | **0** | 93 ✓ |
| opus-03 (waitlist delta) | 5* | 28,76,76,76,88 | **~21** | 79,93,93,93,96 | **~6** | 79 ✗ outlier |

\* includes the original committed sample (clarity 28 / BRI 79) plus 4 re-runs.

## What it shows

1. **The judge is rock-stable on a clean, unambiguous spec** (opus-01: σ=0 across 4 runs).
   For clear specs, n=1 is fine and the ±5 tolerance is generous.

2. **The judge is fat-tailed on an ambiguous spec** (opus-03). The committed n=1 value
   (BRI **79**, clarity 28) was a **low-tail outlier** — four independent re-runs all landed
   BRI **93–96** (clarity 76–88). Median is BRI **93 (ship-ready)**, not 79 (buildable-with-gaps).

3. **Root cause:** the judge reports an integer *clarification-question count* (here 1, 2, or 6),
   fed through `clarity = 100 − 12 × count`. That count is the unstable quantity, and the ×12
   multiplier turns a ±2-question disagreement into a ±24-point clarity swing → big BRI swing.

## Consequences for the platform

- **n=1 is not regression-grade for ambiguous cells.** A single draw can be ±15 BRI off the
  true value. The earlier "the delta scenario scores low clarity across all models" headline
  was **partly judge noise** for opus-03 (the 28 was a tail; the spec is ~ship-ready).
- **Baseline corrected:** `baseline.json` opus-03 updated to the replicated median (BRI 93,
  σ 6); opus-01 confirmed (93, σ 0). The other 7 cells remain n=1 **provisional**.

## Fixes (recommended, not yet built)

1. **Median-of-N per cell** in `report.mjs` (robust to the fat tail) — run cells with
   `--repeat 5`, take the median BRI as the cell value, carry σ for the gate.
2. **Soften the clarity formula** so a ±1 subjective question count doesn't move BRI ~3 pts —
   e.g. cap the count, use a gentler curve, or have the judge score clarity holistically and
   treat the question list as evidence rather than the arithmetic input.
3. **Full replicated matrix** (`--repeat 5`) + re-bless, so every cell's gate uses measured σ.
