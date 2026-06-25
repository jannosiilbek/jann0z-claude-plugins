# Event storming in text

The classic workshop puts orange stickies (events) on a wall, then works backwards to
commands, actors, and policies. This skill runs the same discipline linearly, against a
brief instead of a room of experts. The ordering matters — events first — because
events are facts and facts are the easiest thing to get right; everything else hangs
off them.

## Method

1. **Sweep for events.** Read the brief's scope and narrate the domain's life
   chronologically: what happens, in past tense, from first contact to end of life.
   ("Member registered", "Membership lapsed", "Check-in recorded".) Include the unhappy
   paths the brief implies — a scope line like "memberships can lapse" is an event in
   disguise.
1b. **Sweep for error and compensation events.** For each event found in step 1,
    ask: what can prevent or invalidate this? What does the system emit when the
    cause of the event fails, is rejected, or times out? ("Payment declined",
    "Enrollment rolled back", "Invitation expired".) These are the events most
    reliably missed in a forward-only sweep, and they are the ones that drive the
    policies and compensating commands that protect domain integrity. Add each
    to the flow you're storming, then continue to step 2.
2. **Work each event backwards to its command.** What intent caused it? ("Record
   check-in".) Some events have no command — they're caused by time or by another event
   (that's a policy, below).
3. **Attach actors.** Who issues each command? Every actor must be (or become) a
   glossary term. If storming surfaces an actor the brief missed, that's a finding —
   add the term and note it in the report.
4. **Find policies.** Whenever event X happens, the system itself triggers command Y —
   `Whenever Membership lapsed, then Notify member`. Policies are where automations and
   eventual side effects live; missing them is the most common storming gap.
5. **Group into flows.** A flow (`FL-xxx`) is one coherent narrative — usually one
   command-to-outcome chain plus its policies. Prefer several small flows over one
   mega-flow; downstream use cases map most cleanly from single-command flows.

## What makes a good event

- **Past tense, domain language** — "Student enrolled", not "insert enrollment row".
- **A fact someone cares about** — if no actor, policy, or report would ever react to
  it, it's noise, not an event.
- **Atomic** — "Order placed and paid" is two events wearing one sticky.

## Bounded contexts — the restraint heuristic

Contexts earn their keep only when the domain is genuinely large. Note `- Context:`
fields when **both** of these hold:

- The model is heading past roughly **15 entities**, and
- different actor groups use **different vocabularies for the same word** (what Sales
  calls a *Lead*, Support calls a *Ticket requester*) or clearly separate lifecycles.

Otherwise the whole domain is one context and the field is omitted everywhere. An
invented context boundary costs real money downstream (it implies integration seams);
a missing one costs a rename later. When in doubt, omit.

## From flows to the glossary

After storming, every noun that appears in an event, command, or actor position is a
glossary candidate. For each: does it own persisted rows (→ `Maps to: ERD:`), is it a
pure role (→ term only), or is it really an attribute of another term (→ no term)?
Relationship nouns — the *Enrollment* between Student and Course — are the ones
beginners skip; name them, because they become bridge tables and the alignment gate
will ask who they are.
