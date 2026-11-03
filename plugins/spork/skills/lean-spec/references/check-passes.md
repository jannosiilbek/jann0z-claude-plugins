# Check passes 2 and 3: subagent briefs

SKILL.md step 4 says when to run these. This file holds what to give each fresh subagent and what to ask it for.

**Pass 2: independent cold read (fresh reader, inside-out).**
When a subagent tool is available (Agent, Task or similar), you must use it: give a fresh one *only* the document plus one line naming the reader, their role, the purpose and the one-sentence focus. Do not give it the conversation, the user's request, or your Pass 1 list. Ask it to return:
1. A restatement of every requirement, decision and constraint the document makes, one line each.
2. Every point where the document is silent but the reader would have to decide something to do the job, and what it would assume there.
3. Its answers to the 10 litmus questions in SKILL.md step 5 (paste them into the brief), each with the exact text that fails it.

If no subagent is available, do the same yourself as deliberately as you can: write the restatement from the document alone before looking at the request again, then run the litmus test.

Then compare. Every mismatch between the reader's restatement and your Pass 1 list is an alignment bug: the document says something other than what the user meant. Every assumption it had to make is a gap: state the answer if the user gave it, otherwise add an open question. Fix those first, then every litmus failure. Ignore suggestions to add detail below the altitude unless the purpose needs it.

**Pass 3: line audit (fresh auditor, line by line).**
When a subagent tool is available, start another fresh subagent (you can run it at the same time as Pass 2). Give it the user's request word for word (in edit mode, also the original document) and the saved document. Ask it to go through the document sentence by sentence and return, with each sentence quoted:
1. Every sentence that states as decided a rule, behaviour, boundary, non-goal, default or detail that the request does not give and that does not follow necessarily from it, unless the sentence starts with "Proposal:" or "Provisional default:". Small ones count: a status code, a header, the format of a value, which requests count toward a limit, a test step, a layout detail.
2. Every rule, risk, value or decision that the document states in more than one place, including a non-goal that negates a stated rule and a value or summary line that repeats the problem or a principle.
3. Every STE form break outside code, tables and headings: a verb with back, up, down, off, out, over or on; a passive that does not name the actor; "has/have been" or "has/have + participle"; "will" for behaviour; a semicolon; a sentence over 25 words; a requirement or status written as a fragment.
Fix every item: mark it "Proposal:", leave it to the implementer, merge the repeat into one place, or rewrite the sentence. Then re-check the lines you changed. Only if no subagent tool exists, do this audit yourself: read the saved file back, then write the three lists one sentence at a time against the request before you edit.
