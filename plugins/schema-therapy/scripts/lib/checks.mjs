// checks.mjs — the three MECHANICAL cross-artifact check classes the suite-drift
// script owns (PLAN.md "Plugin-level drift police" 1-3; the §4 semantic check is
// the agent's, not here):
//   1. Resolution — every upstream-owned name used downstream resolves by EXACT
//      string match to exactly one owner.
//   2. DRY — no artifact restates content owned by an upstream artifact.
//   3. Staleness — recompute sha256 of each consumed input; a mismatch is a
//      `stale` finding (class within `fail`) against the downstream artifact.
//
// Each check returns findings: { id, class, status:'pass'|'fail',
// reason, severity, detail, files:[...] }. The harness aggregates + reconciles.

import { createHash } from 'node:crypto';
import {
  parse01, parse02, parse03, parse04dbml, parse04transitions,
  parse05scxml, parse06feature,
} from './model.mjs';

export const SEV = { error: 'error', warn: 'warn', info: 'info' };

// transform a 01 event string to the 05 pinned event-attr form
export function eventAttr(s) {
  return s.toLowerCase().replace(/\s+/g, '_');
}

export function sha256(text) {
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

// Build the full suite model from discovered artifacts. Throws ParseError on a
// genuinely unreadable pinned shape (=> malformed).
export function buildModel(art) {
  const m = {};
  if (art['01']) m.m01 = parse01(art['01'].text);
  if (art['02']) m.m02 = parse02(art['02'].text);
  if (art['03']) m.m03 = parse03(art['03'].text);
  if (art['04dbml']) m.m04 = parse04dbml(art['04dbml'].text);
  if (art['04trans']) m.m04t = parse04transitions(art['04trans'].text);
  m.m05 = (art['05'] || []).map((f) => ({ stem: f.stem, path: f.path, ...parse05scxml(f.text) }));
  m.m06 = (art['06'] || []).map((f) => ({ stem: f.stem, path: f.path, ...parse06feature(f.text) }));
  return m;
}

// =============================================================================
// RESOLUTION CHECKS (class: resolution)
// =============================================================================
// Each is a closed, named check. A check with ZERO edges to walk records edges:0
// (the harness's reconciliation refuses a suite where nothing resolved).

export function resolutionChecks(m, art) {
  const out = [];
  const F = (id, status, detail, files, reason, edges) =>
    out.push({ id, class: 'resolution', status, reason: reason || null, severity: status === 'fail' ? 'error' : null, detail: detail || null, files: files || [], edges: edges || 0 });

  // ---- R-02-enum-derivation: each 02 enum derivation string ∈ 01 events ----
  if (m.m02 && m.m01) {
    const events = new Set(m.m01.events);
    let edges = 0; const bad = [];
    for (const [name, vals] of m.m02.enums) {
      for (const v of vals) {
        if (!v.derivedFrom) continue;
        edges++;
        if (!events.has(v.derivedFrom)) bad.push(`${name}.${v.value} -> "${v.derivedFrom}"`);
      }
    }
    F('R-02-enum-derivation', bad.length ? 'fail' : 'pass',
      bad.length ? `02 enum derivation strings not found verbatim among 01 events: ${bad.join('; ')}` : null,
      ['02-glossary.md', '01-event-storming.md'], 'dangling-derivation', edges);
  }

  // ---- R-02-term-owns-01: each Term owning a 01 element resolves ----
  if (m.m02 && m.m01) {
    const events = new Set(m.m01.events);
    const actors = new Set(m.m01.actors);
    const aggs = new Set(m.m01.aggregates);
    let edges = 0; const bad = [];
    for (const t of m.m02.terms) {
      if (!t.ownsO1 || !t.ownedElement) continue;
      edges++;
      if (!events.has(t.ownedElement) && !actors.has(t.ownedElement) && !aggs.has(t.ownedElement))
        bad.push(`${t.term} -> "${t.ownedElement}"`);
    }
    F('R-02-term-owns-01', bad.length ? 'fail' : 'pass',
      bad.length ? `02 Term 'Owns 01 element' cells not found among 01 events/actors/aggregates: ${bad.join('; ')}` : null,
      ['02-glossary.md', '01-event-storming.md'], 'dangling-owner', edges);
  }

  // ---- R-03-heading-biject: 03 ### headings biject with 01 skeleton headings ----
  if (m.m03 && m.m01) {
    const skel = new Set(m.m01.aggregates);
    let edges = 0; const bad = [];
    for (const a of m.m03.aggregates) { edges++; if (!skel.has(a)) bad.push(`03 ### ${a} has no 01 skeleton`); }
    for (const a of m.m01.aggregates) { if (!m.m03.aggregates.includes(a)) bad.push(`01 skeleton ${a} has no 03 ### heading`); }
    F('R-03-heading-biject', bad.length ? 'fail' : 'pass',
      bad.length ? `03 aggregate headings do not biject with 01 skeletons: ${bad.join('; ')}` : null,
      ['03-aggregates.md', '01-event-storming.md'], 'heading-bijection', edges);
  }

  // ---- R-03-policy-source-event: policy Source events ∈ 01 events ----
  if (m.m03 && m.m01) {
    const events = new Set(m.m01.events);
    let edges = 0; const bad = [];
    for (const p of m.m03.policies) {
      if (!p.sourceEvent) continue;
      edges++;
      if (!events.has(p.sourceEvent)) bad.push(`${p.name} Source event "${p.sourceEvent}"`);
    }
    F('R-03-policy-source-event', bad.length ? 'fail' : 'pass',
      bad.length ? `03 policy Source events not found among 01 events: ${bad.join('; ')}` : null,
      ['03-aggregates.md', '01-event-storming.md'], 'dangling-policy-source', edges);
  }

  // ---- R-03-boundary-term: 03 '02 Term' cells ∈ 02 Terms ----
  if (m.m03 && m.m02) {
    const terms = new Set(m.m02.terms.map((t) => t.term));
    let edges = 0; const bad = [];
    for (const bt of m.m03.boundaryTerms) { edges++; if (!terms.has(bt)) bad.push(bt); }
    F('R-03-boundary-term', bad.length ? 'fail' : 'pass',
      bad.length ? `03 boundary '02 Term' cells not found among 02 Terms: ${bad.join('; ')}` : null,
      ['03-aggregates.md', '02-glossary.md'], 'dangling-boundary-term', edges);
  }

  // ---- R-03-ref-target: 03 References target aggregates ∈ 03 roots ----
  if (m.m03) {
    const aggs = new Set(m.m03.aggregates);
    let edges = 0; const bad = [];
    for (const rt of m.m03.refTargets) { edges++; if (!aggs.has(rt)) bad.push(rt); }
    F('R-03-ref-target', bad.length ? 'fail' : 'pass',
      bad.length ? `03 References target aggregates not found among 03 roots: ${bad.join('; ')}` : null,
      ['03-aggregates.md'], 'dangling-ref-target', edges);
  }

  // ---- R-04-enum-verbatim: 04 DBML enums match 02 enums verbatim + order ----
  if (m.m04 && m.m02) {
    // 02 EnumName -> snake_case dbml name mapping by value-set; we compare by
    // matching each 02 enum to the dbml enum named snake_case(EnumName).
    let edges = 0; const bad = [];
    for (const [name, vals] of m.m02.enums) {
      const dname = toSnake(name);
      edges++;
      const dvals = m.m04.enums.get(dname);
      if (!dvals) { bad.push(`02 enum ${name} -> no DBML enum ${dname}`); continue; }
      const exp = vals.map((v) => v.value);
      if (exp.length !== dvals.length || exp.some((v, i) => v !== dvals[i]))
        bad.push(`enum ${dname}: 02=[${exp.join(',')}] dbml=[${dvals.join(',')}]`);
    }
    F('R-04-enum-verbatim', bad.length ? 'fail' : 'pass',
      bad.length ? `04 DBML enums do not match 02 enums verbatim+order: ${bad.join('; ')}` : null,
      ['04-erd.dbml', '02-glossary.md'], 'enum-mismatch', edges);
  }

  // ---- R-04-table-from-root: every 03 root resolves to a 04 table ----
  if (m.m04 && m.m03) {
    const tables = new Set(m.m04.tableNames);
    let edges = 0; const bad = [];
    for (const a of m.m03.aggregates) { edges++; if (!tables.has(toSnake(a))) bad.push(`03 root ${a} -> no table ${toSnake(a)}`); }
    F('R-04-table-from-root', bad.length ? 'fail' : 'pass',
      bad.length ? `03 roots without a 04 table: ${bad.join('; ')}` : null,
      ['04-erd.dbml', '03-aggregates.md'], 'missing-table', edges);
  }

  // ---- R-04-trans-event: 04 transition Events ∈ 02 derivation strings ----
  if (m.m04t && m.m02) {
    const deriv = new Set();
    for (const [, vals] of m.m02.enums) for (const v of vals) if (v.derivedFrom) deriv.add(v.derivedFrom);
    let edges = 0; const bad = [];
    for (const [ent, rows] of m.m04t.entities) {
      for (const r of rows) {
        if (!r.event) continue;
        edges++;
        if (!deriv.has(r.event)) bad.push(`${ent}: "${r.event}"`);
      }
    }
    F('R-04-trans-event', bad.length ? 'fail' : 'pass',
      bad.length ? `04 transition Events not found among 02 derivation strings: ${bad.join('; ')}` : null,
      ['04-transitions.md', '02-glossary.md'], 'dangling-transition-event', edges);
  }

  // ---- R-05 checks: states ∈ 02 enum values, 01-event annots ∈ 01, supersedes ∈ 04 ----
  if (m.m05.length) {
    // map a 05 stem to its 02 enum: stem 'event' -> EventStatus
    const enumByEntity = new Map();
    if (m.m02) for (const [name, vals] of m.m02.enums) {
      const ent = toSnake(name.replace(/Status$/, ''));
      enumByEntity.set(ent, new Set(vals.map((v) => v.value)));
    }
    const events01 = m.m01 ? new Set(m.m01.events) : null;
    const tables04 = m.m04 ? new Set(m.m04.tableNames) : null;
    const transEntities = m.m04t ? new Set([...m.m04t.entities.keys()]) : null;

    let eState = 0, eAnnot = 0, eSup = 0;
    const badState = [], badAnnot = [], badSup = [];
    for (const sc of m.m05) {
      const allStates = [...sc.stateIds, ...sc.finalIds];
      const owned = enumByEntity.get(sc.stem);
      for (const s of allStates) {
        eState++;
        if (owned && !owned.has(s)) badState.push(`${sc.stem}.scxml state '${s}' not a 02 ${sc.stem} enum value`);
      }
      for (const tr of sc.transitions) {
        if (tr.annot && events01) {
          eAnnot++;
          if (!events01.has(tr.annot)) badAnnot.push(`${sc.stem}.scxml 01-event '${tr.annot}' not a 01 event`);
          else if (eventAttr(tr.annot) !== tr.event) badAnnot.push(`${sc.stem}.scxml event '${tr.event}' does not round-trip from '${tr.annot}'`);
        }
      }
      if (sc.supersedes) {
        eSup++;
        // supersedes target: 04-transitions.md#<entity>; entity must be a 04 table + transition entity
        const mm = /#([A-Za-z0-9_]+)\s*$/.exec(sc.supersedes);
        const ent = mm ? mm[1] : null;
        if (!ent) badSup.push(`${sc.stem}.scxml malformed supersedes '${sc.supersedes}'`);
        else {
          if (transEntities && !transEntities.has(ent)) badSup.push(`${sc.stem}.scxml supersedes '#${ent}' has no 04 transition table`);
          if (tables04 && !tables04.has(ent)) badSup.push(`${sc.stem}.scxml supersedes '#${ent}' has no 04 table`);
        }
      }
    }
    F('R-05-state-enum', badState.length ? 'fail' : 'pass',
      badState.length ? badState.join('; ') : null, ['05-statecharts/', '02-glossary.md'], 'dangling-state', eState);
    F('R-05-event-annot', badAnnot.length ? 'fail' : 'pass',
      badAnnot.length ? badAnnot.join('; ') : null, ['05-statecharts/', '01-event-storming.md'], 'dangling-or-nonroundtrip-annot', eAnnot);
    F('R-05-supersedes', badSup.length ? 'fail' : 'pass',
      badSup.length ? badSup.join('; ') : null, ['05-statecharts/', '04-erd.dbml'], 'dangling-supersedes', eSup);
  }

  // ---- R-06 tag resolution: INV ids ∈ 03, entities ∈ 04, policies ∈ 03 ----
  //      + When-embedded event strings ∈ authoritative sources
  if (m.m06.length) {
    const invs = m.m03 ? new Set(m.m03.invariants) : new Set();
    const policies = m.m03 ? new Set(m.m03.policies.map((p) => p.name)) : new Set();
    const tables04 = m.m04 ? new Set(m.m04.tableNames) : new Set();
    const events01 = m.m01 ? new Set(m.m01.events) : new Set();
    // authoritative event strings: 01 events carried in 04 transition Event cells
    const authEvents = new Set();
    if (m.m04t) for (const [, rows] of m.m04t.entities) for (const r of rows) if (r.event) authEvents.add(r.event);

    let eTag = 0, eWhen = 0;
    const badTag = [], badWhen = [];
    for (const ft of m.m06) {
      for (const sc of ft.scenarios) {
        if (sc.tag) {
          eTag++;
          const tag = sc.tag;
          if (tag.startsWith('invariant:')) {
            const id = tag.slice('invariant:'.length);
            if (!invs.has(id)) badTag.push(`${ft.stem}.feature @invariant:${id} not a 03 invariant`);
          } else if (tag.startsWith('policy:')) {
            const id = tag.slice('policy:'.length);
            if (!policies.has(id)) badTag.push(`${ft.stem}.feature @policy:${id} not a 03 policy`);
          } else if (tag.startsWith('transition:') || tag.startsWith('terminal:')) {
            const id = tag.split(':')[1];
            if (!tables04.has(id)) badTag.push(`${ft.stem}.feature @${tag} entity '${id}' not a 04 table`);
          } else {
            badTag.push(`${ft.stem}.feature unknown tag namespace @${tag}`);
          }
        }
        // When-embedded event strings: a transition/policy When must contain an
        // authoritative 01 event string verbatim as a substring.
        if (sc.tag && (sc.tag.startsWith('transition:') || sc.tag.startsWith('policy:'))) {
          for (const w of sc.whenLines) {
            eWhen++;
            const hit = [...authEvents, ...events01].some((ev) => w.includes(ev));
            if (!hit) badWhen.push(`${ft.stem}.feature When has no authoritative event string: "${w}"`);
          }
        }
      }
    }
    F('R-06-tag', badTag.length ? 'fail' : 'pass',
      badTag.length ? badTag.join('; ') : null, ['06-gherkin/', '03-aggregates.md'], 'dangling-tag', eTag);
    F('R-06-when-event', badWhen.length ? 'fail' : 'pass',
      badWhen.length ? badWhen.join('; ') : null, ['06-gherkin/', '01-event-storming.md'], 'dangling-when-event', eWhen);
  }

  return out;
}

// =============================================================================
// DRY CHECKS (class: dry)
// =============================================================================
// Mechanical subset: (a) shape-detection of upstream-owned table shapes appearing
// downstream; (b) >=N-token verbatim windows of upstream rule/definition text.

const DRY_TOKEN_WINDOW = 8;

export function dryChecks(m, art) {
  const out = [];
  const F = (id, status, detail, files, edges) =>
    out.push({ id, class: 'dry', status, reason: status === 'fail' ? 'restated-shape' : null, severity: status === 'fail' ? 'error' : null, detail: detail || null, files: files || [], edges: edges || 0 });

  // ---- DRY-shape: Domain-Events / Actors / Hotspots tables restated in 02+ ----
  // The 01-owned table shapes are: header starting with Event|Actor (+Kind)|Hotspot.
  const downstreamMd = [];
  if (art['02']) downstreamMd.push(['02-glossary.md', art['02'].text]);
  if (art['03']) downstreamMd.push(['03-aggregates.md', art['03'].text]);
  {
    let edges = 0; const bad = [];
    for (const [name, text] of downstreamMd) {
      edges++;
      if (hasTableShape(text, ['event', 'actor', 'trigger'])) bad.push(`${name} restates a 01 Domain-Events table shape`);
      if (hasTableShape(text, ['actor', 'kind', 'responsibility'])) bad.push(`${name} restates a 01 Actors table shape`);
      if (hasTableShape(text, ['hotspot', 'question', 'blocks'])) bad.push(`${name} restates a 01 Hotspots table shape`);
    }
    F('DRY-01-shape', bad.length ? 'fail' : 'pass', bad.length ? bad.join('; ') : null, ['01-event-storming.md'], edges);
  }

  // ---- DRY-02-shape: Terms / enum-value tables restated in 03+ ----
  {
    const targets = [];
    if (art['03']) targets.push(['03-aggregates.md', art['03'].text]);
    let edges = 0; const bad = [];
    for (const [name, text] of targets) {
      edges++;
      if (hasTableShape(text, ['term', 'definition'])) bad.push(`${name} restates a 02 Terms table shape`);
      if (hasTableShape(text, ['value', 'derived from event'])) bad.push(`${name} restates a 02 enum-value table shape`);
    }
    F('DRY-02-shape', bad.length ? 'fail' : 'pass', bad.length ? bad.join('; ') : null, ['02-glossary.md'], edges);
  }

  // ---- DRY-trans-shape: transition tables restated in 05/06 comments ----
  {
    let edges = 0; const bad = [];
    for (const sc of (art['05'] || [])) {
      edges++;
      if (/\|\s*From\s*\|.*\bEvent\b.*\|\s*To\s*\|/i.test(sc.text)) bad.push(`05/${sc.stem}.scxml embeds a transition-table shape`);
    }
    for (const ft of (art['06'] || [])) {
      edges++;
      if (/\|\s*From\s*\|.*\bEvent\b.*\|\s*To\s*\|/i.test(ft.text)) bad.push(`06/${ft.stem}.feature embeds a transition-table shape`);
    }
    F('DRY-trans-shape', bad.length ? 'fail' : 'pass', bad.length ? bad.join('; ') : null, ['04-transitions.md'], edges);
  }

  // ---- DRY-verbatim: >=N-token windows of upstream INV Rule text appearing in 06 ----
  if (m.m03 && m.m06.length) {
    const ruleWindows = []; // {id, window:[tokens], norm}
    for (const [id, rule] of m.m03.invariantRules) {
      const toks = tokenize(rule);
      if (toks.length >= DRY_TOKEN_WINDOW) {
        for (let i = 0; i + DRY_TOKEN_WINDOW <= toks.length; i++) {
          ruleWindows.push({ id, norm: toks.slice(i, i + DRY_TOKEN_WINDOW).join(' ') });
        }
      }
    }
    let edges = 0; const bad = [];
    for (const ft of m.m06) {
      const ftext = (art['06'].find((f) => f.stem === ft.stem) || {}).text || '';
      const ftoks = tokenize(ftext);
      const wins = new Set();
      for (let i = 0; i + DRY_TOKEN_WINDOW <= ftoks.length; i++) wins.add(ftoks.slice(i, i + DRY_TOKEN_WINDOW).join(' '));
      edges++;
      for (const rw of ruleWindows) {
        if (wins.has(rw.norm)) { bad.push(`06/${ft.stem}.feature restates >=${DRY_TOKEN_WINDOW}-token window of ${rw.id} rule text`); break; }
      }
    }
    F('DRY-verbatim-rule', bad.length ? 'fail' : 'pass', bad.length ? bad.join('; ') : null, ['03-aggregates.md'], edges);
  }

  // ---- DRY-def-verbatim: >=N-token windows of 02 Term definitions in 03+ ----
  if (m.m02 && art['03']) {
    // 02 definitions are re-read from text (model.mjs keeps names, not prose):
    const defs = extractDefinitions(art['02'].text);
    const windows = [];
    for (const d of defs) {
      const toks = tokenize(d);
      if (toks.length >= DRY_TOKEN_WINDOW)
        for (let i = 0; i + DRY_TOKEN_WINDOW <= toks.length; i++) windows.push(toks.slice(i, i + DRY_TOKEN_WINDOW).join(' '));
    }
    const dtoks = tokenize(art['03'].text);
    const dwins = new Set();
    for (let i = 0; i + DRY_TOKEN_WINDOW <= dtoks.length; i++) dwins.add(dtoks.slice(i, i + DRY_TOKEN_WINDOW).join(' '));
    let edges = windows.length ? 1 : 0; const bad = [];
    for (const w of windows) if (dwins.has(w)) { bad.push(`03-aggregates.md restates a >=${DRY_TOKEN_WINDOW}-token window of a 02 definition`); break; }
    F('DRY-def-verbatim', bad.length ? 'fail' : 'pass', bad.length ? bad.join('; ') : null, ['02-glossary.md'], edges);
  }

  return out;
}

function hasTableShape(text, requiredCols) {
  // look for a table whose header contains ALL required column substrings
  const lines = text.split(/\r?\n/);
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!lines[i].includes('|')) continue;
    if (!/^\s*\|?\s*:?-{1,}/.test(lines[i + 1]) || !lines[i + 1].includes('|')) continue;
    const header = lines[i].toLowerCase();
    if (requiredCols.every((c) => header.includes(c))) return true;
  }
  return false;
}

function tokenize(s) {
  return s.toLowerCase().replace(/[^a-z0-9_]+/g, ' ').trim().split(/\s+/).filter(Boolean);
}

function extractDefinitions(text) {
  // the 02 Terms table: column 'Definition'
  const out = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!lines[i].includes('|')) continue;
    const header = lines[i].toLowerCase();
    if (header.includes('term') && header.includes('definition')) {
      const cols = lines[i].split('|').map((c) => c.trim().toLowerCase());
      const di = cols.findIndex((c) => c.includes('definition'));
      let j = i + 2;
      for (; j < lines.length && lines[j].includes('|'); j++) {
        const cells = lines[j].split('|').map((c) => c.trim());
        // account for leading pipe producing an empty first cell
        const idx = lines[j].trim().startsWith('|') ? di : di - 1;
        if (cells[di] && !/^:?-/.test(cells[di])) out.push(cells[di]);
      }
      break;
    }
  }
  return out;
}

function toSnake(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

export { toSnake };
