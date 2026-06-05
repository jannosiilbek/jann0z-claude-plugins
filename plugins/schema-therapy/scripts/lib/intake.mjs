// intake.mjs — tolerant reader of each skill's "Mechanical intake table".
//
// PLAN.md: "ownership contracts are read from each skill's intake table." Each
// SKILL.md opens its intake table mapping `Upstream element -> This artifact's
// element`. The tables are prose-loose in cell text, so the contract we extract
// from them is the SUITE TOPOLOGY: which upstream artifact(s) each artifact
// consumes, and which element CLASSES it carries forward. The concrete owned-name
// sets are derived from the artifacts themselves (model.mjs); the intake tables
// anchor the dependency graph that the resolution + staleness checks walk.
//
// TOLERANT HEADER DETECTION. Across the eleven skills the intake table's header
// is authored three ways:
//   - `| Upstream… | This artifact's element | … |`        (00,01,02,03,04,05,06,07)
//   - `| Upstream element | → 08 element | Rule |`           (08 task-models)
//   - `| Upstream slice | → 09 obligation |`                 (09 ui-flows)
//   - `| Upstream | What 10 reads | Becomes |`               (10 flow-acceptance)
// The reader recognizes any table whose FIRST column begins with "upstream" and
// whose SECOND column either says "this artifact's element" OR is an arrow-form
// obligation column (`→ …`, "obligation", "becomes", "reads"). If no table can be
// located by these semantics, readIntake throws (surfaced as broken-test).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readTables, ParseError } from './md.mjs';

// pipeline order is fixed by PLAN.md §Skills — the full 0-10 suite.
export const SKILLS = [
  { n: '00', skill: 'impact-map', artifact: '00-impact-map.md' },
  { n: '01', skill: 'event-storming', artifact: '01-event-storming.md' },
  { n: '02', skill: 'glossary', artifact: '02-glossary.md' },
  { n: '03', skill: 'aggregates', artifact: '03-aggregates.md' },
  { n: '04', skill: 'erd', artifact: '04-erd.dbml' },
  { n: '05', skill: 'statecharts', artifact: '05-statecharts/' },
  { n: '06', skill: 'gherkin', artifact: '06-gherkin/' },
  { n: '07', skill: 'personas', artifact: '07-personas.md' },
  { n: '08', skill: 'task-models', artifact: '08-task-models/' },
  { n: '09', skill: 'ui-flows', artifact: '09-ui-flows/' },
  { n: '10', skill: 'flow-acceptance', artifact: '10-flow-acceptance/' },
];

function isUpstreamHeader(columns) {
  if (columns.length < 2) return false;
  const first = columns[0].toLowerCase();
  const second = columns[1].toLowerCase();
  if (!first.startsWith('upstream')) return false;
  if (second.includes("this artifact's element")) return true;
  // arrow-form / prose obligation columns used by 08/09/10
  if (/^→/.test(columns[1].trim())) return true;
  if (/obligation|becomes|reads|element/.test(second)) return true;
  return false;
}

// Read one skill's intake table. Returns { skill, rows:[{upstream, element, rule}],
// upstreamRefs:[ '00'|'01'|…|'09'|'domain'|'intent', ... ] }.
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
        `(need a first column starting "Upstream" with an element/obligation second column)`,
    );
  }
  const rows = t.rows
    .filter((r) => r.length >= 2 && (r[0] || r[1]))
    .map((r) => ({ upstream: r[0] || '', element: r[1] || '', rule: r[2] || '' }));
  if (rows.length === 0) {
    throw new ParseError(`intake: empty intake table in ${skill}/SKILL.md`);
  }

  // Discover upstream references mentioned in the table cells. The tables name
  // their inputs as "00".."09", or the free-text "domain"/"product intent".
  const refs = new Set();
  const joined = rows.map((r) => `${r.upstream} ${r.element} ${r.rule}`).join(' ');
  for (const nn of ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09']) {
    if (new RegExp(`\\b${nn}\\b`).test(joined)) refs.add(nn);
  }
  if (/domain description|domain write-up|free-text domain|domain desc/i.test(joined)) refs.add('domain');
  if (/product intent|free-text product/i.test(joined)) refs.add('intent');

  return { skill, rows, upstreamRefs: [...refs] };
}

// Read all eleven. Returns Map(skill -> intake). Throws on the first unparseable one.
export function readAllIntakes(skillsDir) {
  const out = new Map();
  for (const s of SKILLS) {
    out.set(s.skill, readIntake(skillsDir, s.skill));
  }
  return out;
}
