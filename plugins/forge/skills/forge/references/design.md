# Design — impeccable drives it, landing page first

All UI/design work goes through the **impeccable** skill. forge does not design; it *sequences*
design into the build and points impeccable at the right spec inputs. The build invokes impeccable
(via the superpowers handoff) — forge itself writes no UI.

## Inputs impeccable reads
- `spec/product.md` — value proposition, target segment, scope, pricing → what the product *is* and
  what to sell on the landing page.
- `spec/personas.md` — actors, jobs-to-be-done, goals, pains → who the UI and landing page speak to.
- `spec/glossary.md` — the words the UI must use (labels match domain language).
- relevant `spec/features/**` — the flows each screen serves.

## Outputs impeccable produces (once, up front)
- **`spec/DESIGN.md`** — the design system / visual language: voice, layout principles, component
  inventory, states (empty/loading/error), accessibility and responsive rules.
- **Design tokens** — colors, typography, spacing, radii, motion — emitted into `packages/ui` (the
  Tailwind/shadcn theme) so every app consumes one token source.
- *(optionally)* a design-framed **`PRODUCT.md`** view if the product framing needs a design-oriented restatement.

These are generated at **step 11** of the build (after the backend-complete checkpoint), so design
sits on a proven foundation rather than guesswork.

## Landing page first
The **first UI built is the landing page** (step 12) — product- and persona-aware, on the fresh
tokens. Rationale: it's the cheapest full-stack slice that exercises the design system end to end and
gives the user something concrete to react to. The landing page slice also stands up two reusable
bases that every later screen inherits — the **design guide** and the **error/empty/loading UI base**
— so the foundation is right from the start rather than retrofitted.

## Design guide route (`/design-guide`)
A **hidden, unlinked route** (`/design-guide`) — excluded from nav/sitemap, optionally env-gated to
non-prod — that renders the **living component gallery**, built via impeccable on the same tokens:
- **Every shadcn/ui component** the app uses, in all its states.
- **All main app components, including charts**, with realistic sample data.
- A **theme switcher** (light/dark + any token themes) so every component is validated across themes
  in one place.

It exists to **validate the design system while previewing the landing page** — a single surface to
eyeball that tokens, components, and charts render correctly and theme-switch cleanly. Treat it as a
living contract: a component that ships must appear here. impeccable authors and governs it.

## Error / empty / loading UI base (DRY, set up first)
With the landing page, establish the **reusable state-handling base** so it's never reinvented per
screen:
- One **toast** system + one **error boundary** + shared **error / empty / loading** state components,
  all in `packages/ui`, themed by the tokens and shown in `/design-guide`.
- A **single mapping** from the app's typed errors (the error model in `architecture.md`) to
  user-facing toasts/messages — no ad-hoc `try/catch`-and-alert scattered across components.
- Every later screen (steps 13+) **reuses** this base; impeccable checks each surface handles
  error/empty/loading through it. This is the DRY error-handling foundation, set right at the beginning.

## ▸ STOP to validate
After the landing page, the build **stops** and shows the user: landing page + working backend/MCP.
The user validates stack, design direction, and product direction **before** the full UI is built.
This is a hard gate in `build-order.md`.

## Consistency loop (steps 13+)
- Every subsequent screen is built **through impeccable** against the same `DESIGN.md` + tokens — no
  ad-hoc styling, no divergent components.
- New components extend the shared `packages/ui` set; they don't fork it.
- Copy uses glossary terms verbatim.
- impeccable reviews each surface for hierarchy, states, accessibility, and responsive behavior before
  it's considered done.

The blueprint records this as: *"All UI via impeccable; tokens in packages/ui are the single design
source; landing page first; STOP-to-validate before the rest of the UI."*
