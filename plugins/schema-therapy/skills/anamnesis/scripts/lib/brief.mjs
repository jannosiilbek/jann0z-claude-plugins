// brief.mjs — the vendored S1 parser for anamnesis/brief.md (the Capabilities table) and the
// G0 theme-A owner checks (B-PARSE / B-CAP / B-TIER / B-PROD). The seam it owns: the
// capability manifest — every later piece of evidence cites a brief capability by exact string.
//
// S1 closed format (validation-rules.md): a `# Anamnesis Brief`, an `## Engagement` section,
// and an `## Capabilities` markdown table with columns Capability | Class | Environment | Tier |
// Access. Rules:
//   Capability unique, ^[a-z][a-z0-9-]*$ ; Class ∈ {code,test,doc,data,probe} ;
//   Tier/Environment non-`-` IFF Class=probe ; Tier ∈ {none,browse-only,read-only,sandbox-full} ;
//   Environment production (case-insensitive) ⇒ Tier ≠ sandbox-full ; Access non-empty ; ≥1 row.
//   Absent file ⇒ fail. Garbled (unparseable) table ⇒ malformed.

import { rec } from './checks.mjs';

export const CLASSES = new Set(['code', 'test', 'doc', 'data', 'probe']);
export const TIERS = new Set(['none', 'browse-only', 'read-only', 'sandbox-full']);
const CAP_RE = /^[a-z][a-z0-9-]*$/;

// Split a markdown table row "| a | b | c |" into trimmed cells (no leading/trailing empties).
function splitRow(line) {
  const t = line.trim();
  if (!t.startsWith('|')) return null;
  const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  return cells;
}
const isSepRow = (cells) => cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c.replace(/\s/g, '')));

// parse(text|null) → { ok, present, parseError, sections, capabilities:[{capability,class,environment,tier,access}] }
// ok=false with present=false ⇒ G0 fail (no brief). ok=false with parseError ⇒ malformed.
export function parse(text) {
  if (text == null) return { ok: false, present: false, parseError: null, capabilities: [] };
  const lines = text.split(/\r?\n/);
  const hasTitle = lines.some((l) => /^#\s+Anamnesis Brief\b/.test(l.trim()));
  const hasEngagement = lines.some((l) => /^##\s+Engagement\b/.test(l.trim()));
  const hasCaps = lines.some((l) => /^##\s+Capabilities\b/.test(l.trim()));
  const sections = { title: hasTitle, engagement: hasEngagement, capabilities: hasCaps };

  if (!hasTitle || !hasEngagement || !hasCaps) {
    return { ok: false, present: true, parseError: 'missing required section(s) (# Anamnesis Brief / ## Engagement / ## Capabilities)', sections, capabilities: [] };
  }

  // Locate the Capabilities section and read the first markdown table after it.
  const start = lines.findIndex((l) => /^##\s+Capabilities\b/.test(l.trim()));
  const tableLines = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^##\s+/.test(l.trim())) break; // next section
    if (l.trim().startsWith('|')) tableLines.push(l);
    else if (tableLines.length) break; // table ended
  }
  if (tableLines.length < 2) {
    return { ok: false, present: true, parseError: 'Capabilities table absent or has no rows (header + separator + ≥0 rows expected)', sections, capabilities: [] };
  }
  const header = splitRow(tableLines[0]);
  const expected = ['Capability', 'Class', 'Environment', 'Tier', 'Access'];
  if (!header || header.length !== 5 || !expected.every((h, i) => header[i] === h)) {
    return { ok: false, present: true, parseError: `Capabilities table header must be exactly | ${expected.join(' | ')} | (got | ${(header || []).join(' | ')} |)`, sections, capabilities: [] };
  }
  if (!isSepRow(splitRow(tableLines[1]) || [])) {
    return { ok: false, present: true, parseError: 'Capabilities table second row must be the markdown separator (|---|---|…)', sections, capabilities: [] };
  }
  const capabilities = [];
  for (let i = 2; i < tableLines.length; i++) {
    const cells = splitRow(tableLines[i]);
    if (!cells) continue;
    if (cells.length !== 5) {
      return { ok: false, present: true, parseError: `Capabilities row ${i - 1} has ${cells.length} cells, expected 5: '${tableLines[i].trim()}'`, sections, capabilities: [] };
    }
    capabilities.push({ capability: cells[0], class: cells[1], environment: cells[2], tier: cells[3], access: cells[4] });
  }
  return { ok: true, present: true, parseError: null, sections, capabilities };
}

// Build a lookup map { capabilityName → class } for the ledger/journal cross-refs.
export function capabilityMap(brief) {
  const m = new Map();
  for (const c of brief.capabilities) m.set(c.capability, c);
  return m;
}

// ---------------------------------------------------------------------------
// G0 checks. parse() decides present/parseError; these run only when ok===true.
// ---------------------------------------------------------------------------

// B-CAP (A2) — each Capability unique + pattern; Class closed; Access non-empty; ≥1 row.
export function bCap(brief) {
  const bad = [];
  if (brief.capabilities.length === 0) bad.push('zero capability rows');
  const seen = new Set();
  for (const c of brief.capabilities) {
    if (seen.has(c.capability)) bad.push(`duplicate Capability '${c.capability}'`);
    seen.add(c.capability);
    if (!CAP_RE.test(c.capability)) bad.push(`Capability '${c.capability}' violates ^[a-z][a-z0-9-]*$`);
    if (!CLASSES.has(c.class)) bad.push(`Capability '${c.capability}' Class '${c.class}' ∉ {code,test,doc,data,probe}`);
    if (!c.access || c.access === '-' || c.access.length === 0) bad.push(`Capability '${c.capability}' has empty Access`);
  }
  return bad.length
    ? rec('B-CAP', 'mechanical', 'A2', 'g0', 'fail', bad.join('; '))
    : rec('B-CAP', 'mechanical', 'A2', 'g0', 'pass');
}

// B-TIER (A3) — Tier+Environment non-`-` IFF Class=probe; Tier in closed set.
export function bTier(brief) {
  const bad = [];
  for (const c of brief.capabilities) {
    const isProbe = c.class === 'probe';
    const tierSet = c.tier !== '-' && c.tier !== '';
    const envSet = c.environment !== '-' && c.environment !== '';
    if (isProbe) {
      if (!tierSet) bad.push(`probe capability '${c.capability}' leaves Tier as '-'`);
      if (!envSet) bad.push(`probe capability '${c.capability}' leaves Environment as '-'`);
      if (tierSet && !TIERS.has(c.tier)) bad.push(`'${c.capability}' Tier '${c.tier}' ∉ {none,browse-only,read-only,sandbox-full}`);
    } else {
      if (tierSet) bad.push(`non-probe capability '${c.capability}' declares Tier '${c.tier}' (must be '-')`);
      if (envSet) bad.push(`non-probe capability '${c.capability}' declares Environment '${c.environment}' (must be '-')`);
    }
  }
  return bad.length
    ? rec('B-TIER', 'mechanical', 'A3', 'g0', 'fail', bad.join('; '))
    : rec('B-TIER', 'mechanical', 'A3', 'g0', 'pass');
}

// B-PROD (A4) — Environment production (case-insensitive) ⇒ Tier ≠ sandbox-full.
export function bProd(brief) {
  const bad = [];
  for (const c of brief.capabilities) {
    if (c.class === 'probe' && c.environment.toLowerCase() === 'production' && c.tier === 'sandbox-full') {
      bad.push(`'${c.capability}' is production but declares Tier sandbox-full`);
    }
  }
  return bad.length
    ? rec('B-PROD', 'mechanical', 'A4', 'g0', 'fail', bad.join('; '))
    : rec('B-PROD', 'mechanical', 'A4', 'g0', 'pass');
}
