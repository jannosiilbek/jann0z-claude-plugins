# Elicitation method

## The coverage checklist

A brief is complete when each of these is either answered or explicitly assumed:

| Area | What "covered" means | Typical gap question |
|------|----------------------|----------------------|
| Problem | Who has what pain, and why solving it now matters | "What goes wrong today when X happens?" |
| Actors | Every kind of person/system that touches the system | "Who else reads or changes this data?" |
| Scope in | The capabilities v1 must have | "Is reporting part of this, or later?" |
| Scope out | The tempting neighbors explicitly excluded | "Payments: in or out?" |
| Constraints | Tech, regulatory, budget, deadline boundaries | "Any storage/stack it must run on?" |
| Non-functional | Performance, security, compliance expectations that shape design | "Roughly how many records/users?" |

Walk the checklist against the user's request **and every provided document** first.
Mark each area covered/uncovered. Only uncovered-and-consequential areas earn a
question.

## Questioning discipline

- **One question per message.** A wall of questions gets a wall of half-answers.
- **Multiple-choice beats open-ended** — options show the user you understood the
  domain, and the "Other" escape hatch still exists.
- **Ask only what changes the spec.** "What color should the UI be" never changes a
  brief. "Can an order exist without a customer" always does.
- **~5 question budget.** When it's spent, switch to stated assumptions: write
  "Assumed: X (correct me)" into the relevant brief section. An assumption the user can
  see and veto is worth more than a tenth question they won't read.
- **Zero is a valid number of questions.** A detailed request plus good documents often
  covers the checklist outright. Say "your material covered everything — no questions"
  and move on. This is also why the skill works non-interactively.

## Sizing rubric (the anti-bloat contract)

The documented failure mode of spec pipelines is weight that doesn't adapt: one
published case turned a small bug fix into 4 user stories with 16 acceptance criteria —
reviewers concluded they'd rather review the code. The sizing block exists so that
never happens here.

| Signal | Size |
|--------|------|
| New domain, no existing spec/ artifacts | **full** |
| New capability inside an already-specced domain | **delta** (domain/usecases/plan update incrementally) |
| Data-model-only work (a tool, a report, an import) | **lean** — often `ddd-domain: yes, ddd-usecases: yes, erd-modeler: yes, ddd-plan: no` |
| Bug fix / small behavior change | **delta**, usually touching one use case and nothing else — and if not even a use case changes, say the pipeline isn't needed at all |
| Spike / prototype the user calls throwaway | **lean** at most — and say that the spec can be skipped entirely; don't manufacture ceremony |

Two tests before settling:

1. **The review test** — would reviewing the artifacts take longer than reviewing the
   change? If yes, size down.
2. **The consumer test** — will anything downstream actually read this artifact? An
   artifact nothing consumes is dead weight; mark its stage `no`.
