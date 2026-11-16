# Outline to Zod 4 contract

Write `contract.ts` as a line-for-line translation of the agreed outline. The outline is what the user signed; the contract adds no fields, drops none, and keeps names, nesting and counts. If the translation forces a choice the outline didn't make (for example, a number's unit), pick the obvious reading and say so in one line.

Target Zod 4 (`npm i zod@^4`; checked against 4.6). Import as `import * as z from "zod"`. Zod 3 APIs such as `z.string().url()`, `.email()` on strings, `.passthrough()` and `.strict()` are legacy or deprecated in v4; use the forms below.

## Mapping

| Outline | Zod 4 |
|---|---|
| object (name with children) | `z.strictObject({...})` |
| `name?` | `.optional()` |
| `str` | `z.string().min(1)` (empty text is almost never a real value) |
| `int` / `num` / `bool` | `z.int()` / `z.number()` / `z.boolean()` |
| `date` / `datetime` | `z.iso.date()` / `z.iso.datetime({ offset: true })` |
| `url` / `email` | `z.url()` / `z.email()` |
| `slug` | `z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)` |
| `pct` | `z.number().min(0).max(100)` |
| `a \| b \| c` | `z.enum(["a", "b", "c"])` |
| `3..8` on a list | `z.array(X).min(3).max(8)` |
| `1+` / `0+` / `5` | `.min(1)` / no bound / `.length(5)` |
| `str ≤140` / `num ≥0` | `.max(140)` / `.min(0)` |
| `unique` | check in the root `.superRefine()` |
| `→ pages.id` | check in the root `.superRefine()` |
| `where …` | check in the root `.superRefine()` |
| `@src` | `.extend(Source.shape)` on the item (see template) |
| `— description` | `.describe("...")` on the field |
| named shape / root | `.meta({ id, title, description })` |

## Rules

- **Strict everywhere.** `z.strictObject` rejects unknown keys, so an ingest step that invents an extra field fails loudly. `.extend()` keeps it strict.
- **One `superRefine` on the root** for all cross-field rules (`unique`, `→`, `where`). Every `ctx.addIssue` gets `code: "custom"`, a message that names the rule, and a `path` to the exact failing item, so repair can target it. Zod runs refinements only after the field checks pass, so a run can show new issues once the field issues are fixed. That's expected.
- **Metadata.** `.meta({ id, title, description })` on the root and on any named shape; the `id` becomes a `$defs` entry in the JSON Schema. Add `examples` only when the format of a value isn't obvious from its type. Use `.describe()` for field descriptions from the outline. Don't write descriptions the outline didn't have just to fill space.
- **Exports.** Export the root schema as a named export and as `default`, plus `export type X = z.infer<typeof X>`. `scripts/validate.mts` picks the default export.
- **JSON Schema.** Emit `contract.schema.json` with `z.toJSONSchema(Root)`. Keep the emit step in a tiny `emit.ts` (or at the end of `ingest.ts`), not as a side effect of importing the contract.
- **No transforms.** No `.transform()`, `.default()` or `.coerce` in the contract: the contract checks data, it doesn't change it. Normalizing belongs in the pipeline. (This also keeps `z.toJSONSchema()` exact.)

## Template

For this outline:

```
CompetitorAnalysis  — Pick a note app for a 12-person agency
  asOf          date
  competitors   3..6
    name        str unique
    site        url
    pricing     1+ @src
      tier      str
      usdSeat?  num ≥0              — empty = contact sales
    strengths   1..5 @src
      text      str ≤140
  verdict       str ≤400
  gaps?         str 0+
```

```ts
import * as z from "zod";

// Evidence for every @src item. Same three fields everywhere.
export const Source = z.strictObject({
  sources: z.array(z.url()).min(1).describe("Where the claim comes from"),
  confidence: z.enum(["low", "med", "high"]),
  retrievedAt: z.iso.datetime({ offset: true }),
});

const Strength = z.strictObject({ text: z.string().min(1).max(140) }).extend(Source.shape);

const Competitor = z.strictObject({
  name: z.string().min(1),
  site: z.url(),
  pricing: z
    .array(
      z
        .strictObject({
          tier: z.string().min(1),
          usdSeat: z.number().min(0).optional().describe("Empty = contact sales"),
        })
        .extend(Source.shape),
    )
    .min(1),
  strengths: z.array(Strength).min(1).max(5),
});

export const CompetitorAnalysis = z
  .strictObject({
    asOf: z.iso.date(),
    competitors: z.array(Competitor).min(3).max(6),
    verdict: z.string().min(1).max(400),
    gaps: z.array(z.string().min(1)).optional(),
  })
  .superRefine((d, ctx) => {
    // unique: competitors.name
    const seen = new Set<string>();
    d.competitors.forEach((c, i) => {
      if (seen.has(c.name))
        ctx.addIssue({ code: "custom", message: `unique: duplicate name "${c.name}"`, path: ["competitors", i, "name"] });
      seen.add(c.name);
    });
  })
  .meta({
    id: "CompetitorAnalysis",
    title: "Competitor analysis",
    description: "Pick a note app for a 12-person agency",
  });

export type CompetitorAnalysis = z.infer<typeof CompetitorAnalysis>;
export default CompetitorAnalysis;
```

`emit.ts`:

```ts
import * as z from "zod";
import { writeFileSync } from "node:fs";
import { CompetitorAnalysis } from "./contract.ts";

writeFileSync("contract.schema.json", JSON.stringify(z.toJSONSchema(CompetitorAnalysis), null, 2));
```

Run with `npx -y tsx emit.ts`. If the folder has no `zod`, install it there first: `npm i zod@^4` (and `npm i -D tsx` if you prefer it local).

## Reference checks (`→`) and `where` rules

```ts
.superRefine((d, ctx) => {
  const ids = new Set(d.pages.map((p) => p.id));
  if (!ids.has(d.entry)) ctx.addIssue({ code: "custom", message: "→ pages.id: entry is not a page id", path: ["entry"] });
  d.edges.forEach((e, i) => {
    for (const end of ["from", "to"] as const)
      if (!ids.has(e[end]))
        ctx.addIssue({ code: "custom", message: `→ pages.id: unknown page "${e[end]}"`, path: ["edges", i, end] });
  });
  // where: every page reachable from entry
  const reach = new Set([d.entry]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const e of d.edges) if (reach.has(e.from) && !reach.has(e.to)) { reach.add(e.to); grew = true; }
  }
  d.pages.forEach((p, i) => {
    if (!reach.has(p.id))
      ctx.addIssue({ code: "custom", message: `where: page "${p.id}" is not reachable from entry`, path: ["pages", i, "id"] });
  });
})
```

Each `where` clause in the outline gets its own check and its own message prefix, so a failing rule is easy to trace back to the line the user agreed.
