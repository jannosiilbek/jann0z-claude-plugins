---
type: llm
focus:
  source: file
  path: validation.md
weight: 1
---

validation.md does not flag as failures the content integrators need: HTTPS-only URLs, the event table, the envelope, HMAC-SHA256 over the raw body, the 2xx-within-10-seconds rule, or at-least-once delivery with dedupe on `id`.
