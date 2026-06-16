# Pipeline eval — Build-Readiness matrix

_judge: claude-opus-4-8 (held constant) · skills @ 8514f3610da2 · git 36cab02 · n=4–5 per cell (replicated cells show median±σ)._
_BRI 0–100. Bands: ≥85 ship-ready · 70–84 buildable-with-gaps · 50–69 underspecified · <50 not-buildable._

| Executor \ scenario | 01 (full) | 02 (full) | 03 (delta) |
|---|---|---|---|
| **Haiku 4.5** | 89.5±0.96 ship | 88±17.84 ship | 92±1.34 ship |
| **Sonnet 4.6** | 91±1.3 ship | 92±1.34 ship | 92±1.79 ship |
| **Fable 5** | — | — | — |
| **Opus 4.8** | 92±0.89 ship | 92±3.46 ship | 94±0 ship |

_Not run: Fable 5._

## Per-metric (median ± σ): clarity / alignment / completeness / testability / actionability

| Cell | BRI | band | clar | algn | cmpl | test | actn | gate |
|------|----:|------|----:|----:|----:|----:|----:|------|
| haiku-01 | 89.5±0.96 | ship-ready | 67±2.5 | 100±0 | 100±0 | 99±2.83 | 87±2.52 | ✅ |
| haiku-02 | 88±17.84 | ship-ready | 62±4.87 | 95±53.9 | 100±33.35 | 97±2.12 | 90±1.22 | ❌ 13err |
| haiku-03 | 92±1.34 | ship-ready | 73±3.83 | 100±0 | 100±0 | 100±0 | 91±2.19 | ✅ |
| sonnet-01 | 91±1.3 | ship-ready | 73±4.6 | 100±8.22 | 100±0 | 100±0.89 | 92±1.3 | ✅ |
| sonnet-02 | 92±1.34 | ship-ready | 73±5.5 | 100±0 | 100±0 | 100±0 | 93±1.14 | ✅ |
| sonnet-03 | 92±1.79 | ship-ready | 73±2.68 | 100±0 | 100±0 | 100±0 | 92±6.54 | ✅ |
| opus-01 | 92±0.89 | ship-ready | 73±3.13 | 100±0 | 100±0 | 100±0 | 94±1.14 | ✅ |
| opus-02 | 92±3.46 | ship-ready | 76.5±4.04 | 100±4.47 | 100±0 | 100±0 | 94±3.13 | ✅ |
| opus-03 | 94±0 | ship-ready | 80±0 | 100±0 | 100±0 | 100±0 | 93±1.3 | ✅ |
