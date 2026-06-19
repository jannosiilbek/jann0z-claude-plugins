---
name: goal
description: Sharpens a vague intent into a precise, self-checkable completion condition for Claude Code's built-in /goal command, through a focused interview (one question at a time, max five), then outputs the ready-to-run /goal command.
argument-hint: "[your rough intent or goal]"
disable-model-invocation: true
---

# Goal Sharpener

Turn a rough intent — "add dark mode", "fix the login flow", "clean up the auth code" — into a
precise **completion condition** ready for Claude Code's `/goal` command. `/goal` runs Claude
autonomously across turns until the condition is met; a vague condition stalls or loops, a sharp
one reaches the finish line.

## What makes a strong completion condition

Score every candidate on five dimensions. A condition is ready only when all five are clear:

| Dimension | The question it answers | Failure signals |
|-----------|------------------------|----------------|
| **Specific** | Names exact files, features, or behaviors? | "improve", "fix", "better", "clean up" with no concrete referent |
| **Verifiable** | Can Claude confirm done-ness without the user? | No observable outcome, no test, no behavioral assertion |
| **Scoped** | Is the boundary explicit? | "everything", "the whole app", open-ended rewrites |
| **Outcome-stated** | Describes end state, not work? | "implement X" instead of "X works / X exists / X passes" |
| **Provable** | Does it name the command or signal Claude runs and shows to prove it? | "tests pass" with no named command; state only readable by inspecting files (the evaluator can't do that) |

The **Provable** dimension is the least obvious. `/goal`'s evaluator runs after each turn and reads only the conversation transcript — it cannot run commands or read files independently. Claude must surface the proof in the conversation. If no command is named, Claude may never demonstrate completion in a way the evaluator can see.

**Strong examples (full template):**
- "All unit tests under `src/auth/` pass — proven by `npm run test:auth` showing zero failures; no files outside `src/auth/` modified; stop after 15 turns."
- "The `/settings` page has a dark-mode toggle that persists to `localStorage[theme]` and flips `data-theme` on `<html>` — proven by `npm run build` succeeding; stop after 20 turns."
- "Every call site of `db.query()` migrated to `db.queryNormalized()` and TypeScript compiler exits clean — proven by `tsc --noEmit` showing zero errors; stop after 30 turns."

**Weak examples — and why:**
- "Improve the codebase" — not specific, not verifiable, not scoped
- "Implement dark mode" — process language; what does done look like?
- "Fix the tests" — which tests, what does fixed mean, what command proves it?

## Workflow

### 1. Intake

Use the argument the user supplied as the raw input. If no argument was given, ask:

> "What do you want to work toward?"

Score the raw input on all five dimensions without narrating the scoring in your reply.

### 2. Interview — one question at a time, max five questions across dimensions

If any dimension fails, ask ONE targeted question. Pick the highest-priority failure in this order:

1. **Verifiable** — without this, Claude has no stop condition
2. **Provable** — without a named command, the evaluator may never see proof
3. **Specific** — vague subjects make verification impossible
4. **Scoped** — unbounded goals stall or sprawl
5. **Outcome-stated** — rephrase process language once the first four are settled

After each answer, re-score all five dimensions. Stop as soon as all five pass or after five questions total.

**Question bank — one sentence, no preamble:**

*Verifiable:*
> "How will Claude know the goal is reached — what's the observable check or passing test?"
> "What should Claude see, run, or read to confirm it's done?"

*Provable:*
> "What command should Claude run to prove it's done — e.g., `npm test`, `cargo build`, `python -m pytest`?"
> "What command output should appear in the conversation for the goal to count as met?"

*Specific:*
> "Which specific [file / function / page / endpoint / test suite] exactly?"
> "What does '[vague word]' mean in concrete terms here?"

*Scoped:*
> "What's explicitly out of scope — what should Claude leave untouched?"

*Outcome-stated:*
> "What does the finished state look like, rather than the work that needs to happen?"

### 3. Turn bound — always ask this

Regardless of how sharp the goal already is, always close the interview with:

> "How many turns should Claude stop after if it hasn't finished? (10–30 is typical; default is 20)"

Accept the user's number, or use 20 if they say "default" or don't know.

### 4. Synthesize the refined goal

Build the completion condition using this template:

```
[outcome / end state] — proven by [stated check]; [constraints if any]; stop after N turns.
```

Rules:
- Write the outcome in done-state language (present-state assertion or past-tense achievement)
- Name the exact command in "proven by" — this is what Claude will run and show in the transcript
- Include constraints only if the user stated them; omit the constraint clause if none
- Always end with the turn cap

### 5. Confirm

Present the draft and ask for one-word sign-off:

> **Refined goal:**
> "[draft text]"
>
> Ready to launch? (yes / adjust)

If the user adjusts, incorporate the change and re-present. One round of revision is usually enough.

### 6. Launch

Once confirmed, output the command in a code block and nothing else:

```
/goal [refined goal text]
```

Follow it with this line (emit to the user):

> Copy and run the command above.

No explanations, no summaries, no next-steps — the command is the entire output.

## Edge cases

**Already sharp input:** If all five dimensions pass on the raw input, skip the dimension interview and go straight to step 3 (turn bound). Always ask the turn-bound question.

**User declines to answer a question:** Accept the ambiguity, note which dimension remains open, proceed to synthesis anyway, and surface the gap in the draft so the user can correct it.

**No obvious proof command:** If the work has no runnable test command (e.g., documentation, configuration), use a file-check proxy: "proven by Claude reading the updated file aloud and confirming it matches the spec". Make this explicit in the goal text.

**Multi-part goal:** If the input describes several independent outcomes, surface the ambiguity early:
> "I see two distinct goals here — one condition covering both, or two separate `/goal` runs?"
Split only if the user chooses to. Each `/goal` run should have one primary completion check.

**Scope creep during answers:** If answers keep expanding the goal, redirect once:
> "We're growing the scope — is this all one goal, or should we pick a smaller slice first?"

**Wrong tool:** If the goal is clearly subjective ("make the code elegant", "improve readability") or requires external measurement (user adoption, analytics), flag it:
> "This is hard to verify mechanically — `/goal` works best with a binary signal like a passing command. Want to reframe it, or proceed as-is?"

## References

- **`references/goal-mechanics.md`** — evaluator model detail, turn cap guidance, /goal + auto mode combination, best/wrong use cases, comparison table (/goal vs /loop vs auto mode)
