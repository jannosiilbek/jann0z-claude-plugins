# Pipeline eval — Build-Readiness matrix

_judge: claude-opus-4-8 (held constant) · skills @ 8514f3610da2 · git aab8080 · n=1 per cell — no variance yet._
_BRI 0–100. Bands: ≥85 ship-ready · 70–84 buildable-with-gaps · 50–69 underspecified · <50 not-buildable._

| Executor \ scenario | 01 (full) | 02 (full) | 03 (delta) |
|---|---|---|---|
| **Haiku 4.5** | 73 gaps | 77 gaps | 83 gaps |
| **Sonnet 4.6** | 90 ship | 93 ship | 82 gaps |
| **Fable 5** | — | — | — |
| **Opus 4.8** | 93 ship | 93 ship | 79 gaps |

_Not run: Fable 5._

## Per-metric (mean): clarity / alignment / completeness / testability / actionability

| Cell | BRI | band | clar | algn | cmpl | test | actn | gate |
|------|----:|------|----:|----:|----:|----:|----:|------|
| haiku-01 | 73 | buildable-with-gaps | 52 | 40 | 100 | 95 | 89 | ❌ 4err |
| haiku-02 | 77 | buildable-with-gaps | 52 | 60 | 100 | 94 | 85 | ✅ |
| haiku-03 | 83 | buildable-with-gaps | 40 | 100 | 100 | 100 | 88 | ✅ |
| sonnet-01 | 90 | ship-ready | 64 | 100 | 100 | 100 | 95 | ✅ |
| sonnet-02 | 93 | ship-ready | 76 | 100 | 100 | 100 | 94 | ✅ |
| sonnet-03 | 82 | buildable-with-gaps | 40 | 100 | 100 | 100 | 81 | ✅ |
| opus-01 | 93 | ship-ready | 76 | 100 | 100 | 100 | 95 | ✅ |
| opus-02 | 93 | ship-ready | 76 | 100 | 100 | 100 | 95 | ✅ |
| opus-03 | 79 | buildable-with-gaps | 28 | 100 | 100 | 100 | 81 | ✅ |
