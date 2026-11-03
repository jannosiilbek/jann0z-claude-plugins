# Editing, extending or reviewing an existing document

Specs grow by edits, and most bloat and scope creep enter that way. Treat every edit as a change to a focused document, not an append.

**1. Anchor the focus first.** Before changing anything, state the document's focus to yourself in one sentence: what it covers, for whom, at what altitude, for what purpose, and its non-goals. Infer it from the title, the opening, the existing scope and non-goals sections, and the conversation. This anchor stays fixed unless the user explicitly changes it.

**2. Classify each requested change against the anchor.**
- **In focus**: refines, adds to or corrects something within the anchor. Make the change.
- **Below altitude**: right topic, too much detail for this document. If the user asked for it explicitly, add it compactly where it belongs (their request wins); otherwise keep it at the document's level and mention in one line that the detail belongs in a lower-level doc.
- **Widens scope**: a new goal, feature, audience or problem area the anchor doesn't cover. Don't silently fold it in, and don't silently refuse. A placeholder section ("not yet defined, see open questions") counts as folding it in. If it is small and clearly intended, add it and flag it in one line ("This widens scope from X to also cover Y"). If it would change what the document is about, ask before adding, offering the options in one short message: widen the scope, put it in a separate doc, or record it as a non-goal / open question. Meanwhile make all the in-focus changes.

**3. Integrate, don't append.** Put each addition in the section where it belongs, in the document's terms and structure. Merge with what is already there instead of restating it. Resolve what the change affects elsewhere: an answered open question is removed, a changed number is changed everywhere, a superseded statement is replaced, not kept beside the new one. An edit that only ever makes the document longer is usually wrong; check what the change makes obsolete.

**4. Leave the rest alone.** Text the request doesn't touch stays word for word, unless it now contradicts the change. Don't take an edit request as licence to rewrite, re-style or "improve" other sections; if you see a real problem elsewhere, mention it in one line instead. Untouched text keeps its wording even where it breaks STE. New and changed text follows the language rules in SKILL.md step 3. A request to tighten or rewrite the whole document makes all of it new text, including its sections and headings: a section the gate empties goes, and its heading goes with it.

**5. Run all three check passes (SKILL.md step 4) and the litmus test (step 5) on the edited document.** In Pass 1 the "ask" is both the new request *and* the document's existing decisions: confirm every requested change is in, and no existing decision changed unintentionally. The one-sentence anchor is the focus that litmus test 7 checks against.

For a **review** or **validation** rather than an edit, follow `references/validating.md`.
