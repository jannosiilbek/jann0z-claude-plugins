# Violation Rubric

Each entry: what the violation is, how to detect it, how to fix it.

---

## OVERLAP

The same fact, rule, or instruction is assertable from two or more documents independently. Two documents overlap when removing one's copy would not cause the other to lose meaning — the claim exists redundantly.

**Detect:** read every document's claims. If claim C in doc A is semantically equivalent to claim C′ in doc B, one instance is OVERLAP. Apply the ownership tiebreaker (SKILL.md § Phase 2) to determine the owner.

**Fix:** keep the claim in the owner doc. In all other docs, replace with a cross-reference link to the owner.

---

## WRONG_OWNER

The claim is in a doc whose type does not match the claim's function.

**Ownership table:**

| Doc type | Owns | Does not own |
|----------|------|-------------|
| `CLAUDE.md` | Behavioral rules for AI agents; project-specific overrides | General principles that apply globally (those belong in user-level scope) |
| `README.md` | Entry point, orientation, where-to-go-next | Full setup steps, design decisions |
| Requirements / domain docs | Domain facts, system requirements, data model | How to run, deploy, or operate |
| ADRs / `decisions.md` | One architectural decision + rationale | Current system state |
| Runbooks / how-to guides | Step-by-step operational procedures | Why the system was designed this way |

**Fix:** move the claim to the correct owner doc. Leave a cross-reference in the original if the original doc still needs to acknowledge the claim's existence.

---

## WRONG_SCOPE

The claim is correct and in the right doc type, but stated at a scope that does not match the doc's audience. A global rule buried in a per-component doc is WRONG_SCOPE — agents reading only project-level docs will miss it.

**Detect:** if a claim applies to the entire project but lives in a skill-level, component-level, or sub-directory doc, it is WRONG_SCOPE.

**Fix:** move the claim to the broadest-scope doc where it applies. Cross-reference from the component doc if needed.

---

## SLOP

A sentence or paragraph an agent can remove without changing what a downstream agent can do.

**Anchor test:** "Does removing this sentence change what a downstream agent can do?" If no → cut.

**Detection checklist:**

- **Throat-clearing openers** — cut the opener, state the fact directly:
  - "It's worth noting that…"
  - "Note that…" / "Please note…"
  - "It's important to understand that…"
  - "Keep in mind that…"
  - "Please be aware that…"

- **Hedging seesaws** — "generally", "typically", "in most cases", "usually" stacked in one sentence → commit to the rule unconditionally or name the exception explicitly

- **Banned vocabulary** — replace or cut:
  `robust`, `seamless`, `delve`, `leverage`, `tapestry`, `vibrant`, `groundbreaking`, `pivotal`, `testament to`, `in the realm of`, `game-changer`, `cutting-edge`, `synergy`

- **Formulaic transitions starting a sentence** — restructure and cut:
  "Additionally,", "Furthermore,", "Moreover,", "In conclusion,", "Lastly,"

- **False comprehensiveness** — replace with the actual claim:
  "from X to Y", "whether A or B", "everything from X to Z"

- **Low information density** — compress:
  A paragraph of >60 words containing one assertable fact → rewrite to ≤30 words

---

## VAGUE

A term a downstream agent cannot act on without guessing.

**High-risk word list:**

- *Temporal:* `soon`, `shortly`, `eventually`, `promptly`, `timely`, `recently`, `in a timely manner`
- *Degree/quantity:* `appropriate`, `sufficient`, `adequate`, `relevant`, `significant`, `several`, `many`, `large`, `good`
- *Frequency:* `generally`, `typically`, `usually`, `often`, `sometimes`, `as needed`, `where applicable`
- *Complexity:* `simple`, `straightforward`, `easy`, `complex`
- *Quality:* `proper`, `reasonable`, `best practices`, `high quality`

**Fix:** substitute a number, deadline, named criterion, or specific reference.
- "soon" → "within 24 hours"
- "appropriate format" → "the format defined in §3"
- "generally applies" → state the rule unconditionally or name the exception

---

## NEGATIVE_FRAMING

A "never/don't/avoid" directive with no positive alternative in the same paragraph.

**Two categories — apply both independently:**

**Category A — behavioral preferences** (coding conventions, workflow rules, style choices): these always have a positive rewriting and must always be flagged.
- "Never use var" → `NEGATIVE_FRAMING` → "Use const or let."
- "Don't commit directly to main" → `NEGATIVE_FRAMING` → "Commit to feature branches; merge via pull request."
- "Avoid console.log in production" → `NEGATIVE_FRAMING` → "Use a structured logger (e.g. pino) in production."

**Category B — hard technical invariants** (platform constraints, data integrity rules, security requirements): allowed in negative form only when the positive rewriting is genuinely ambiguous or longer without adding clarity.
- "Never delete sessions directly — use the expiry mechanism instead." → **not a violation** (positive alternative stated in the same sentence)
- "Never reuse deprecated IDs." → allowed only if "assign only new IDs" would be ambiguous about what "new" means in this context

**Violations are not exclusive.** A claim can have both WRONG_OWNER and NEGATIVE_FRAMING simultaneously — flag both codes for the same content.

**Secondary test:** if a rule cannot be stated positively at all, question whether it belongs in the docs. Rules that only describe prohibited behavior without directing to the correct alternative create confusion for agent consumers.

---

## DENSE_CLAIM

A paragraph containing more than one independently assertable fact.

This is the highest-priority structural violation for agent-readable documentation. Agents retrieve and apply one claim at a time. A paragraph mixing two rules causes retrieval ambiguity — the agent may apply both, neither, or the wrong one.

**Detect:** read the paragraph and count distinct assertable facts. If more than one → DENSE_CLAIM.

**Fix:** split into N single-claim paragraphs. Each paragraph: one fact, subject noun in the first clause.

---

## STALE_FILE

A file with zero inbound links AND zero unique claims — all content is empty, superseded, or fully absorbed by another document.

**Detect:**
1. Grep all link surfaces for the file's path → zero references found
2. Scan the file's claims → every claim already exists in another document (or the file is empty)

Both conditions must hold. Failing either one means it is not STALE_FILE:
- Zero links but has unique claims → `BAD_FILENAME` or `WRONG_OWNER`, not STALE_FILE (the file needs to be fixed or linked, not deleted)
- Has inbound links but content is duplicated → `OVERLAP`, not STALE_FILE

**Fix:** DELETE after confirming zero inbound links.

---

## BAD_FILENAME

A filename that does not reflect the document's *function*, only its topic (or nothing at all).

**Anti-patterns:** `notes.md`, `misc.md`, `info.md`, `stuff.md`, `temp.md`, single-topic names with no function signal (`auth.md` — reference? runbook? ADR?).

**Convention:** `<subject>-<function>.md` or `<function>.md` where function is one of:
`reference`, `runbook`, `decisions`, `guide`, `overview`, `spec`, `brief`, `model`, `plan`, `glossary`

**Fix:** RENAME to a name that signals both subject and function. Update all links after rename.

---

## DEAD_LINK

A markdown link `[text](path)` or a plain file reference (`references/foo.md`, `spec/bar.md`) that resolves to a path that does not exist.

**Detect:** extract all link paths from all `.md` files; resolve each relative to the containing file's directory; check existence on disk.

**Fix:** update to the correct current path, or remove the link if the target was intentionally deleted.
