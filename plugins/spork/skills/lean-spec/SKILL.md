---
name: lean-spec
description: Write, edit, tighten or validate superconcise, filler-free specs and tech docs at the right detail level, in Simplified Technical English, keeping scope focused, with alignment checks and a litmus test. Use for specs, PRDs, RFCs, design docs, ADRs.
---

# Lean Spec

Write documents where every sentence carries information the target reader needs at that document's level, and nothing else. Short is a consequence, not the goal: the goal is that the document is accurate, complete *for its altitude and purpose*, and fully aligned with what the user asked for. Cut noise, never substance: a document that is short because it omits what the reader needs to act is as wrong as a bloated one.

This skill is self-contained. Everything it needs is in this file; it doesn't depend on other skills, templates or reference files.

## 1. Calibrate before writing

Decide these five things first. Infer them from the request, the existing draft, and the conversation. Ask the user only when a wrong guess would change the document substantially, and then ask in one short message. Otherwise state your reading in a single line at the top of your reply (not in the document), e.g. *"Read as: conceptual spec, for engineering leads, product perspective."*

1. **Type**: concept/vision, PRD, design doc, architecture, functional/API spec, implementation plan, ADR, runbook, reference, README.
2. **Altitude**: how deep the document goes. See *Appendix A: Altitudes* below for what belongs at each level and what doesn't. The altitude is a ceiling on detail: nothing below it gets in unless the gate in step 2 lets it.
3. **Reader and their baseline**: who reads it and what a competent professional in that role already knows and expects. That baseline is never written down. When the reader is an AI coding agent, its baseline is general professional knowledge (cut it as for a senior) and nothing local: not this codebase, team, history or conversation. See *When an agent builds from it* in step 2.
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

**When an agent builds from it.** An agent can't come back with questions, it fills silence with guesses, and it stops when the work looks done. When the reader is an AI coding agent and the purpose is build, these are *needed for the purpose*, kept at the document's altitude:

- **Local context**: the files, modules, interfaces and existing pattern the work touches or follows, and decisions made in the conversation. Point to them by path or name; don't paste code or restate what the agent can read in the repo.
- **Done check**: acceptance criteria the agent can check itself: testable statements or input → output examples, plus the end-to-end check that proves the whole works. This section is never ceremonial.
- **Boundaries**: what must not change (a public contract, a schema, existing behaviour, dependencies) and what needs human sign-off first. Only rules specific to this work; repo-wide rules (commands, code style, secrets) belong in CLAUDE.md or AGENTS.md.
- **Open questions with an instruction**: each says either *blocking* (leave that part unbuilt) or gives a marked provisional default to build against, so the agent never picks silently.
- **Reasons**: a non-default constraint keeps a one-clause reason when the reason decides cases the document doesn't name.

Anything in these that the user didn't give (a boundary, a provisional default, a structural rule such as "share one implementation") is a proposal: mark it as one, never as a MUST. This covers implementation hints too ("reuse the CSV filter code", "keep chart code separate", "add a test before you change `csv.ts`"): start each with "Proposal:". Leave out repo-wide commands such as `npm test` or lint.

## 3. Write lean

- One idea per sentence. Lead with the claim. Cut words that carry no information, but never a subject, verb or article just to save space.
- A length the user sets ("one page", "a paragraph") is a hard limit, not a target. One page is about 400 words; if the content doesn't fit, cut the least decision-bearing parts, not the sentences' clarity. The language rules below never justify going over it: cut content, not articles.
- Prefer concrete over abstract: a number, a name, a rule, an example.
- Define each term once and use exactly that term thereafter. No synonyms for the same concept or action (not check, verify and confirm for one action), and no word used in two meanings.
- Use lists and tables for parallel or enumerable content; prose for reasoning and relationships. No bullet fragments that need a sentence to make sense. A requirement is a full sentence, also in a list.
- State each rule, risk and value once, in the section where it belongs. Elsewhere refer to it in a few words ("see Signing"). Do not restate it as a principle and again as a section. A non-goal names what is out of scope, never the negation of a rule already stated. A value line does not repeat the problem. A later section on the same topic adds only what is new (an edge case, a risk) and points back to the rule instead of stating it again.
- Normative words (MUST/SHOULD/MAY) only in specs that are actually normative, and then consistently.
- Sections only when they carry content. No empty or ceremonial sections ("Introduction", "Conclusion", "Glossary" with one obvious term). Pick structure to fit the content, not a template. For a build document read by an agent, default to this order: goal and non-goals, constraints and boundaries, behaviour, acceptance, open questions.
- No hedging ("might potentially", "it could be argued"), intensifiers ("very", "really", "critical"), throat-clearing ("It's important to note that"), or AI-tell phrasing. See *Appendix B: Cut list* below for patterns.
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

**Pass 2: independent cold read (fresh reader, inside-out).**
When a subagent tool is available (Agent, Task or similar), you must use it: give a fresh one *only* the document plus one line naming the reader, their role, the purpose and the one-sentence focus. Do not give it the conversation, the user's request, or your Pass 1 list. Ask it to return:
1. A restatement of every requirement, decision and constraint the document makes, one line each.
2. Every point where the document is silent but the reader would have to decide something to do the job, and what it would assume there.
3. Its answers to the litmus test in step 5, each with the exact text that fails it.

If no subagent is available, do the same yourself as deliberately as you can: write the restatement from the document alone before looking at the request again, then run the litmus test.

Then compare. Every mismatch between the reader's restatement and your Pass 1 list is an alignment bug: the document says something other than what the user meant. Every assumption it had to make is a gap: state the answer if the user gave it, otherwise add an open question. Fix those first, then every litmus failure. Ignore suggestions to add detail below the altitude unless the purpose needs it.

**Pass 3: line audit (fresh auditor, line by line).**
When a subagent tool is available, start another fresh subagent (you can run it at the same time as Pass 2). Give it the user's request word for word (in edit mode, also the original document) and the saved document. Ask it to go through the document sentence by sentence and return, with each sentence quoted:
1. Every sentence that states as decided a rule, behaviour, boundary, non-goal, default or detail that the request does not give and that does not follow necessarily from it, unless the sentence starts with "Proposal:" or "Provisional default:". Small ones count: a status code, a header, the format of a value, which requests count toward a limit, a test step, a layout detail.
2. Every rule, risk, value or decision that the document states in more than one place, including a non-goal that negates a stated rule and a value or summary line that repeats the problem or a principle.
3. Every STE form break outside code, tables and headings: a verb with back, up, down, off, out, over or on; a passive that does not name the actor; "has/have been" or "has/have + participle"; "will" for behaviour; a semicolon; a sentence over 25 words; a requirement or status written as a fragment.
Fix every item: mark it "Proposal:", leave it to the implementer, merge the repeat into one place, or rewrite the sentence. Then re-check the lines you changed. Only if no subagent tool exists, do this audit yourself: read the saved file back, then write the three lists one sentence at a time against the request before you edit.

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

**Validating on request.** When the user asks to validate, check, review or litmus-test a spec (theirs or anyone's), run steps 1 and 5 only and don't rewrite it. Return a table: test, pass/fail, the exact failing text (quoted, short), and the fix in a few words. Count each defect once, under the test it fits best; if the same text fails several tests, list it once and name the others in the fix cell, so the score reflects distinct problems. Never quote the same sentence in two rows, even for two different problems: give it one row and name both problems in its fix cell. Lead with the verdict ("Passes" or "Fails 3 of 10"), then name the blockers: the failures that would make the reader build, integrate or decide wrongly, as opposed to wording cleanups. STE form problems count only under test 10, and only when they allow a second reading. Note other sentence-form problems in at most one line after the table, never as a failure. A content problem is never a form note: a missing boundary, an unbounded instruction ("refactor it as needed"), a gap or a conflict always fails a test, with its text quoted. If the user's original ask isn't available, test 2 checks the document against its own stated goals and scope.

## Editing, extending or reviewing an existing document

Specs grow by edits, and most bloat and scope creep enter that way. Treat every edit as a change to a focused document, not an append.

**1. Anchor the focus first.** Before changing anything, state the document's focus to yourself in one sentence: what it covers, for whom, at what altitude, for what purpose, and its non-goals. Infer it from the title, the opening, the existing scope and non-goals sections, and the conversation. This anchor stays fixed unless the user explicitly changes it.

**2. Classify each requested change against the anchor.**
- **In focus**: refines, adds to or corrects something within the anchor. Make the change.
- **Below altitude**: right topic, too much detail for this document. If the user asked for it explicitly, add it compactly where it belongs (their request wins); otherwise keep it at the document's level and mention in one line that the detail belongs in a lower-level doc.
- **Widens scope**: a new goal, feature, audience or problem area the anchor doesn't cover. Don't silently fold it in, and don't silently refuse. A placeholder section ("not yet defined, see open questions") counts as folding it in. If it is small and clearly intended, add it and flag it in one line ("This widens scope from X to also cover Y"). If it would change what the document is about, ask before adding, offering the options in one short message: widen the scope, put it in a separate doc, or record it as a non-goal / open question. Meanwhile make all the in-focus changes.

**3. Integrate, don't append.** Put each addition in the section where it belongs, in the document's terms and structure. Merge with what is already there instead of restating it. Resolve what the change affects elsewhere: an answered open question is removed, a changed number is changed everywhere, a superseded statement is replaced, not kept beside the new one. An edit that only ever makes the document longer is usually wrong; check what the change makes obsolete.

**4. Leave the rest alone.** Text the request doesn't touch stays word for word, unless it now contradicts the change. Don't take an edit request as licence to rewrite, re-style or "improve" other sections; if you see a real problem elsewhere, mention it in one line instead. Untouched text keeps its wording even where it breaks STE. New and changed text follows the language rules in step 3. A request to tighten or rewrite the whole document makes all of it new text, including its sections and headings: a section the gate empties goes, and its heading goes with it.

**5. Run all three alignment passes and the litmus test on the edited document.** In Pass 1 the "ask" is both the new request *and* the document's existing decisions: confirm every requested change is in, and no existing decision changed unintentionally. The one-sentence anchor is the focus that litmus test 7 checks against.

For a **review** or **validation** rather than an edit, use *Validating on request* in step 5.

## Appendix A: Altitudes

Pick the level that matches the document's purpose. Each level answers its own question; lower-level answers are out of scope unless the user asks for them.

| Altitude | Answers | Belongs | Leave out |
|---|---|---|---|
| **Concept / vision** | Why and what, in principle | Problem, intent, core idea, key properties, boundaries, principles, non-goals, major open questions; when it supports a decision: value, main cost drivers and risks, stated qualitatively unless the user gave numbers | Components, data models, APIs, tech choices, UI layout and UI states, estimates, edge-case behaviour, mechanisms (how sync, upload or retry works) |
| **Product / PRD** | What the user gets and why it matters | Users, problems, outcomes, scope, requirements as behaviour, success measures, constraints, non-goals | Architecture, storage, internal APIs, implementation sequence |
| **Architecture** | How the system is shaped | Components and their responsibilities, boundaries, data flow, key interfaces at contract level, trade-offs, chosen vs rejected options, cross-cutting constraints that deviate from default | Function signatures, schemas field-by-field, config values, library minutiae |
| **Design doc / RFC** | How we'll build this one thing and why this way | The key mechanism in depth, alternatives with trade-offs, risks, migration/rollout, relevant concerns (security, scale, compat) only where non-default | Code-level detail the code will document, restated background |
| **Functional / API spec** | Exactly what it does at its boundary | Inputs, outputs, states, rules, errors that matter to the caller, limits, examples | Internal implementation, rationale essays, product pitch |
| **Implementation plan** | Who does what, in which order | Steps in order, dependencies, risks to the plan; for an agent, what each step touches and how it is checked; owners and milestones when people run it | Re-explaining the design |
| **ADR** | What we decided and why | Context (brief), decision, consequences, rejected options in one line each | History of the discussion |
| **Runbook / reference** | How to do or look up X | Exact steps, commands, values, preconditions, how to verify | Background, theory |

### Signals for inferring altitude

- Words the user uses: "concept", "idea", "vision", "high-level" → concept. "Requirements", "user stories" → PRD. "Architecture", "components" → architecture. "Endpoint", "schema", "contract" → functional/API.
- What the existing draft already contains: match its deepest *deliberate* level, not stray details.
- Who reads it: execs and stakeholders read concept/PRD; engineers read architecture and below.

### Mixed documents

Some documents legitimately span two levels (e.g. a PRD with an architecture sketch). Keep each section at one level and make the transition explicit with a section boundary, not a gradual drift.

### Example: same feature, three altitudes

Feature: users can export reports.

- **Concept**: "Users can take their reports out of the product in formats other tools read. Exports reflect what the user sees, including filters. Non-goal: scheduled exports."
- **PRD**: "Users export the current report view as CSV or PDF. The export keeps the active filters and the column order. A report with more than 50k rows exports in the background, and the user gets an email when it is ready. Success: support tickets about exports drop by half."
- **API spec**: "`POST /reports/{id}/exports` body `{format: csv|pdf, filters}` → `202 {exportId}`. `GET /exports/{exportId}` → `{status: pending|ready|failed, url?}`. URL valid 24 h."

Each is complete for its level. None contains the next level's details.

## Appendix B: Cut list

Patterns that add words without information. Delete or replace with the direct statement.

### Openers and meta

- "This document describes / outlines / aims to…" → start with the content.
- "It's important to note that", "It's worth mentioning", "Note that" → state the fact.
- "In today's fast-paced…", "As we all know…" → delete.
- "In summary", "To conclude", "Overall" plus a recap → delete the recap.
- "Let's dive into", "Here's how…" → delete.

### Hedges and intensifiers

- "might potentially", "could possibly", "in some cases may" → decide: state it, or mark it open. Never turn the user's real uncertainty into a fact.
- "very", "really", "highly", "extremely", "critical", "crucial", "key", "robust", "seamless", "comprehensive", "leverage", "utilize" → drop, or replace with a measurable claim.
- "perform an analysis of", "carry out validation", "make a decision" → analyze, validate, decide.
- "set up", "spin up", "kick off", "roll out", "fall back to" → configure, start, begin, release, use.
- "etc." at the end of a list that should be complete → complete the list or say what the rule is.

### Baseline statements (assumed by any competent reader)

- "Ensure the system is secure / scalable / maintainable / performant."
- "Handle errors appropriately." "Validate inputs." "Log important events."
- "Write unit tests." "Follow best practices." "Document the code."
- "The UI should be intuitive / user-friendly."
- "Stakeholders will be kept informed."

Keep only the specific, non-default version: a number, a rule, an exception.

### Structural filler

- Restating the requirement in prose and then again as a bullet.
- A "Background" that repeats what the reader asked for. If one real line of problem is left, title it "Problem" or merge it into the opening.
- Lists of benefits nobody disputes.
- Sections with one sentence that belongs in another section.
- "Future considerations" that weren't requested and decide nothing.
- Rhetorical contrasts ("This isn't just X, it's Y"), dramatic fragments, questions answered immediately ("Why does this matter? Because…").

### Vague → specific

| Vague | Specific |
|---|---|
| "fast" | "p95 < 300 ms" |
| "large files" | "files > 100 MB" |
| "users can manage settings" | "users can change X and Y; Z is admin-only" |
| "integrates with external systems" | "pushes events to Kafka topic `orders`" (only if at API altitude) |
