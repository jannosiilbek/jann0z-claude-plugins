# Pipeline eval — Build-Readiness matrix

_judge: claude-opus-4-8 (held constant) · skills @ 8514f3610da2 · git b13123b · 5 repeats/cell (median±σ)._
_BRI 0–100. Bands: ≥85 ship-ready · 70–84 buildable-with-gaps · 50–69 underspecified · <50 not-buildable._

| Executor \ scenario | 01 (full) | 02 (full) | 03 (delta) |
|---|---|---|---|
| **Haiku 4.5** | 78±1.34 gaps | 83±1.67 gaps | 90±1.14 ship |
| **Sonnet 4.6** | 94±0.89 ship | 94±0.89 ship | 92±2.28 ship |
| **Fable 5** | — | — | — |
| **Opus 4.8** | 94±0 ship | 94±3.29 ship | 94±4.12 ship |

_Not run: Fable 5._

## Per-metric (median ± σ): clarity / alignment / completeness / testability / actionability

| Cell | BRI | band | clar | algn | cmpl | test | actn | gate |
|------|----:|------|----:|----:|----:|----:|----:|------|
| haiku-01 | 78±1.34 | buildable-with-gaps | 67±3.29 | 40±0 | 100±0 | 98±1.87 | 90±1.52 | ❌ 4err |
| haiku-02 | 83±1.67 | buildable-with-gaps | 73±3.29 | 60±0 | 100±0 | 100±2.61 | 90±2.24 | ✅ |
| haiku-03 | 90±1.14 | ship-ready | 67±4.67 | 100±0 | 100±0 | 100±0 | 90±1.64 | ✅ |
| sonnet-01 | 94±0.89 | ship-ready | 80±3.83 | 100±0 | 100±0 | 100±0.55 | 94±1 | ✅ |
| sonnet-02 | 94±0.89 | ship-ready | 80±3.13 | 100±0 | 100±0 | 100±0 | 94±0.71 | ✅ |
| sonnet-03 | 92±2.28 | ship-ready | 73±7.37 | 100±0 | 100±0 | 100±0.89 | 92±4.77 | ✅ |
| opus-01 | 94±0 | ship-ready | 80±0 | 100±0 | 100±0 | 100±0 | 95±0.55 | ✅ |
| opus-02 | 94±3.29 | ship-ready | 80±6.5 | 100±0 | 100±0 | 100±0 | 93±3.03 | ✅ |
| opus-03 | 94±4.12 | ship-ready | 80±11.95 | 100±0 | 100±0 | 100±0 | 94±6.06 | ✅ |
