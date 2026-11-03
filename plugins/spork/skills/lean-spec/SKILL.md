---
name: lean-spec
description: Write, edit, tighten or validate superconcise, filler-free specs and tech docs at the right detail level, in Simplified Technical English, keeping scope focused, with alignment checks and a litmus test. Use for specs, PRDs, RFCs, design docs, ADRs, implementation plans and agent task specs, and whenever the user asks to draft, tighten, extend, review or litmus-test one, even if they don't say "spec".
---

# Lean Spec

Write documents where every sentence carries information the target reader needs at that document's level, and nothing else. Short is a consequence, not the goal: the goal is that the document is accurate, complete *for its altitude and purpose*, and fully aligned with what the user asked for. Cut noise, never substance: a document that is short because it omits what the reader needs to act is as wrong as a bloated one.

This skill is self-contained: everything it needs is in this folder, and it doesn't depend on other skills. The core workflow is below. Detail that only some tasks need lives in `references/`, and each step says when to read which file.

## Pick the mode

- **Write** a new document: follow steps 1 to 5.
- **Edit, extend or tighten** an existing document: read `references/editing.md` first, then follow steps 1 to 5 with its rules.
- **Validate, check, review or litmus-test** a document: read `references/validating.md`. It runs step 1 and step 5 only, and never rewrites the document.

Whatever the mode, read `references/altitudes.md` during step 1, and `references/cut-list.md` before you write or tighten (step 3). Both are short.

## 1. Calibrate before writing

Decide these five things first. Infer them from the request, the existing draft, and the conversation. Ask the user only when a wrong guess would change the document substantially, and then ask in one short message. Otherwise state your reading in a single line at the top of your reply (not in the document), e.g. *"Read as: conceptual spec, for engineering leads, product perspective."*

1. **Type**: concept/vision, PRD, design doc, architecture, functional/API spec, implementation plan, ADR, runbook, reference, README.
2. **Altitude**: how deep the document goes. `references/altitudes.md` says what belongs at each level and what doesn't, with signals for inferring the level. The altitude is a ceiling on detail: nothing below it gets in unless the gate in step 2 lets it.
3. **Reader and their baseline**: who reads it and what a competent professional in that role already knows and expects. That baseline is never written down. When the reader is an AI coding agent, its baseline is general professional knowledge (cut it as for a senior) and nothing local: not this codebase, team, history or conversation. When the purpose is build, also read `references/agent-build.md`.
4. **Perspective**: whose view the document takes (product, user, system, operator, integrator). Keep it constant; a product spec does not drift into describing tables, a system spec does not drift into marketing.
5. **Purpose**: what the reader will *do* with the document: decide (fund, approve, choose), build, integrate, operate, or review. The purpose sets what must be there; the altitude sets how deep it goes. A concept doc for a funding decision needs the value, what drives cost and the main risks, all at concept level; a concept doc for alignment may not. If the user states a purpose ("they'll use it to decide…"), the document must serve it.

From these, write the document's **focus** for yourself in one sentence: what it covers, for whom, at what altitude, for what purpose, and its non-goals. The focus is what the litmus test (step 5) checks scope against.

## 2. Gate every detail

Before a detail, sentence or section goes in, it must pass at least one of these:

- **Asked for**: the user requested it, or it answers a question they raised.
- **Needed for the purpose**: the reader can't do what the document is for without it (e.g. the value case and key risks for a funding decision), or a decision at this altitude depends on it, or it records a decision made at this altitude. A decision that sits below the altitude (a table schema, a library, a token format) is still below-altitude detail: when tightening, take it out and say in one line which lower-level doc it belongs in.
- **Non-obvious**: a competent reader at this level would get it wrong, or choose differently, without it. Deviations from the default count; the default itself doesn't.

Everything else is left out. Typical things that fail the gate:

- **Professional baseline**: "the API should handle errors gracefully", "code will be tested", "the UI should be user-friendly", "we will follow security best practices", "the system should be scalable". The reader assumes these. Write them only when there is a specific, non-default requirement ("p99 < 200 ms at 5k rps", "PII never leaves eu-west-1").
- **Below-altitude detail**: field names, libraries, retry counts, UI copy, file layouts in a conceptual or product spec.
- **Padding**: intros that restate the title, "this document describes…", summaries of what was just said, motivation the reader already shares, conclusions, "next steps" nobody asked for.
- **Invented specifics**: never fill a gap with plausible-sounding numbers, names or behaviour stated as fact. If the doc genuinely needs an answer you don't have, put it in *Open questions*. If it doesn't need it at this altitude, leave it out entirely.
  - *Proposals are not inventions.* When the purpose needs something only the author can design (endpoint paths, error codes, go/no-go criteria for a funding ask), you may propose it, marked as a proposal in the reply or the doc. Never propose facts (measurements, market data, dates, other people's decisions).
  - *Small unrequested rules count too.* A rule, behaviour, boundary, non-goal, layout detail or process step that the user did not give, and that does not follow necessarily from what they gave, is either left to the implementer (omit it) or starts with "Proposal:". Prefer omitting it. This includes small ones: a status code for other inputs, a header that repeats on each page, a sign-off step, a non-goal the user never mentioned. Acceptance checks test the user's decisions and the marked proposals, nothing else.

When the user explicitly asks for a detail that sits below the document's altitude, include it, compactly, where it belongs. Their request overrides the altitude; it does not lower the altitude of the rest of the document.

**When an AI coding agent builds from it.** Read `references/agent-build.md`. It lists what an agent needs that a human reader doesn't (local context, a done check, boundaries, open questions with an instruction) and how to mark what you add as a proposal.

## 3. Write lean

- One idea per sentence. Lead with the claim. Cut words that carry no information, but never a subject, verb or article just to save space.
- A length the user sets ("one page", "a paragraph") is a hard limit, not a target. One page is about 400 words; if the content doesn't fit, cut the least decision-bearing parts, not the sentences' clarity. The language rules below never justify going over it: cut content, not articles.
- Prefer concrete over abstract: a number, a name, a rule, an example.
- Define each term once and use exactly that term thereafter. No synonyms for the same concept or action (not check, verify and confirm for one action), and no word used in two meanings.
- Use lists and tables for parallel or enumerable content; prose for reasoning and relationships. No bullet fragments that need a sentence to make sense. A requirement is a full sentence, also in a list.
- State each rule, risk and value once, in the section where it belongs. Elsewhere refer to it in a few words ("see Signing"). Do not restate it as a principle and again as a section. A non-goal names what is out of scope, never the negation of a rule already stated. A value line does not repeat the problem. A later section on the same topic adds only what is new (an edge case, a risk) and points back to the rule instead of stating it again.
- Normative words (MUST/SHOULD/MAY) only in specs that are actually normative, and then consistently.
- Sections only when they carry content. No empty or ceremonial sections ("Introduction", "Conclusion", "Glossary" with one obvious term). Pick structure to fit the content, not a template. For a build document read by an agent, default to this order: goal and non-goals, constraints and boundaries, behaviour, acceptance, open questions.
- No hedging ("might potentially", "it could be argued"), intensifiers ("very", "really", "critical"), throat-clearing ("It's important to note that"), or AI-tell phrasing. `references/cut-list.md` lists the patterns.
- Keep the user's existing terminology, structure and decisions when editing their draft. Tighten; don't rewrite their intent.

### Language: Simplified Technical English

Write every document, and every reply, in Simplified Technical English (STE), the controlled language of ASD-STE100. Use it for every type and altitude. STE decides only how each sentence is written. Apply it last: first cut and restructure with the gate in step 2 and the rules above, then shape the sentences that remain. STE never adds a section, a detail or an explanation, and never keeps a section or heading that the gate removes.

- **Active voice.** Name the actor: "The API rejects the request." If the user did not say who acts, keep the passive or add an open question. Do not invent an actor.
- **Simple tenses.** Use the simple present for behaviour and the simple past for decisions and context. Use "has/have + participle" only when it states that something is true now. Do not use "will" for system behaviour, because readers cannot tell it from MUST.
- **Sentence length.** Aim for 20 words or fewer in every sentence. 20 is the hard limit for an instruction, step or acceptance criterion, and 25 for other sentences. A code span or a number with its unit counts as one word. A bold lead-in such as "**Fallback fill.**" is its own sentence, so the words after it start a new count. Put three or more conditions or steps in a list.
- **Plain verbs.** Use one verb, not a phrasal verb: "configure", not "set up". "Start", not "spin up" or "kick off". "Release", not "roll out". "Reads use Postgres", not "reads fall back to Postgres". Use the verb, not its noun form: "validate", not "perform validation of". Before you save, check every verb followed by back, up, down, off, out, over or on, and replace the pair with one verb: fall back → use, roll back → revert, show up → appear, turn off → disable, look up → find, come back → return, write back → restore. A fixed domain term such as "log in" or "log out" stays.
- **No semicolons.** Write two sentences, or a list.
- **Short noun phrases.** Stack at most three nouns: "the time when the window resets", not "rate limit window reset time".
- **Paragraphs.** One topic per paragraph, at most six sentences.
- **Markers.** Write a status or marker as a label followed by a full sentence: "Blocking: build neither.", "Proposal: the header repeats on each page." Not "(Proposal.)" or "Not decided."
- **Keep modality.** MUST, SHOULD, MAY and a real "may" carry confidence. Do not turn a SHOULD into a MUST, or "may fail" into "fails". Real uncertainty becomes an open question, not a fact.

The sentence rules do not apply to code, identifiers, field and header names, paths, status text, MUST/SHOULD/MAY, quoted text, headings, labels, or terse table cells (each cell must still have only one reading). The gate can still cut any of these. Meaning comes first: if a rule would drop a condition, a number or a qualifier, keep the longer sentence. The document never mentions STE.

## 4. Alignment checks

Save the draft first. Then run three separate passes on the saved file and fix it with edits. These passes are required, also for a short document: a document returned without them is not done. Fix every problem found, then re-check what you changed. Pass 1 is yours; Passes 2 and 3 come from readers who did not write the document, because an author re-reading their own text sees what they meant, not what they wrote.

**Pass 1: alignment with the ask (author, outside-in).**
Write down each thing the user asked for or stated as a requirement, constraint, decision or purpose. For each one, find where the document covers it and confirm it says the same thing, with the same strength (a "must" stays a must, a "maybe" stays open). Then go the other way: for each section of the document, confirm it traces back to the ask, the purpose, or the gate in step 2. Anything that contradicts, weakens, overstates or wasn't asked for is fixed or removed. Then check every rule, behaviour, boundary and non-goal in the document that is not on your list: each one follows necessarily from the list, or starts with "Proposal:", or goes. Any requirement not covered is added or listed under *Open questions*. Keep this list; Pass 2 is checked against it.

**Pass 2: independent cold read (fresh reader, inside-out).** A fresh subagent gets *only* the document plus one line naming the reader, their role, the purpose and the focus. It restates every requirement, names every point where it would have to guess, and answers the litmus test. Every mismatch with your Pass 1 list is an alignment bug, and every guess is a gap to close or list as open.

**Pass 3: line audit (fresh auditor, line by line).** A second fresh subagent gets the user's request word for word and the saved document. It returns every sentence that states an unrequested rule as decided, every rule stated twice, and every STE form break. Fix each item.

Read `references/check-passes.md` for the exact brief to give each subagent. When a subagent tool is available (Agent, Task or similar), you must use it for Passes 2 and 3, and you can run them at the same time. Only if no subagent tool exists, do both yourself, deliberately: write the restatement from the document alone before you look at the request again, then read the saved file back and audit it one sentence at a time.

## 5. Litmus test

The litmus test is the pass/fail gate a finished spec must clear. Step 4 finds and fixes problems; the litmus test decides whether the document is done. Every question has a yes/no answer and must pass. A failure is fixed and the test re-run; if it can't be fixed without the user (a missing decision, say), the gap goes under *Open questions* and that counts as a pass.

Answer each question as the target reader would: the named role, at senior level, knowing only what the document and their professional baseline give them.

**Has what it needs**
1. **Sufficient**: Could the reader do the job the document is for (decide, build, integrate, operate) using only this document, without coming back with questions? Include the risks and failure modes a senior in that role would raise at this altitude (security of an API, data loss or race conditions in a migration, behaviour at the stated limits, such as response size or run time at the maximum input, consent for recording). When the reader is an agent that builds, it must also know when it is done and what it must not touch. *Fail:* any question they'd have to ask, or risk they'd raise, that isn't addressed or listed as open. Name the gap; don't add detail below the altitude to close it.
2. **Complete to the ask**: Is every requirement, constraint and decision the user gave in it, at the same strength? *Fail:* anything missing, softened or hardened.
3. **Honest gaps**: Is every unresolved point either an explicit open question or out of scope? *Fail:* a gap papered over with vague wording, or filled with an invented number, name or behaviour.

**Has nothing it doesn't need**
4. **Senior test**: Is there no sentence a senior in the reader's role would call obvious, standard practice, or "goes without saying"? *Fail:* any such sentence (e.g. "handle errors", "write tests", "ensure security", "keep it scalable", defining a term every reader knows).
5. **Altitude**: Does nothing sit below the document's level of detail unless the user asked for it or the purpose needs it? *Fail:* implementation detail in a concept or product doc, a week-by-week schedule or sizing in a concept doc (even when labelled an assumption), internals in an API spec, and so on.
6. **Deletion**: Would deleting any sentence lose something the reader needs? *Fail:* any sentence whose removal loses nothing, including repeated statements, recaps, intros and conclusions.
7. **Focus**: Does everything fall within the one-sentence focus? *Fail:* a goal, feature, audience or problem area outside it that the user didn't explicitly add.

**Says it correctly**
8. **Consistent**: One term per concept, and every number, name and state agrees everywhere. *Fail:* synonyms for the same thing, one word in two meanings, or any contradiction.
9. **True**: Is every claim traceable to the user's input or to verifiable fact? *Fail:* anything asserted that neither supports.
10. **Unambiguous**: Would two readers in this role build or decide the same thing from it? *Fail:* any sentence two readers could reasonably read differently on a point that matters. This includes sentence form that allows a second reading: a passive that hides who acts, a dropped subject or article, or a chained sentence with an unclear scope. A form problem with only one reading is not a failure.

**Reporting.** When writing or editing, don't print the test; fix and re-run until it passes, then report in at most two lines outside the document: what you assumed, and any open question that needs the user. Don't narrate the checks, list what you removed, or repeat the document in the reply when it's saved to a file, unless asked. The reply follows the same rules as the document.

For validation, follow `references/validating.md`.

## Reference files

| File | Read it when |
|---|---|
| `references/altitudes.md` | Step 1, always: what belongs at each altitude, signals, an example at three levels |
| `references/cut-list.md` | Step 3, before you write or tighten: patterns that add words without information |
| `references/agent-build.md` | The reader is an AI coding agent and the purpose is build |
| `references/check-passes.md` | Step 4: the briefs for the Pass 2 and Pass 3 subagents |
| `references/editing.md` | Editing, extending or tightening an existing document |
| `references/validating.md` | Validating, checking or litmus-testing a document |
