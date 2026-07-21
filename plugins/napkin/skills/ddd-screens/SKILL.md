---
name: ddd-screens
description: Use when the user wants a screen inventory, a list of screens/pages/views derived from use cases, or UI structure planning in the napkin DDD pipeline — including "what screens do we need", "map the UI", or the step after use cases (and api.md) exist for a project with a human-facing UI. Reads spec/usecases.md + spec/glossary.md + spec/stack.md (+ spec/api.md) and writes spec/screens.md with SC-xxx entries citing the UCs each screen serves. Not visual design or wireframing — the implementing agent does that; for endpoints use ddd-api; for task breakdown use ddd-plan.
---

# DDD Screens

- Derives `spec/screens.md` from the use cases: which screens exist, which UCs each
  serves, and which states it must handle.
- The inventory removes the need for the implementing agent to invent WHAT screens exist
  and what each one shows — the visual design (layout, wireframes, styling) stays with
  the implementing agent.

The artifact grammar is defined once, in
`${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/references/spec-format.md` — read its §1
(cross-cutting rules) and §12 (screens.md) before writing anything.

## Workflow

### 1. Intake

- Read `spec/brief.md` if present — the Pipeline sizing block is the **authoritative
  gate**: `ddd-screens: no` → report "the brief sized this project without a screens
  stage — update the brief's Pipeline sizing first if that changed" and exit without
  writing anything; `yes` or `delta` → proceed, regardless of what stack.md declares
  (a `REST API` or `CLI` stack often has a UI client — web, mobile, admin panel —
  that lives outside this repo's structure and still needs its screens inventoried).
- Read `spec/usecases.md` — required. If absent, route to `ddd-usecases` first.
- Read `spec/glossary.md` — required for `Actor:` values (AL-09 closure).
- Read `spec/stack.md` — app structure (multi-app projects need `App:` per screen) and
  the Auth section (auth plumbing screens are excluded from this artifact). When
  stack.md's `## Structure` lists no UI app, omit `App:` and let `Route:` name the
  client's views. Only when **no sizing declaration exists** does stack.md decide:
  a surface with no human-facing UI at all (a headless library, a data pipeline)
  means ddd-screens does not apply — report that and exit without writing anything.
- Read `spec/api.md` when present — operations named `## API-UC-xxx-internal` serve
  policies and schedules; their UCs get no screen (AL-39 exempts them).
- If `spec/screens.md` exists, read it fully — **delta mode** (step 4).

### 2. Derive screens from use cases

- Group active UCs by actor and primary entity. The default shape per entity an actor
  works with is a **list screen + detail screen pair**; collapse to one screen when the
  entity count or flow is trivial.
- **Command UCs** (actor initiates an action) attach as actions/forms on the screen that
  owns the entity — a standalone form screen only when the flow is multi-step or the
  entry point differs.
- **Read-path UCs** map to the list/detail screen that displays the data.
- One screen serves 1–3 related UCs; a screen citing five UCs is doing too much — split
  it. Never invent a screen that serves no UC (decorative dashboards, "home" pages with
  no requirement behind them) — if the user wants one, that's a new UC first.
- **Plumbing screens** (login, signup, password reset) carry no entry here — the
  implementing agent derives them from stack.md §Auth.
- Every active UC must land in some screen's `Serves:` unless its api.md operation is
  `-internal` — the gate warns (AL-39) about uncovered UCs.

### 3. Write the fields (spec-format §12)

Per screen: `Route:` (path pattern; view name for non-URL UIs), `App:` (multi-app
projects only), `Actor:` (glossary term), `Serves:` (UC ids), `States:` (base
`loading, empty, error, ready` — omit `empty` where the screen can never be empty —
plus domain states), `Navigation:` (`from <SC-ids | entry>; to <SC-ids>`; `entry`
marks nav-bar/deep-link reachability), `Status:`.

Embed the upstream fingerprint for `spec/usecases.md` per spec-format §1.6,
immediately after the artifact marker. Re-embed on every save.

### 4. Delta mode

Apply spec-format §1.4, plus:

- Existing `SC-xxx` ids are immutable; new screens take the next free id. Removed
  screens get `- Status: deprecated` (+ `- Superseded-by:` when replaced), never
  deletion.
- A `delta`-sized brief means touching only screens whose UCs changed; everything else
  is preserved byte-for-byte.

### 5. Gate

Run the **self-correcting exit gate** (ddd-align → "Self-correcting exit gate"): fix
every **error** routed to `screens.md` (AL-38: dangling `Serves:`/`Navigation:` refs,
missing `Serves:`/`States:`; AL-36: status vocabulary; AL-37: missing fingerprint) and
re-run until clean before reporting:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/scripts/check-align.mjs" --spec spec/ --require usecases,screens
```

An **AL-39 warn** (active UC in no screen's `Serves:`) is a real finding, not noise:
either add the UC to a screen, or — when it genuinely has no UI surface — route to
`ddd-api` to mark its operation `-internal`. Name the route in the report; never
silence the warn by inventing a screen.

### 6. Report

```
## Screens report — <project name>

| Screen | Route | Actor | Serves | States |
|--------|-------|-------|--------|--------|
| SC-001 My courses | /me/courses | Student | UC-002 | loading, empty, error, ready |
| SC-002 Course detail | /me/courses/:id | Student | UC-003 | loading, error, ready |

Coverage: N active UCs served by M screens (K exempt via -internal operations)
Entry points: SC-001
Alignment gate: ✅ ok
📄 Saved to spec/screens.md
➡️ Next: run erd-modeler to build the data model (or ddd-plan when the model already exists)
```

In delta mode, add "Screens added / changed / deprecated / preserved" line. The ➡️
pointer is the **last line** of the report — nothing after it.
