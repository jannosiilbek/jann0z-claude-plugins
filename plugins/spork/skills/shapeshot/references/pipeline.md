# Ingestion pipeline

The pipeline turns raw material into a `data.json` that passes the contract. That is its whole job. It doesn't write reports, summaries or notes; those either have a field in the contract or they don't exist.

## Pick the form

- **Code pipeline (`ingest.ts`)** when the data comes from something code can read: a CSV, a database, an API, a folder of files. Write it as a small script: read, map, validate, write. Re-running it on new input must produce a new valid `data.json` with no edits.
- **Agent pipeline** when you gather the data yourself: web research, reading docs, reviewing a product. Here the "pipeline" is your own work, done in the same four stages, with `scripts/validate.mts` as the gate. You may skip `ingest.ts`.

Either way, let the contract drive what you collect. Work through it field by field: for each list, find items up to its max count; for each field, find the value or leave it empty. Stop collecting when the shape is full. More material than the shape holds is wasted effort.

## Stages

### 1. Gather

Save what you collect in `raw/` (one file per source or query is fine). For every `@src` claim, keep the URL and the time you retrieved it; you'll need both in the data. For files and queries, keep the query or the calculation, because that is the evidence.

### 2. Normalize

Map raw material onto the contract's fields. Rules:

- **Map, don't embellish.** A value must come from the raw material or a calculation on it. If the source doesn't say it, an optional field stays absent, and the question goes into `gaps`. A required field you can't fill is a gap too: put the best honest value (for example, an enum's closest match, with `confidence: "low"`) and name it in `gaps`. Don't invent numbers.
- **Confidence is about the evidence**, not about how sure you feel: `high` = the primary source states it (vendor pricing page, the data itself); `med` = a reliable secondary source; `low` = inferred, dated or one weak source.
- **Normalize formats here, not in the contract**: trim text, convert units and currencies to what the field says, dates to ISO, enum values to the agreed lowercase words.
- **Respect the counts.** If the outline says `3..6` and you found 9 candidates, pick the 6 that best serve the question and drop the rest. If you found 2, that's a gap, not a reason to pad.

### 3. Validate

```
npx -y tsx <skill-dir>/scripts/validate.mts contract.ts data.json
```

It prints `OK`, or one line per failing path, like `competitors[2].pricing[0].usdSeat: Too small: expected number to be >=0`. In `ingest.ts`, use `Root.safeParse(data)` and print the same paths, then exit non-zero on failure.

### 4. Repair

Fix only the paths the validator named. Edit those values in place; don't regenerate `data.json` from scratch, because that throws away values that were already right and can bring new errors. Then validate again.

- An unknown-key error means something tried to add a field. Remove the key. If the information matters, tell the user and offer to extend the shape.
- A count error (`too_small` on a list) means you're short of items: find more, or record the gap and tell the user the shape's count may need to change.
- A cross-field error (`unique`, `→`, `where`) names the rule. Fix the data, not the rule.

Stop after 3 repair rounds. Report the paths that still fail and why. Never loosen the contract to make data pass; changing the contract means changing the agreed shape, and that goes back to the user.

## Code pipeline skeleton

```ts
import { readFileSync, writeFileSync } from "node:fs";
import Root from "./contract.ts";

// 1. Gather
const raw = readFileSync("raw/input.csv", "utf8");

// 2. Normalize: map raw rows onto contract fields, nothing more.
const data = { /* built from raw */ };

// 3. Validate
const r = Root.safeParse(data);
if (!r.success) {
  for (const i of r.error.issues) console.error(`${i.path.join(".") || "(root)"}: ${i.message}`);
  process.exit(1);
}

// 4. Write only valid data
writeFileSync("data.json", JSON.stringify(r.data, null, 2));
console.log("data.json OK");
```
