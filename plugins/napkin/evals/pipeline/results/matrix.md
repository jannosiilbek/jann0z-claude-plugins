# Pipeline eval — Build-Readiness matrix

_judge: claude-opus-4-8 (held constant) · skills @ 8514f3610da2 · git 3ecb423 · n=1–5 per cell (replicated cells show median±σ)._
_BRI 0–100. Bands: ≥85 ship-ready · 70–84 buildable-with-gaps · 50–69 underspecified · <50 not-buildable._

| Executor \ scenario | 01 (full) | 02 (full) | 03 (delta) |
|---|---|---|---|
| **Haiku 4.5** | 77 gaps | 80 gaps | 89 ship |
| **Sonnet 4.6** | 93 ship | 94 ship | 88 ship |
| **Fable 5** | — | — | — |
| **Opus 4.8** | 94±0 ship | 94 ship | 94±4.12 ship |

_Not run: Fable 5._

## Per-metric (median ± σ): clarity / alignment / completeness / testability / actionability

| Cell | BRI | band | clar | algn | cmpl | test | actn | gate |
|------|----:|------|----:|----:|----:|----:|----:|------|
| haiku-01 | 77 | buildable-with-gaps | 67 | 40 | 100 | 95 | 89 | ❌ 4err |
| haiku-02 | 80 | buildable-with-gaps | 67 | 60 | 100 | 94 | 85 | ✅ |
| haiku-03 | 89 | ship-ready | 62 | 100 | 100 | 100 | 88 | ✅ |
| sonnet-01 | 93 | ship-ready | 73 | 100 | 100 | 100 | 95 | ✅ |
| sonnet-02 | 94 | ship-ready | 80 | 100 | 100 | 100 | 94 | ✅ |
| sonnet-03 | 88 | ship-ready | 62 | 100 | 100 | 100 | 81 | ✅ |
| opus-01 | 94±0 | ship-ready | 80±0 | 100±0 | 100±0 | 100±0 | 95±0.55 | ✅ |
| opus-02 | 94 | ship-ready | 80 | 100 | 100 | 100 | 95 | ✅ |
| opus-03 | 94±4.12 | ship-ready | 80±11.95 | 100±0 | 100±0 | 100±0 | 94±6.06 | ✅ |
