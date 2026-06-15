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

## Fixes

1. **Median-of-N per cell** — ✅ implemented. `report.mjs` now uses the median across repeats
   as the headline (robust to the fat tail) and carries σ; `check-regression.mjs` gates on the
   median and widens tolerance by σ.
2. **Softened clarity** — ✅ implemented. The brittle `100 − 12·count` (in the stochastic judge)
   is replaced by a deterministic diminishing-returns curve in `lib.mjs`
   (`clarity = round(100·8/(8+count))`: 0q→100, 1q→89, 2q→80, 3q→73, 6q→**57** not 28). The judge
   now only reports the integer count; the harness owns the score. A single harsh draw moves BRI
   far less, and median-of-N removes the rest.
3. **Re-blessed baseline** — ✅ opus-03 corrected to **BRI 94 (ship-ready)**, σ 4.1.

## All-cell judge variance (n=5, every cell)

Extended the measurement to all 9 cells (fixed spec, judge re-run 5×). Per-cell BRI σ:

| | 01 | 02 | 03 (delta) |
|---|---|---|---|
| Haiku 4.5 | 78 ±1.3 | 83 ±1.7 | 90 ±1.1 |
| Sonnet 4.6 | 94 ±0.9 | 94 ±0.9 | 92 ±2.3 |
| Opus 4.8 | 94 ±0 | 94 ±3.3 | 94 ±4.1 |

- **BRI σ ≤ 4.1 everywhere** — small, because clarity is 25% weight and the other four metrics
  are near-deterministic (σ≈0). The ±5 tolerance + per-cell σ covers measured judge noise.
- **Clarity σ tracks ambiguity** (max 11.95 on opus-03, 7.4 on sonnet-03 — the deltas — vs 0 on
  the clean opus-01). So the honest reading of the delta column is **"buildable (~90–94) but the
  judge is least *certain* about it,"** not "low quality."
- **Still pending:** GENERATION variance (re-running the pipeline, not just the judge). A full
  `--repeat 5` matrix is the remaining live step; this measurement is judge-only (a lower bound).
