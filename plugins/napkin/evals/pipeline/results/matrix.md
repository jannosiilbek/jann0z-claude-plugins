# Pipeline eval — Build-Readiness matrix

_judge: n/a (held constant) · skills @ 5903e36dca28 · git f88e102 · n=1–5 per cell (replicated cells show median±σ)._
_BRI 0–100. Bands: ≥85 ship-ready · 70–84 buildable-with-gaps · 50–69 underspecified · <50 not-buildable (defined in README.md §Metrics)._

| Executor \ scenario | 01 (full) | 02 (full) | 03 (delta) |
|---|---|---|---|
| **Haiku 4.5** | 93±1.22 ship | 94±3.49 ship | 92±1.41 ship |
| **Sonnet 4.6** | 92±0.58 ship | 92±1.53 ship | 96±3.06 ship |
| **Fable 5** | — | — | — |
| **Opus 4.8** | 94 ship | 96±1.53 ship | 94±4.16 ship |

_Not run: Fable 5._

## Per-metric (median ± σ): clarity / alignment / completeness / testability / actionability

| Cell | BRI | band | clar | algn | cmpl | test | actn | gate |
|------|----:|------|----:|----:|----:|----:|----:|------|
| haiku-01 | 93±1.22 | ship-ready | 76.5±7.59 | 95±10.37 | 100±0 | 100±0 | 92±4.15 | ✅ |
| haiku-02 | 94±3.49 | ship-ready | 80±6.56 | 100±8.94 | 100±0 | 100±0 | 93±5.45 | ❌ 1err |
| haiku-03 | 92±1.41 | ship-ready | 73±4.6 | 100±0 | 100±0 | 100±0 | 91±0.84 | ✅ |
| sonnet-01 | 92±0.58 | ship-ready | 73±0 | 100±0 | 100±0 | 100±0 | 94±2.08 | ✅ |
| sonnet-02 | 92±1.53 | ship-ready | 73±6.51 | 100±0 | 100±0 | 100±0 | 93±1.73 | ✅ |
| sonnet-03 | 96±3.06 | ship-ready | 84.5±6.36 | 100±0 | 100±0 | 100±0 | 93±5.13 | ✅ |
| opus-01 | 94 | ship-ready | 80 | 100 | 100 | 100 | 95 | ✅ |
| opus-02 | 96±1.53 | ship-ready | 89±5.2 | 100±0 | 100±0 | 100±0 | 95±1 | ✅ |
| opus-03 | 94±4.16 | ship-ready | 76.5±4.95 | 100±0 | 100±0 | 100±0 | 90±5.77 | ✅ |
