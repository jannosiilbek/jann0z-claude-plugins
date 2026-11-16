# Outline notation

The format for showing a data shape to the user. It is built for low noise: a reader sees structure through indentation, and every mark on a line carries meaning. The user agreed on this format; keep to it so shapes look the same every time.

## Line format

```
name  type  constraints  — description
```

- Align the type column with spaces so the shape reads as a table. Two-space indent per level.
- The root line is the shape's name (PascalCase) and, after `—`, what the result is for.
- Descriptions are optional. Add one only when the name alone could be misread. Keep it under about 8 words.

## Marks

| Mark | Meaning | Example |
|---|---|---|
| `name?` | optional field (may be absent) | `usdSeat?  num` |
| `str int num bool` | text, whole number, number, yes/no | `seats  int ≥1` |
| `date datetime` | ISO date / ISO date-time | `asOf  date` |
| `url email slug pct` | formatted text; `pct` is a number 0..100 | `site  url` |
| `a \| b \| c` | one of these values (lowercase, short) | `kind  form \| info \| done` |
| name alone, children below | one nested object | `period` |
| `3..8` `1+` `0+` `5` after a name, no type | list of the child fields below it, with that count | `pricing  1+` |
| `str 0+`, `url 1..3` | list of scalars | `tags  str 0+` |
| `≤140` `≥0` `1..5` after a type | max length / min value / range | `text  str ≤140` |
| `unique` | no two items in the list share this value | `name  str unique` |
| `→ pages.id` | must equal the `id` of an item in that list | `from  → pages.id` |
| `→ features.id 0+` | list of references to items in that list | `features  → features.id 0+` |
| `@src` after a list or field | each value needs evidence: `sources url 1+`, `confidence low \| med \| high`, `retrievedAt datetime` | `strengths  1..5 @src` |
| `where …` | rule across fields, in plain words | `where  every page reachable from entry` |

`@src` keeps evidence out of the way while reading. It always expands to the same three fields, so don't write them out.

## Named shapes: only for reuse

Nest by default. When the same group of fields appears in two or more places, define it once as a named block after the root and refer to it by name with a count:

```
VendorReview
  current     Vendor
  options     Vendor 2..4

Vendor
  name        str
  usdYear     num ≥0
```

Don't split out a named shape that's used once; it makes the reader jump around.

A named shape copies a *structure*: each use holds its own data. When the same *thing* is used in several places (one feature that many products have), make it a top-level list with `id slug unique` and refer to it with `→` instead. See `shaping.md`.

## Change summaries

After the first full outline, show changes only. One line per change, using the dotted path from the root (leave the root name out):

```
+ competitors.share?   pct @src       — market share estimate
- competitors.segment
~ competitors          3..8  →  5
~ verdict              str ≤400  →  str ≤200
```

`+` added, `-` removed, `~` changed (old `→` new). Renames are `~ old.path  →  new.path`. Keep the order: additions, removals, changes.

## Worked example: competitor analysis

```
CompetitorAnalysis  — Pick a note app for a 12-person agency
  question      str                 — the question, as asked
  asOf          date
  competitors   3..6
    name        str unique
    site        url
    segment     smb | mid | ent
    pricing     1+ @src
      tier      str
      usdSeat?  num ≥0              — empty = contact sales
      billing   monthly | annual
    strengths   1..5 @src
      text      str ≤140
    weaknesses  1..5 @src
      text      str ≤140
  verdict       str ≤400
  gaps?         str 0+
```

## Worked example: app page flow

```
SignupFlow  — Onboarding for a B2B invoicing app
  entry         → pages.id
  pages         2..12
    id          slug unique
    title       str ≤40
    kind        form | info | choice | done
    fields?     1+                  — only when kind = form
      name      slug
      input     text | email | password | select | checkbox
      required  bool
    exits       str 1+              — button labels
  edges         1+
    from        → pages.id
    to          → pages.id
    on          str                 — which exit
    when?       str                 — condition, eg plan = team
  where         every page reachable from entry; only kind = done has no edges out
```

## Worked example: data investigation

```
ChurnDrivers  — Why did Q3 trial users not convert
  dataset       str                 — file or table used
  rows          int ≥0
  period
    start       date
    end         date
  drivers       1..6
    factor      str
    effect      pct                 — conversion gap vs. baseline
    evidence    str ≤200            — query or calculation
  gaps?         str 0+
```

No `@src` here: the evidence is a computation on the user's own data, so `evidence` holds the query instead.
