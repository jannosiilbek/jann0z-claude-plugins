---
type: llm
focus:
  source: file
  path: rate-limit-spec.md
weight: 1
---

The input spec had these two tables. In the updated spec they are unchanged in content (wording may only change where the new decisions, fixed calendar-minute windows and 429s not counting, require it):

Limits: Free 100 requests/min; Pro 1000 requests/min; Enterprise custom, configured by support.

Response headers: X-RateLimit-Limit = the key's limit for the current window (requests/min); X-RateLimit-Remaining = requests left in the current window; X-RateLimit-Reset = time the current window resets, as Unix time in seconds.

Rewording the X-RateLimit-Reset value to name the next calendar-minute boundary is a required change, not a defect. The Enterprise row and header descriptions must otherwise keep their meaning.
