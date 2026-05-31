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
gives the user something concrete to react to.

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
