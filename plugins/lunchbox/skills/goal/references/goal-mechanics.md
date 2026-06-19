# /goal Mechanics and Best Practices

## How the evaluator works

After each Claude turn, a small fast evaluator model (Haiku by default) checks whether the completion condition holds. The evaluator:

- Reads only the **conversation transcript** — it cannot run commands, read files, or access the filesystem independently
- Returns a **yes/no decision plus a short reason**
- On "no": the reason is fed to Claude as the prompt for the next turn
- On "yes": the goal clears automatically and is recorded as achieved

**Critical implication:** Claude must surface proof in the conversation. A condition like "all tests pass" is ambiguous — the evaluator cannot check the filesystem. Claude needs to actually run the test command and show the output. The condition must name the command so Claude knows to run it and print the result.

**Good:** "All tests in `src/auth/` pass — proven by `npm run test:auth` showing zero failures"
**Bad:** "All tests pass" ← evaluator can't verify without seeing the output

## Turn cap guidance

`/goal` has no built-in token or turn budget. A runaway goal loops indefinitely and costs real money.

**Always include a turn cap.** Append `stop after N turns` to every goal:
- Short focused tasks (bug fix, one-file refactor): 10–15 turns
- Medium tasks (feature implementation, migration): 20–30 turns
- Long tasks (large refactor, multi-module migration): 40–60 turns

When in doubt, start conservative (20 turns), then re-run if it falls short.

## /goal + auto mode

The most powerful combination for unattended autonomous work:

1. **Auto mode** (`claude --auto` or toggled in session): removes per-tool-use permission prompts
2. **/goal**: removes per-turn prompts (Claude keeps going without a human reply)

Together: Claude runs completely unattended until the condition is met or the turn cap is hit. Run from a terminal you can leave, or use Remote Control from claude.ai.

Prerequisite: `/goal` requires the trust dialog to have been accepted. It is unavailable when `disableAllHooks` or `allowManagedHooksOnly` is set.

## Best use cases

`/goal` works best when:

- The task has a **binary completion signal** — exit codes, test pass/fail, file count, TypeScript errors = 0
- Work is **multi-step and sequential** — each step depends on the previous (migrations, refactors, test suite fixes)
- The amount of work is **substantial enough to warrant multiple turns** — trivial single-step tasks don't benefit
- The success criterion is **objective** — Claude can verify it without subjective judgment

**Classic strong fits:**
- Migrate all call sites of an old API and make the build green
- Get a failing test suite passing without touching test files
- Refactor a module to stay under N lines per file while keeping all tests passing
- Bring TypeScript strict-mode errors to zero

## Wrong use cases

Do not use `/goal` for:

| Anti-pattern | Why it fails |
|---|---|
| Subjective quality ("make the code cleaner") | Evaluator can't grade style; goal never resolves |
| Open-ended creative work | No binary completion signal |
| Complex multi-objective work | Multiple independent goals → multiple `/goal` runs in sequence |
| Outcomes requiring external measurement (user adoption, business impact) | Evaluator can't access analytics or external systems |
| Tiny one-step tasks | Overhead not worth it; just ask Claude directly |

For multi-part goals, always sequence: run `/goal` for part 1, then `/goal` for part 2 once part 1 is done.

## Comparison: /goal vs alternatives

| Approach | Starts next turn when… | Stops when… | Best for… |
|---|---|---|---|
| `/goal` | Previous turn finishes | Evaluator confirms condition met, or turn cap hit | Objective, measurable completion |
| `/loop` | Time interval elapses | You stop it, or Claude decides done | Polling, periodic checks, monitoring |
| Stop hook | Previous turn finishes | Your own script / prompt decides | Custom evaluation logic |
| Auto mode alone | N/A | Claude judges work done | Single-turn automation without a defined done state |

**Key insight:** `/goal` + auto mode enables fully unattended runs where neither tools nor turns require human approval.
