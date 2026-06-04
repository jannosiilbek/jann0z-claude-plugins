// intake.mjs — tolerant reader of each skill's "Mechanical intake table".
//
// PLAN.md: "ownership contracts are read from each skill's intake table." Each
// SKILL.md opens with a `## a. Mechanical intake table` whose first table maps
// `Upstream element -> This artifact's element`. The tables are prose-loose in
// cell text, so the contract we extract from them is the SUITE TOPOLOGY: which
// upstream artifact(s) each artifact consumes, and which element CLASSES it
// carries forward. The concrete owned-name sets are derived from the artifacts
// themselves (model.mjs); the intake tables anchor the dependency graph that
// the resolution + staleness checks walk.
//
// The reader is keyed on recognizable COLUMN SEMANTICS: a header row whose first
// column begins with "Upstream" and whose second column is "This artifact's
// element". This matches all six SKILL.md tables as-authored — no marker lines
// required. If a table cannot be located by these semantics, readIntake throws
// (surfaced as a broken-test against the suite model, never silently skipped).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readTables, ParseError } from './md.mjs';

// pipeline order is fixed by PLAN.md §Skills
export const SKILLS = [
  { n: '01', skill: 'event-storming', artifact: '01-event-storming.md' },
  { n: '02', skill: 'glossary', artifact: '02-glossary.md' },
  { n: '03', skill: 'aggregates', artifact: '03-aggregates.md' },
  { n: '04', skill: 'erd', artifact: '04-erd.dbml' },
  { n: '05', skill: 'statecharts', artifact: '05-statecharts/' },
  { n: '06', skill: 'gherkin', artifact: '06-gherkin/' },
];

function isUpstreamHeader(columns) {
  if (columns.length < 2) return false;
  const first = columns[0].toLowerCase();
  const second = columns[1].toLowerCase();
  return first.startsWith('upstream') && second.includes("this artifact's element");
}

// Read one skill's intake table. Returns { skill, rows:[{upstream, element, rule}],
// upstreamRefs:[ '01'|'02'|'03'|'04'|'05'|'domain', ... ] }.
export function readIntake(skillsDir, skill) {
  const path = join(skillsDir, skill, 'SKILL.md');
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (e) {
    throw new ParseError(`intake: cannot read SKILL.md for ${skill}: ${e.message}`);
  }
  const tables = readTables(text);
  const t = tables.find((tb) => isUpstreamHeader(tb.columns));
  if (!t) {
    throw new ParseError(
      `intake: no parseable intake table in ${skill}/SKILL.md ` +
        `(need a row "| Upstream… | This artifact's element | …")`,
    );
  }
  const rows = t.rows
    .filter((r) => r.length >= 2 && (r[0] || r[1]))
    .map((r) => ({ upstream: r[0] || '', element: r[1] || '', rule: r[2] || '' }));
  if (rows.length === 0) {
    throw new ParseError(`intake: empty intake table in ${skill}/SKILL.md`);
  }

  // Discover upstream references mentioned in the table cells. The tables name
  // their inputs as "01", "02", "03", "04", "05", or "domain description".
  const refs = new Set();
  const joined = rows.map((r) => `${r.upstream} ${r.element} ${r.rule}`).join(' ');
  for (const nn of ['01', '02', '03', '04', '05']) {
    if (new RegExp(`\\b${nn}\\b`).test(joined)) refs.add(nn);
  }
  if (/domain description|domain write-up|free-text domain/i.test(joined)) refs.add('domain');

  return { skill, rows, upstreamRefs: [...refs] };
}

// Read all six. Returns Map(skill -> intake). Throws on the first unparseable one.
export function readAllIntakes(skillsDir) {
  const out = new Map();
  for (const s of SKILLS) {
    out.set(s.skill, readIntake(skillsDir, s.skill));
  }
  return out;
}
