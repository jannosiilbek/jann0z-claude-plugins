---
type: llm
focus:
  source: file
  path: session-store-design.md
weight: 1
---

The design doc is written in Simplified Technical English (STE) sentence form. Judge only prose sentences and list items written as sentences. Ignore code blocks, inline code, headings, labels, and table cells.

Pass only if all of these hold:

1. No semicolons in prose.
2. At most two sentences longer than 25 words. Count a code span or a number with its unit as one word.
3. No phrasal verbs where a single verb exists, such as "set up", "spin up", "fall back to", "roll out", "kick off", "carry out". At most one slip in the whole doc.
4. No action written as a noun phrase with an empty verb, such as "perform a migration of", "do a backfill of", "make a decision". At most one slip in the whole doc.
5. No present perfect ("has been migrated", "we have seen") except where it says that something is true now. At most one slip in the whole doc.

Fail if any one of these is broken, and quote the offending text.
