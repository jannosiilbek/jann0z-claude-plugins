# Data-driven presentation

A presentation is a template: a function from valid data to a view. It owns layout, labels and formatting. The data owns every fact. This is what lets the user re-run the pipeline next month and get a fresh report without touching the template.

## The one test

Swap in a different valid `data.json` (other competitors, other pages, an empty optional list). The view must still be correct with no edits. Before you finish, check the template source: no names, numbers, URLs or findings from this run may appear in it. Section headings and field labels are fine; they come from the shape, not from the data.

Handle the edges in the template:

- optional field absent → show a dash or "n/a", or leave the row out; never "undefined"
- empty list → a short "none" line, not an empty table
- `gaps` → always shown when present, under a clear heading, so unknowns are visible
- `@src` → show confidence next to the claim and link the sources

## Markdown: `render.ts`

Read `data.json`, parse it with the contract (so the template only ever sees valid, typed data), build the Markdown from loops over the data, and write `report.md`.

```ts
import { readFileSync, writeFileSync } from "node:fs";
import Root, { type CompetitorAnalysis } from "./contract.ts";

const d: CompetitorAnalysis = Root.parse(JSON.parse(readFileSync("data.json", "utf8")));

const cell = (v: unknown) => (v === undefined || v === null || v === "" ? "–" : String(v));
const cite = (s: { sources: string[]; confidence: string }) =>
  ` _(${s.confidence}; ${s.sources.map((u, i) => `[${i + 1}](${u})`).join(" ")})_`;

const out: string[] = [];
out.push(`# Competitor analysis`, ``, `As of ${d.asOf}`, ``, `## Verdict`, ``, d.verdict, ``);
out.push(`## Overview`, ``, `| Name | Cheapest seat (USD) |`, `|---|---|`);
for (const c of d.competitors) {
  const prices = c.pricing.map((p) => p.usdSeat).filter((n): n is number => n !== undefined);
  out.push(`| [${c.name}](${c.site}) | ${cell(prices.length ? Math.min(...prices) : undefined)} |`);
}
for (const c of d.competitors) {
  out.push(``, `## ${c.name}`, ``, `**Strengths**`, ``);
  for (const s of c.strengths) out.push(`- ${s.text}${cite(s)}`);
}
if (d.gaps?.length) out.push(``, `## Open questions`, ``, ...d.gaps.map((g) => `- ${g}`));

writeFileSync("report.md", out.join("\n") + "\n");
```

Run `npx -y tsx render.ts`. Don't hand-edit `report.md`; change the template or the data and re-render.

## UI: `view.html`

One self-contained HTML file, no build step. Two ways to get the data in:

- **Inlined** (default; works when opened from disk): a `<script type="application/json" id="data">…</script>` block holding the exact contents of `data.json`. Write a tiny `build-view.ts` (or a step in `render.ts`) that injects `data.json` into a `view.template.html`, so the template file itself stays fact-free.
- **Fetched**: `fetch("data.json")` when the view is served next to the data.

The rendering code reads only from that data object. Build the DOM from loops over the data with `textContent` (not string-built `innerHTML` with raw values), so text from the web can't inject markup.

```html
<script type="application/json" id="data">__DATA__</script>
<main id="app"></main>
<script>
  const d = JSON.parse(document.getElementById("data").textContent);
  const el = (tag, props = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), props);
    n.append(...kids);
    return n;
  };
  const app = document.getElementById("app");
  app.append(el("h1", { textContent: "Competitor analysis" }), el("p", { textContent: `As of ${d.asOf}` }));
  for (const c of d.competitors) {
    app.append(
      el("section", {},
        el("h2", {}, el("a", { href: c.site, textContent: c.name })),
        el("ul", {}, ...c.strengths.map((s) => el("li", { textContent: `${s.text} (${s.confidence})` }))),
      ),
    );
  }
  if (d.gaps?.length) app.append(el("h2", { textContent: "Open questions" }), el("ul", {}, ...d.gaps.map((g) => el("li", { textContent: g }))));
</script>
```

Polish matters for the UI option: a clean type scale, generous spacing, a readable table or card layout, light and dark mode via `prefers-color-scheme`. Pick the layout from the shape: a list of comparable items reads best as a table or cards with the same fields in the same place; a flow (pages and edges) reads best as a diagram or a step list; a time series as a chart. If the project already has a UI stack (React, Vue), the same rules apply to a component that takes the typed data as its only prop.
