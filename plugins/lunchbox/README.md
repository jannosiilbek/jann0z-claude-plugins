# lunchbox

Productivity tools for Claude Code workflows.

## Skills

### `/lunchbox:goal [your intent]`

Sharpens a vague intent into a precise completion condition for Claude Code's built-in `/goal` command.

`/goal` runs Claude autonomously across turns until a condition is met. The quality of that condition determines whether Claude reaches the finish line or drifts. This skill runs a short interview (one question at a time, three questions maximum) to get the condition right before you commit to it.

**Example:**

```
/lunchbox:goal add dark mode to the app
```

Claude asks the minimum questions needed to resolve ambiguity, then presents:

```
/goal The /settings page has a dark-mode toggle that persists the choice to localStorage
      under the key `theme` and flips `data-theme` on <html> on load.
```

Copy and run the command to start.

**When to use it:**
- Your intent is clear to you but vague on paper ("fix the tests", "clean up auth")
- You want Claude to work autonomously and need a condition it can self-check
- You've used `/goal` before and found it stalling or overshooting

**When to skip it:**
- Your goal is already specific and verifiable — go straight to `/goal`
