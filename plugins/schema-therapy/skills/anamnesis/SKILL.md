---
name: anamnesis
description: >-
  The OPTIONAL brownfield entry into the schema-therapy modelling pipeline — an
  evidence-gated bridge that mines a legacy system into the domain.md that
  event-storming (step 01) already consumes. Owns the engagement workspace
  artifacts (anamnesis/brief.md, ledger.jsonl, probes.log, context-map.md) and
  the rendered domain.md / domain.<context>.md. Trigger ONLY for the anamnesis
  bridge: "run the anamnesis bridge", "mine the legacy system into domain.md",
  "anamnesis brief/merge/adjudicate/segment/handoff mode". NOT a general
  legacy-archaeology, reverse-engineering, or code-migration tool; it never
  writes specs/ (01 is only ever written by event-storming).
---

# anamnesis

The **anamnesis bridge** is the OPTIONAL brownfield entry path into the
**schema-therapy** modelling pipeline. It mines domain **value** out of a legacy system as
evidence-gated **claims** and renders only human/triangulation-confirmed claims into the
`domain.md` file that **event-storming** (pipeline step 01) already consumes. Greenfield
projects keep writing `domain.md` by hand; the pipeline changes by zero bytes.

This skill owns only the **engagement workspace artifacts and the rendered domain file(s)**
— nothing else. It is **NOT** a general legacy-archaeology, reverse-engineering, or
code-migration tool; adjacent ground owns that. It **never writes `specs/`** — 01 is only
ever written by event-storming; "moving to specs" is always a pipeline act.

**Boundary doctrine (verbatim from the spec).**

> The only thing that ever crosses from the legacy system into the pipeline is the
> rendered set of confirmed claims — never code, never chat, never probe output.

**The three mechanical fences** (all enforced by the harness, none by hand):

1. The orchestrator never holds legacy content.
2. The harness ensures the ledger never holds unauthorized content (the
   `capability`-authorization check, **L-CAP**, is the context-leak signature).
3. The render gate (**G4**) ensures the pipeline never sees unconfirmed content.

A mechanical harness (gates G0–G5) is the **sole** pass/fail authority; the command never
hand-verifies what the harness owns.

## a. Mechanical intake table (claim kind → render section → 01 element)

Carry the spec's Output contract: each claim kind renders into a fixed `domain.md` section,
which a named 01 element later extracts. Carry element names through unchanged.

| Claim kind | Rendered as / section | 01 element that extracts it |
|------------|-----------------------|-----------------------------|
| event | past-tense, actor-attributed sentence — **Domain events** | Domain Events row |
| actor | named party + one-line responsibility — **Actors** | Actors row |
| state + transition | lifecycle narrative per concept, event-sequenced — **Lifecycles** | Lifecycle Skeleton |
| rule | one-sentence business rule (prose) — **Rules** | 03 invariants (modelling pass) |
| term | canonical name used consistently — **Terms** | 02 glossary |
| relation | "each X belongs to exactly one Y" (prose) — **Relations** | 03 references / 04 FKs |
| deferred / contradiction-locked | one genuine question each — **Open questions** | Hotspots row |

`accident` claims **never render**; `unconfirmed` (unlocked) claims never render anywhere.

## b. Artifact contract (engagement workspace)

A per-project **engagement workspace** OUTSIDE `specs/` (the drift-police never audits it),
plus the rendered domain file(s):

```
<project>/
  anamnesis/
    brief.md          capability manifest (closed S1 format) — G0
    ledger.jsonl      claims ledger (one claim's current state per line) — G1
    probes.log        probe journal (audit trail; G2 + G3 substrate)
    context-map.md    confirmed bounded-context map (multi-context systems) — G5
    topics.md         topic board — a regenerated VIEW; the harness IGNORES it
    queue.md          adjudication queue — a regenerated VIEW; the harness IGNORES it
  domain.md           single-context render — the pipeline's existing input — G4
  domain.<context>.md per-context renders when the context map has >1 context — G4
  specs/              untouched; 01 is only ever written by event-storming
```

The **closed artifact formats** (brief table S1, ledger schema + claim key + independence
matrix S2/S3, probe journal S4, context map S5, the render format S6) live in
**`references/validation-rules.md` "Pinned conventions"** — reference it, do not restate it.
Load it at draft/professor points; load `references/simulation.md` only to interpret a
`malformed` / `broken-test` result.

## c. The five run-modes (each ≤ 5 draft↔gate iterations)

The orchestrating command dispatches five modes. The orchestrator is **orchestrator only —
it never reads legacy code**; heavy reading happens in subagents whose entire return value is
claim lines. All state lives on disk (resume = re-read brief + ledger + journal, recompute
gaps, continue).

| Mode | Input payload | Writes | Harness gate |
|------|---------------|--------|--------------|
| **Brief** | the capability interview (echo-back per item) | `anamnesis/brief.md` | G0 |
| **Merge** | parseable claim lines from mining subagents + probe entries | `ledger.jsonl`, `probes.log` | G0 G1 G2 |
| **Adjudicate** | human verdicts (echo-back) | rewrites verdicted `ledger.jsonl` lines | G0 G1 G2 |
| **Segment** | a human-confirmed concept→context clustering | `context-map.md` | G0 G1 G2 |
| **Handoff** | the ready context | re-renders + byte-compares the domain file | G0 G1 G2 G5 G4 |

Exact harness invocations:

```
node scripts/harness.mjs <project-dir> --gate g0
node scripts/harness.mjs <project-dir> --gate merge
node scripts/harness.mjs <project-dir> --gate dry                       # certify Phase 1 may close
node scripts/harness.mjs <project-dir> --gate render --context <slug>    # Phase 3, writes the S6 file
node scripts/harness.mjs <project-dir> --gate handoff --context <slug>   # the boundary oracle
```

- `--context` defaults to the implicit single context (`-`); it is **required** when the
  context map has >1 context (a missing required `--context` ⇒ `broken-test`).
- `render` writes the S6 file then records `{file, context, sha256, claims, openQuestions}`;
  `handoff` re-renders IN MEMORY and byte-compares against the on-disk file for **R-DET** —
  it **never trusts the declared render**.

**Statement-drafting discipline for Merge.** Draft statements in **domain words, no
code-speak** (no file paths, call syntax, SQL — R-SMELL warns on these). **Events are
past-tense and actor-attributed.** **Lifecycles are event-sequenced**, expressed as the
events that produce states ("An order is placed (→ pending), then paid (→ paid)…"); a mined
**state with no producing event stays an open question** — it is a dead enum value (accident)
or an undiscovered value, never a silent body statement. Confirm only by **triangulation**
(≥2 evidence classes spanning a legal independence pair — `code+test` does NOT count) or by a
**logged human verdict**; `accident`, `deferred`, single-class `confirmed`, and any status
change on a contradiction-locked claim each require a recorded verdict.

## d. Harness routing (per simulation.md §8)

The harness is the sole executable authority. Route on its verdict; never override the oracle.

| Result | Exit | Meaning | Action |
|--------|------|---------|--------|
| `pass` | 0 | zero ❌, reconciled, ≥1 check ran | proceed |
| `fail` | 1 | a ❌ over a parseable artifact (the owner check names the defect; a P-TIER `bridge-defect` is a genuine tier breach) | **fix the named engagement artifact**, re-run |
| `malformed` | 2 | an unparseable ledger/journal line (L-PARSE / P-PARSE) or a garbled brief Capabilities table (B-PARSE) | **fix the artifact's shape**, re-run |
| `broken-test` | 3 | missing `<project-dir>`/`anamnesis/`, a missing required `--context`, `--no-checks`, a reconciliation mismatch, or a check that threw | **fix the script/env**, never treat as a pass |

`bridge-defect` is a finding **class** carried on a P-TIER finding (an unauthorized probe was
logged) — it is never a fifth status; the status stays `fail`. ⚠️ checks (R-SMELL, R-SIZE)
are warn-only and **never block** handoff.

**Selftest** (run green before any engagement):

```
node scripts/selftest.mjs
```

It runs the harness over every `fixtures/manifest.json` fixture and asserts the exact
`(status, owner, exit)`; plus the S3 matrix + dry-arithmetic units, the renderer-honesty
scratch-mutation, the wrong-reason trap (R-ACC owner with L-CONFIRM co-firing), the
gate-interplay (valid-multi both contexts), the vacuous guard, the byte-identical double-run,
and the 35-row coverage floor. Exit 0 only on full pass.
