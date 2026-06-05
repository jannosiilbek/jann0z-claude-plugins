# Anamnesis Bridge — Design

Legacy-to-model extraction for the schema-therapy pipeline: an agent loop that mines
domain **value** out of a legacy system and renders it as the pipeline's standard input,
while mechanically guaranteeing that legacy **accidents** never cross the boundary.

## Problem

Agents drift on bad legacy code the same way humans do: undocumented hacks, misleading
names, and bug-compatible behavior read as intent. Pointing the schema-therapy pipeline
(or any coding agent) at such a codebase transcribes the accidents into the model, where
the pipeline's own verification machinery would then defend them. Legacy code mixes two
things that look identical on the page:

- **Essential knowledge** — real invariants, lifecycle states, edge cases learned from
  production incidents, terminology users know.
- **Accidental structure** — old perf workarounds, dead flags, framework noise,
  bug-compatible behavior, naming drift.

Code alone cannot distinguish them. The bridge therefore never *translates* code into a
model; it *interrogates* the system across independent evidence classes and admits only
what survives triangulation or explicit human adjudication.

## Doctrine

One sentence, mirroring the `/schema-therapy:scope` boundary rule:

> The only thing that ever crosses from the legacy system into the pipeline is the
> rendered set of confirmed claims — never code, never chat, never probe output.

Supporting principles:

- **Claims, not content.** Every extraction is a claim with provenance, untrusted by
  default. Default-deny: what cannot be justified lands as an open question, never as
  model content.
- **Optional by construction.** The bridge's sole output is the `domain.md` file the
  event-storming skill already consumes. Greenfield projects keep writing it by hand;
  the pipeline changes by zero bytes.
- **The human owns judgment; the bridge owns evidence.** Adjudication is the point, not
  a bottleneck to automate away. The bridge's job is to make the human's queue short and
  well-evidenced.
- **Unattended-safe.** Agents mine day and night; all state lives on disk; the loop
  never blocks on the human; interruption is a non-event.

## Packaging

Same division of labor as `/scope` + impact-map:

```
commands/anamnesis.md            the session command — hosts the brief interview, the
                                 mining loop, and the adjudication sessions
skills/anamnesis/                the artifact owner — SKILL.md procedure,
  references/validation-rules.md closed rule catalog
  scripts/harness.mjs            the mechanical oracle (zero-dependency Node ≥18 ESM)
  scripts/selftest.mjs           adversarial fixture suite
```

Engagement workspace (per project, OUTSIDE `specs/` — drift-police never audits it):

```
<project>/
  anamnesis/
    brief.md                     capability manifest (confirmed, closed format)
    ledger.jsonl                 claims ledger (append-only)
    probes.log                   probe journal (audit trail)
    context-map.md               confirmed bounded-context map (multi-context systems)
    topics.md                    topic board (a VIEW — regenerated from the ledger)
    queue.md                     adjudication queue (a VIEW — regenerated from the ledger)
  domain.md                      single-context render — the pipeline's existing input
  domain.<context>.md            per-context renders when the context map has >1 context
  specs/                         untouched; 01 is only ever written by event-storming
```

## The capability brief (Phase 0)

No two engagements offer the same access. The brief is an interview — scope-Gather
style, echo-back confirmation per item — that inventories what THIS engagement provides:

- **Evidence classes available**: code, tests, docs/UI-strings, data (DB/logs), probe
  (live API and/or browser).
- **Per environment, a probe tier** from the closed set:
  `none` | `browse-only` | `read-only` | `sandbox-full`.
  Only `sandbox-full` permits mutating probes (including deliberate forbidden-action
  attempts). Production is never `sandbox-full`.
- Access details per class (repo path, DB connection, base URLs, credentials reference).

The brief is the engagement contract: every piece of evidence later cites the brief
entry that authorized it. No brief, no mining (gate G0).

## The claims ledger

Append-only JSONL, one claim per line, closed schema:

```json
{"id":"CLM-0042","concept":"order","kind":"transition",
 "statement":"An order in 'shipped' can return to 'pending' via manual support action",
 "evidence":[
   {"class":"code","source":"OrderService.java:412","capability":"repo"},
   {"class":"data","source":"audit_log: 137 occurrences 2019-2025","capability":"db-ro"}],
 "status":"confirmed","round":3}
```

Closed sets:

- `kind` ∈ {actor, event, state, transition, rule, term, relation} — shaped to render
  directly into what event-storming extracts (see Output contract).
- `evidence[].class` ∈ {code, test, doc, data, probe}; `capability` names the brief
  entry that authorized the access, by exact string.
- `status` ∈ {unconfirmed, confirmed, accident, deferred}.

Status lifecycle:

- `unconfirmed` → `confirmed` by **triangulation** (≥2 evidence classes from the pinned
  independence matrix) or by **human verdict**.
- `unconfirmed` → `accident` by human verdict ONLY — never automatically. Accidents are
  recorded forever (with the verdict's reasoning) so no future round re-mines them, and
  they NEVER render.
- `unconfirmed` → `deferred` by human verdict; deferred claims render as open questions.
- Two claims sharing (concept, kind) with conflicting statements are
  **contradiction-locked**: both stay `unconfirmed` and neither may be confirmed until a
  human adjudicates — contradictions are never auto-resolved, not by recency,
  confidence, or majority. (Contradiction is a lock, not a status.)
- Human verdicts are recorded ON the claim: a `verdict` object
  (`{"by":"human","round":N,"reason":"<one line>"}`) added at adjudication time. The
  harness accepts `confirmed`-by-single-class and `accident` only when this object is
  present.

Independence matrix (pinned): a confirmation pair must span genuinely independent
observation channels. `code+test` does NOT count (tests assert what code does — same
channel); `data+anything`, `probe+anything`, `doc+code` count. The catalog owns the
full matrix.

Claims are keyed by (concept, kind, normalized statement). Same key from two miners =
one claim, merged evidence. Near-duplicates are flagged for orchestrator merge/split —
never silently unioned.

## Context segmentation (big legacy)

The pipeline is single-bounded-context by contract (02 pins one context per specs tree).
A large legacy system is never one context, so the bridge segments before it renders:

1. After mining runs dry, the orchestrator clusters concepts into candidate bounded
   contexts (concepts whose states/rules/transitions reference each other cluster; thin
   seams — ID-only references — mark boundaries).
2. The proposed context map is itself an adjudication item; the human confirms or
   redraws it. The result is `anamnesis/context-map.md`.
3. The renderer emits one `domain.<context>.md` per confirmed context. Each context
   feeds its own pipeline run with its own specs tree. Contexts can be bridged one at a
   time; unrendered contexts stay mined in the ledger.

Capacity model: **the ledger is the unbounded archive; a domain file is a bounded,
per-context, altitude-controlled view.** If one context still renders too large for a
sane event-storming input, that is the cluster saying it is two contexts — back to the
queue, never a bigger file.

## The loop

The main session is **orchestrator only — it never reads legacy code.** All heavy
reading happens in subagents whose entire return value is claim lines. The disk ledger
is the shared memory; conversation context stays small and constant-size regardless of
how long the loop runs.

```
Phase 0  BRIEF      interview → confirmed capability manifest            [gate G0]
Phase 1  ROUNDS     repeat until dry:
           assign   orchestrator computes gaps from the ledger (unmined modules,
                    unconfirmed claims, contradictions) → narrow assignments
           mine     parallel subagents, one per evidence class × scope slice;
                    input: brief + assignment + claim-key digest (dedup);
                    output: ONLY new/updated claim lines
           probe    hypothesis-driven: each unconfirmed claim the manifest allows
                    probing becomes one targeted probe (API call or browser walk);
                    result appended to that claim's evidence                [gate G2]
           merge    dedup by claim key; append; promote legal confirmations [gate G1]
           dry?     2 consecutive rounds with zero new/changed claims      [gate G3]
Phase 1b SEGMENT    cluster concepts → candidate context map → queue item
Phase 2  TOPIC LOOP topic-by-topic refinement sessions (see Topic loop)
Phase 3  HANDOFF    context ready                                          [gate G5]
                    → deterministic ledger → domain file(s)                [gate G4]
                    → dispatch event-storming (normal pipeline entry);
                    the pipeline populates specs/ — the bridge never writes it
```

Context-efficiency discipline (stated in the command, enforced where mechanical):

- Mining subagents return claims, never file contents or transcripts. The merge step
  accepts only parseable claim lines; anything else is discarded and logged — a sloppy
  subagent cannot push slop into the ledger even by accident.
- The orchestrator holds only the brief, a ledger digest (claim keys + statuses), and
  the current round state.
- Resume after interruption = re-read brief + ledger + journal, recompute gaps,
  continue. Nothing lives only in conversation.

## Adjudication

`queue.md` is regenerated from the ledger (the ledger is the only state). Entries are
ranked by blast radius: claims touching money, compliance, irreversible actions, or
high-frequency data first; cosmetic and dead-code claims last. Each entry shows the
claim, its evidence, the specific question whose answer resolves it, and a proposed
verdict with reasoning — the human confirms, overrides, or defers in a few words.

Sessions are batched and never block mining. Echo-back discipline: a verdict enters the
ledger only after the human confirms it. A long tail never adjudicated is safe by
design — deferred claims become 01 hotspots, not silent model content.

## The topic loop (iterative refinement and handoff)

Adjudication at scale is worked **one topic at a time**, so each sitting needs only one
small slice of the ledger in context — never the whole engagement.

- **Topics** are concept clusters within a bounded context (e.g., "order lifecycle",
  "billing"), cut from the context map and sized for one sitting. `topics.md` is the
  board — a view regenerated from the ledger, one row per topic: status, claim counts
  by status, open-item count, blast radius rank.
- **Each topic session opens with a topic brief**, generated fresh from that topic's
  ledger slice, ≤1 page, two parts:
  1. **Settled** — the confirmed picture, one line per claim, so the human re-enters the
     topic in seconds.
  2. **Open + impact** — each unresolved item (unconfirmed, contradiction-locked,
     deferred-so-far) with the specific question that resolves it AND its impact line,
     derived mechanically from the claim graph: which lifecycles/rules/relations in this
     and other topics reference it, and what downstream artifact class it ultimately
     feeds (lifecycle → 04/05; rule → 03; relation → 04). Impact is why an item is
     worth the human's minute — or safely deferrable.
- The session works the open items queue-style (echo-back verdicts), then closes with a
  readiness check. **Topic ready** = zero unconfirmed and zero contradiction-locked
  claims (deferred is allowed — deferral is a verdict). **Context ready** = all its
  topics ready.
- **Handoff is readiness-gated**: when a context is ready (G5), it is rendered (G4) and
  event-storming is dispatched for that context — the normal pipeline entry, which
  populates that context's specs tree. The bridge never writes `specs/` itself; "moving
  to specs" is always a pipeline act. Contexts hand off independently — one context can
  be deep in the pipeline while another is still in topic sessions.
- **Context efficiency**: a topic session loads the topic brief + that topic's ledger
  slice + the claim-key digest for cross-topic references — nothing else. The board, the
  briefs, and the queue are all regenerated views; the ledger stays the only state.

## Output contract (alignment with event-storming)

The renderer is a claims-to-EventStorming-input compiler. Its target language is the
free-text domain description the event-storming skill was always designed to consume; a
bridge-rendered domain file and a human-written one are indistinguishable to the
pipeline, except every sentence in the bridge's version carries evidence.

| Claim kind | Rendered as | 01 element that extracts it | Ultimately feeds |
|---|---|---|---|
| event | past-tense, actor-attributed sentence naming the event | Domain Events row | 04 transitions, 05 events, 06 When-steps |
| actor | named party + one-line responsibility | Actors row | 02 Terms, 07 personas |
| state + transition | lifecycle narrative per concept, as an ORDERED EVENT SEQUENCE | Lifecycle Skeleton | 02 enums, 04 transitions, 05 statecharts |
| rule | one-sentence business rule attached to its concept | prose context | 03 invariants (via the modelling pass) |
| term | canonical name used consistently throughout | carried vocabulary | 02 glossary, forbidden synonyms |
| relation | "each X belongs to exactly one Y" statements | prose context | 03 references, 04 FKs |
| deferred / contradiction-locked | one genuine question each, in an **Open questions** section | Hotspots row | resolved before downstream consumes |

Pinned subtleties:

- **Lifecycles are event-sequenced, not state-listed.** 01 skeletons are ordered event
  lists and 02 derives enums from them, so the renderer expresses each lifecycle as the
  events that produce its states: "An order is placed (→ pending), then paid (→ paid)…".
  A mined state with no observed producing event renders as an open question — it is
  either a dead enum value (accident) or undiscovered value.
- **The actor seam runs through 00, and order matters.** 00 Business Actors come from
  the human scope session, about the future product; the legacy cannot dictate them.
  Engagement order: anamnesis mines → `/scope` runs with the context map and actor
  claims on the table → the human decides which mined actors become 00 Business Actors
  → pipeline. Mined actors that stay out of 00 still render and land in 01's Actors
  table as non-business kinds. The bridge informs scope; it never writes it.
- **Determinism.** 01 fingerprints the domain file. Re-rendering an unchanged ledger
  must produce byte-identical output, or it triggers a false staleness cascade.
- **Annotation discipline.** Every rendered statement carries its claim ID as a trailing
  annotation (`[CLM-0042]`) so evidence is one grep away. Canonical names (events,
  states, actors, terms) never embed a claim ID; nothing downstream ever carries one
  into an identifier.

## Harness & gates

`skills/anamnesis/scripts/harness.mjs` — zero-dependency Node (JSONL parse +
cross-refs; no engines needed) with `selftest.mjs` fixtures. The harness is the sole
mechanical authority for the gates; the command never hand-verifies what the harness
owns.

- **G0 Brief gate** (before any mining): `brief.md` parses; every environment declares
  a probe tier from the closed set; every available evidence class names its access.
- **G1 Ledger gate** (every merge): every line parses against the closed schema; IDs
  unique; kinds/classes/statuses in closed sets; rounds monotonic; every claim has ≥1
  evidence; every evidence's `capability` resolves to a brief entry by exact string
  (evidence without an authorizing capability is the context-leak signature — hard
  fail); `confirmed` requires ≥2 classes per the independence matrix OR a logged human
  verdict; `accident` requires a human verdict, always; contradiction lock — conflicting
  (concept, kind) claims cannot be confirmed until adjudicated; no duplicate claim keys.
- **G2 Probe-audit gate**: every probe-class evidence line resolves to a `probes.log`
  journal entry; on `read-only`/`browse-only` tiers the journal contains no mutating
  methods (closed verb list). The tier promise is verified after the fact.
- **G3 Dry gate**: "mining is dry" is certified — the harness verifies the last 2
  rounds added zero new/changed ledger lines before Phase 1 may close.
- **G5 Readiness gate** (before render + dispatch): a context may hand off only when it
  contains zero `unconfirmed` and zero contradiction-locked claims — mechanically
  computed from the ledger + context map, never declared by hand. Deferred claims pass
  (they render as open questions).
- **G4 Render gate** (the boundary oracle — nothing crosses to the pipeline until
  green): every `[CLM-nnnn]` in a domain file resolves to a `confirmed` claim, or sits
  in Open questions and resolves to a `deferred` or contradiction-locked claim; reverse
  coverage — every
  confirmed claim in the rendered context appears in the file; zero accident leakage —
  no accident claim renders, and no accident claim's canonical names appear in prose
  unless also owned by a confirmed claim; double-render byte-identical; no CLM string
  inside a canonical name; warn-tier lint for code-smell in prose (file paths, call
  syntax, SQL fragments); context-map consistency — every rendered file maps to one
  context-map entry and contains only that context's concepts.

Selftest fixtures (adversarial, with wrong-reason traps, matching the other skills'
discipline): unauthorized-capability evidence, single-class auto-confirm, auto-accident,
accident-leaked-to-render, contradiction-auto-resolved, probe-without-journal,
mutating-probe-on-read-only, nondeterministic render, confirmed-claim-dropped-from-render,
context-handed-off-with-unconfirmed-claims. Each must fail with the right owner.

Three fences, all mechanical: the orchestrator never holds legacy content; the harness
ensures the ledger never holds unauthorized content; the render gate ensures the
pipeline never sees unconfirmed content.

## Error handling

- An unauthorized probe (outside the brief's tier) is a bridge defect, not a judgment
  call — surfaced and stopped, mirroring drift-police's upstream-defect doctrine.
- Harness `malformed` / `broken-test` routing follows plugin convention: fix the
  artifact or the script per the verdict, never override the oracle.
- Merge rejects non-claim subagent output (discard + log).
- Bounded iteration follows plugin convention (5 per loop) for the draft↔gate cycles
  inside brief, segmentation, and render phases; mining rounds are bounded by the dry
  gate instead.

## Testing

- **Fixture engagement** (the bridge's `test-workspace/`): a small, deliberately rotten
  legacy app with seeded, documented accidents — a dead status value present in the
  enum but absent from data, a bug-compatible behavior pinned by a test, a misleadingly
  named entity, a workaround branch — plus seeded genuine value (real invariants, a
  data-confirmed transition). Acceptance criterion = the concept itself: every seeded
  accident ends as `accident`/queue and never appears in `domain.md`; every seeded value
  claim renders.
- **Renderer determinism**: byte-identical double-run.
- **Harness selftest**: the adversarial fixture suite above, run green before any
  engagement.
- **Real-world experiment**: on a dedicated branch/worktree of this repo, point the
  bridge at a real legacy system per its actual brief; judge queue quality and miner
  yield; learnings drive the hardening pass (rule catalog growth, matrix tuning).

## Out of scope

- Drafting 00 (goals/scope stay a human interview — the legacy cannot tell you the
  future).
- Editing any pipeline skill or artifact; 01 is only ever written by event-storming.
- Behavioral equivalence with the legacy system. The exit criterion is **value
  equivalence**: all triangulated domain truth captured, all divergence from legacy
  behavior deliberate and recorded (as `accident` verdicts in the ledger).
- Code migration. The bridge produces a model, not a port.
