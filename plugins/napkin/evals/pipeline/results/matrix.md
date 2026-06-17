# Pipeline eval — Build-Readiness matrix

_judge: claude-opus-4-8 (held constant) · skills @ a4f6a326b50d · git 9cc2490 · n=3–5 per cell (replicated cells show median±σ)._
_BRI 0–100. Bands: ≥85 ship-ready · 70–84 buildable-with-gaps · 50–69 underspecified · <50 not-buildable._

| Executor \ scenario | 01 (full) | 02 (full) | 03 (delta) |
|---|---|---|---|
| **Haiku 4.5** | 90±3.11 ship | 88±11.52 ship | 90±14.6 ship |
| **Sonnet 4.6** | 92±2.7 ship | 94±0.89 ship | 94±2.61 ship |
| **Fable 5** | — | — | — |
| **Opus 4.8** | 94±0 ship | 94±3.46 ship | 92±1.1 ship |

_Not run: Fable 5._

## Per-metric (median ± σ): clarity / alignment / completeness / testability / actionability

| Cell | BRI | band | clar | algn | cmpl | test | actn | gate |
|------|----:|------|----:|----:|----:|----:|----:|------|
| haiku-01 | 90±3.11 | ship-ready | 73±2.68 | 90±12.45 | 100±0 | 100±2.24 | 90±1.87 | ❌ 2err |
| haiku-02 | 88±11.52 | ship-ready | 80±3.83 | 80±38.99 | 100±22.36 | 100±1.34 | 92±1.34 | ❌ 13err |
| haiku-03 | 90±14.6 | ship-ready | 73±5.32 | 100±42.43 | 100±24.17 | 100±0 | 87±6.5 | ❌ 6err |
| sonnet-01 | 92±2.7 | ship-ready | 73±3.13 | 100±10.84 | 100±0 | 100±0 | 94±2 | ✅ |
| sonnet-02 | 94±0.89 | ship-ready | 80±4.02 | 100±0 | 100±0 | 100±0 | 93±1.87 | ✅ |
| sonnet-03 | 94±2.61 | ship-ready | 80±4.5 | 100±0 | 100±0 | 100±0 | 92±3.97 | ✅ |
| opus-01 | 94±0 | ship-ready | 80±0 | 100±0 | 100±0 | 100±0 | 95±0.89 | ✅ |
| opus-02 | 94±3.46 | ship-ready | 80±0 | 100±0 | 100±0 | 100±0 | 95±2.89 | ✅ |
| opus-03 | 92±1.1 | ship-ready | 73±3.13 | 100±0 | 100±0 | 100±0 | 90±1.95 | ✅ |
