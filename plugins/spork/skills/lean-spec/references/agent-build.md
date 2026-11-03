# When an AI coding agent builds from the document

An agent can't come back with questions, it fills silence with guesses, and it stops when the work looks done. When the reader is an AI coding agent and the purpose is build, these are *needed for the purpose*, kept at the document's altitude:

- **Local context**: the files, modules, interfaces and existing pattern the work touches or follows, and decisions made in the conversation. Point to them by path or name; don't paste code or restate what the agent can read in the repo.
- **Done check**: acceptance criteria the agent can check itself: testable statements or input → output examples, plus the end-to-end check that proves the whole works. This section is never ceremonial.
- **Boundaries**: what must not change (a public contract, a schema, existing behaviour, dependencies) and what needs human sign-off first. Only rules specific to this work; repo-wide rules (commands, code style, secrets) belong in CLAUDE.md or AGENTS.md.
- **Open questions with an instruction**: each says either *blocking* (leave that part unbuilt) or gives a marked provisional default to build against, so the agent never picks silently.
- **Reasons**: a non-default constraint keeps a one-clause reason when the reason decides cases the document doesn't name.

Anything in these that the user didn't give (a boundary, a provisional default, a structural rule such as "share one implementation") is a proposal: mark it as one, never as a MUST. This covers implementation hints too ("reuse the CSV filter code", "keep chart code separate", "add a test before you change `csv.ts`"): start each with "Proposal:". Leave out repo-wide commands such as `npm test` or lint.
