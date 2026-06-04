# Collaborative Process Modelling with EventStorming — Alberto Brandolini

> GATHERED SOURCE — public Medium article (freely readable); captured grammar + canonical pointer stored.
> Canonical URL: https://medium.com/@ziobrando/collaborative-process-modelling-with-eventstorming-17ed363650c0
> Author: Alberto Brandolini
> Published: 2022-08-30
> Captured: 2026-06-04
>
> This is Brandolini's own current public statement of the EventStorming process-level
> "grammar" (the cause-and-effect chain). It is the authoritative public reference for
> how the building blocks cascade. Use together with the ddd-crew glossary (which gives
> per-element colour/definition) — they agree.

## The grammar (cause-and-effect chain)

The notation forms a recursive pattern flowing left-to-right:

    Read Model → Command → Event → Policy → (next Command) → ...

Equivalently expressed: information enables a decision (command) issued against a system,
which produces an event, which a policy reacts to, triggering the next command — and the
chain repeats.

## Element definitions (as given in the article)

**Event (orange sticky)**
The outcome — a relevant fact that happened, named as a verb in the past tense
(e.g. "Contract Signed", "Onboarding Completed"). The stable anchors of the timeline.

**Command (blue sticky)**
A user action / decision performed against a system, typically issued after consulting
available information. Represents intent.

**Read Model (green sticky)**
The information necessary to make a decision. "Read models hold the information necessary
to make a decision." Sits before the command that consumes it.

**Policy (lilac/purple sticky)**
Decision logic captured as "Whenever this happens, we have to do that." A reaction that
connects an event to the next command. Stress-testing a policy with the words "always"
and "immediately" surfaces hidden behaviours and exceptions.

**Person / Actor (small yellow sticky)**
"A human being responsible for a given decision." Made explicit particularly when the
decision/action varies depending on who is performing it.

**System (wide pink sticky)**
The target of commands within the flow — the software (or external system) the command
is issued against.

## Author's key insight

The grammar's value is that it *forces rigour*: it makes teams ask hard questions about
policies, find missing decision points, and surface organisational inconsistencies. The
recruiting example in the article shows how making screening practices explicit revealed
previously-undiscussed selection criteria.

## Scope note

The article deliberately does NOT define "Aggregate" or "Bounded Context" — those belong
to the Software Design (design-level) format, not process modelling.
