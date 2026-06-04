// dbml.mjs — a CONSTRAINED, hand-rolled, dependency-free reader for the NARROW slice of the
// emitted 04-erd.dbml shape that 09 consumes (simulation.md §1 — "DBML slice-reader, NO
// @dbml/core"). 09 does NOT validate the DBML's full correctness (the erd harness single-owns
// that); it reads exactly two things:
//   (a) the set of `Table <name> { … }` names (snake_case singular) — for binding resolution
//       (A-i / E-d / R-BIND), and
//   (b) the STATUS COLUMN per table — the `<col> <enum>` line whose enum type matches the
//       status-enum family in EITHER style: PascalCase `<Name>Status` OR the REAL emitted
//       snake_case `<name>_status` (the convention 04-erd.dbml actually ships, e.g.
//       `event_status`, `order_status`). Matched case/style-insensitively on the `status`
//       suffix — to classify a table as a LIFECYCLE-bearing entity (Theme D / M-ANNOT /
//       R-AUTH). A PascalCase-only suffix test silently misses the snake_case real schema and
//       leaves the Theme-D authority block empty (a false-green hole).
//
// Pulling in @dbml/core here would (a) double-own DBML validity the erd harness owns and
// (b) break zero-dependency self-containment. A 04 that does not yield the table+status slice
// (unreadable shape) routes to broken-test (§9), never a silent skip.

export class DbmlParseError extends Error {
  constructor(message) { super(message); this.name = 'DbmlParseError'; }
}

// isStatusEnumType — does an enum TYPE name belong to the lifecycle-status family, in EITHER
// the PascalCase `<Name>Status` or the REAL emitted snake_case `<name>_status` style? Keyed to
// the `status` suffix, case/style-insensitive:
//   PascalCase: a `Status` suffix preceded by a name char (`OrderStatus`, `EventStatus`).
//   snake_case: a `_status` suffix preceded by a name segment (`order_status`, `event_status`,
//               `waitlist_offer_status`).
// A bare `Status` / `status` with no name prefix does NOT qualify (it is not a `<name>_status`
// family member). Used to classify a table as lifecycle-bearing (Theme D); a PascalCase-only
// test would silently miss the snake_case real schema (the Defect-2 false-green hole).
export function isStatusEnumType(typeName) {
  const t = String(typeName == null ? '' : typeName);
  if (/[A-Za-z0-9]Status$/.test(t)) return true;          // PascalCase `<Name>Status`
  if (/[a-z0-9]_status$/i.test(t)) return true;            // snake_case `<name>_status`
  return false;
}

// parse(src) → { ok, detail, tables:[name], statusTables: Map(table → statusEnum) }
// `ok:false` ⇒ the emitted slice cannot be read (no `Table <name> { … }` block at all) ⇒
// the harness routes broken-test (§9 case 3, "04 does not yield the table+status slice").
export function parse(src) {
  if (typeof src !== 'string') throw new DbmlParseError('input is not a string');
  // strip block comments /* … */ and line comments // …
  const cleaned = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');

  const tables = [];
  const statusTables = new Map();

  // Match `Table <name> [as <alias>] { … }` blocks. Name may be quoted or schema-qualified;
  // we take the final unqualified, unquoted segment as the table name.
  const tableRe = /\bTable\s+("?)([A-Za-z_][\w.]*)\1(?:\s+as\s+\S+)?\s*\{/g;
  let m;
  while ((m = tableRe.exec(cleaned)) !== null) {
    const rawName = m[2];
    const name = rawName.split('.').pop();
    // find the matching close brace for this block (brace-balanced from the `{`).
    const bodyStart = tableRe.lastIndex;
    let depth = 1;
    let i = bodyStart;
    for (; i < cleaned.length && depth > 0; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') depth--;
    }
    const body = cleaned.slice(bodyStart, i - 1);
    tables.push(name);

    // scan column lines for a status column: `<col> <Type>...` where Type ends in `Status`.
    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      if (/^(indexes|Note|Ref)\b/i.test(line)) continue;
      // a column line is `<col> <type> [settings]`
      const cm = /^("?)([A-Za-z_]\w*)\1\s+([A-Za-z_][\w."]*)/.exec(line);
      if (!cm) continue;
      const colType = cm[3].replace(/"/g, '').split('.').pop();
      if (isStatusEnumType(colType)) {
        // first status column wins (one status column per lifecycle table). Matches BOTH the
        // PascalCase `<Name>Status` and the REAL snake_case `<name>_status` enum convention.
        if (!statusTables.has(name)) statusTables.set(name, colType);
      }
    }
  }

  if (tables.length === 0) {
    return { ok: false, detail: 'no `Table <name> { … }` block found (04 slice unreadable)', tables: [], statusTables };
  }
  return { ok: true, detail: '', tables, statusTables };
}
