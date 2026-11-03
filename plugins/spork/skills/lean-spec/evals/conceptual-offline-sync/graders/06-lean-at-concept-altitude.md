---
type: llm
focus:
  source: file
  path: offline-mode-concept.md
weight: 1
---

The concept doc stays at concept altitude and is lean. Pass only if all of these hold:

1. No per-state or per-screen walkthrough: no form-lifecycle or state table, no list of UI sync statuses, no screen-by-screen flow.
2. No mechanism-level sync or upload behaviour: no description of how uploads resume, retry, deduplicate, order or verify integrity, and no timestamped worked example of a sync sequence. Naming a cost driver or risk (for example "photos are large and upload slowly on weak connections") is fine; explaining how the system would handle it is not.
3. No point is restated: the same rule, value or risk is not explained again in another section (for example, the signed-form rule spelled out in full as a principle and again as a section). A risk paired with the open question that would resolve it, a cost driver that names a rule, or a short back-reference is fine, not a repeat. So is a rule stated once and then applied to a specific case that the reader needs, such as an office edit that reaches the server before the signed form, or the photos of a signed form.
4. It is at most about 800 words (roughly two pages). Do not fail a doc for being under any length.

Fail if any one of these is broken, and quote the offending text.
