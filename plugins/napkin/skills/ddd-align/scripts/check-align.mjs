#!/usr/bin/env node
/**
 * check-align.mjs — mechanical cross-artifact alignment checker for the napkin
 * DDD spec pipeline. Parses the spec/ artifacts defined in
 * ../references/spec-format.md and proves their cross-references.
 *
 * Usage:
 *   node check-align.mjs --spec <path-to-spec-dir> [--require glossary,model,usecases,plan]
 *
 * Output: JSON on stdout — { ok, artifacts, findings, stats }.
 * Exit 0 only when: at least one artifact parsed (no vacuous green), zero
 * `error`-severity findings, and every --require'd artifact is present.
 *
 * Zero runtime dependencies on purpose: the gate must run anywhere Node runs.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------- CLI

function parseArgs(argv) {
  const args = { spec: null, require: [] };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--spec") args.spec = argv[++i];
    else if (argv[i] === "--require")
      args.require = (argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else fail(`unknown argument: ${argv[i]}`);
  }
  if (!args.spec) fail("missing --spec <path-to-spec-dir>");
  return args;
}

function fail(msg) {
  process.stderr.write(`check-align: ${msg}\n`);
  process.exit(2);
}

// ---------------------------------------------------------------- findings

const findings = [];
function report(check, severity, artifact, line, message) {
  findings.push({ check, severity, artifact, line, message });
}

// ---------------------------------------------------------------- parsing

const KNOWN_TYPES = ["brief", "glossary", "flows", "usecases", "plan", "stack", "nfr", "api", "decisions"];
const EXPECTED_FILENAMES = {
  "brief.md": "brief",
  "glossary.md": "glossary",
  "flows.md": "flows",
  "usecases.md": "usecases",
  "plan.md": "plan",
  "stack.md": "stack",
  "nfr.md": "nfr",
  "api.md": "api",
  "decisions.md": "decisions",
};
const MARKER_RE = /<!--\s*ddd:\s*([a-z]+)\s*-->/;

// Known preset conventions — inline to preserve zero-dependency contract.
// Adding a new preset requires updating this map AND adding an AL-22 known value.
const PRESET_CONVENTIONS = {
  "hono-monorepo": { "File naming": "stereotype.identifier", "File structure": "flat per stereotype" },
  "fastapi":       { "File naming": "stereotype_identifier",  "File structure": "flat per stereotype" },
};

// Heading shapes: `## UC-001 — Title` (em dash, single spaces).
const ID_HEADING_RE = /^(#{2,3}) (UC-\d{3}|FL-\d{3}|T-\d{3}|M\d+) — (.+)$/;
// Near-miss: starts like an ID heading but doesn't match the exact shape.
const ID_HEADING_LOOSE_RE = /^#{2,3}\s+(UC|FL|T)-?\d/;

const FIELD_RE = /^\s*- ([A-Za-z][A-Za-z ]*): (.*)$/;

function readArtifact(path) {
  const raw = readFileSync(path, "utf8");
  const lines = raw.split(/\r?\n/);
  const marker = raw.match(MARKER_RE);
  return { path, raw, lines, type: marker ? marker[1] : null };
}

/** Generic pass: extract ID-headed items with their fields and body lines. */
function extractItems(art, artifactName) {
  const items = [];
  let current = null;
  for (let i = 0; i < art.lines.length; i++) {
    const line = art.lines[i];
    const m = line.match(ID_HEADING_RE);
    if (m) {
      current = { id: m[2], title: m[3].trim(), line: i + 1, fields: {}, fieldLines: {}, body: [] };
      items.push(current);
      continue;
    }
    if (/^#{1,3} /.test(line) && !m) {
      // A non-ID heading closes the current item only at the same-or-higher level.
      if (current && line.match(/^#{1,2} /)) current = null;
      if (line.match(ID_HEADING_LOOSE_RE) && !line.match(ID_HEADING_RE)) {
        report("AL-15", "error", artifactName, i + 1,
          `malformed ID heading (expected \`## UC-001 — Title\` shape): ${line.trim()}`);
      }
      continue;
    }
    if (current) {
      const f = line.match(FIELD_RE);
      if (f && line.match(/^- /)) {
        current.fields[f[1]] = f[2].trim();
        current.fieldLines[f[1]] = i + 1;
      }
      current.body.push({ line, n: i + 1 });
    }
  }
  return items;
}

function parseGlossary(art) {
  const terms = new Map(); // name -> { line, fields }
  const enums = new Map(); // name -> { values, usedBy, line }
  let section = null;
  let currentTerm = null;
  for (let i = 0; i < art.lines.length; i++) {
    const line = art.lines[i];
    const h2 = line.match(/^## (.+)$/);
    if (h2) { section = h2[1].trim(); currentTerm = null; continue; }
    if (section === "Terms") {
      const h3 = line.match(/^### (.+)$/);
      if (h3) {
        currentTerm = { line: i + 1, fields: {} };
        terms.set(h3[1].trim(), currentTerm);
        continue;
      }
      const f = line.match(FIELD_RE);
      if (f && currentTerm) currentTerm.fields[f[1]] = f[2].trim();
    } else if (section === "Enumerations") {
      const row = line.match(/^\|([^|]+)\|([^|]+)\|([^|]*)\|?\s*$/);
      if (row) {
        const name = row[1].trim();
        if (name === "Enumeration" || /^[-: ]+$/.test(name)) continue;
        enums.set(name, {
          values: row[2].split(",").map((v) => v.trim()).filter(Boolean),
          usedBy: row[3].trim(),
          line: i + 1,
        });
      }
    }
  }
  return { terms, enums };
}

function parseFlows(art) {
  const flows = extractItems(art, "flows.md");
  const commands = new Map(); // text -> line
  const events = new Map();
  const stepActors = []; // { actor, line }
  const STEP_RE = /^\s*\d+\.\s+(Command|Event|Policy):\s*(.+)$/;
  for (const fl of flows) {
    for (const { line, n } of fl.body) {
      const s = line.match(STEP_RE);
      if (!s) continue;
      const kind = s[1];
      let text = s[2].trim();
      if (kind === "Command") {
        const actorM = text.match(/\(Actor:\s*([^)]+)\)\s*$/);
        if (actorM) {
          stepActors.push({ actor: actorM[1].trim(), line: n });
          text = text.replace(/\s*\(Actor:[^)]+\)\s*$/, "").trim();
        }
        commands.set(text, n);
      } else if (kind === "Event") {
        events.set(text, n);
      } else if (kind === "Policy") {
        if (!/^Whenever .+, then .+$/.test(text)) {
          report("AL-15", "error", "flows.md", n,
            `policy step must read \`Whenever <X>, then <Y>\`: ${text}`);
        }
      }
    }
  }
  return { flows, commands, events, stepActors };
}

const EARS_RES = [
  /^WHEN .+, THE SYSTEM SHALL .+/i,
  /^WHILE .+, THE SYSTEM SHALL .+/i,
  /^IF .+, THEN THE SYSTEM SHALL .+/i,
  /^THE SYSTEM SHALL .+/i,
];

// erd-modeler's closed assertion grammar (scripts/README.md is normative).
const ASSERTION_RES = [
  /^error$/,
  /^error ~ .+$/,
  /^rowcount=\d+$/,
  /^rows=\d+$/,
  /^rows>=\d+$/,
  /^value=.+$/,
  /^col:[A-Za-z_][A-Za-z0-9_]*=.*$/,
];

function parseUsecases(art) {
  const ucs = extractItems(art, "usecases.md").filter((it) => it.id.startsWith("UC-"));
  for (const uc of ucs) {
    uc.status = (uc.fields["Status"] || "active").toLowerCase();
    uc.acs = [];
    uc.das = [];
    let mode = null;
    for (const { line, n } of uc.body) {
      if (/^\s*- Acceptance criteria:/.test(line)) { mode = "ac"; continue; }
      if (/^\s*- Data assertions:/.test(line)) { mode = "da"; continue; }
      if (/^\s*- [A-Za-z][A-Za-z ]*:/.test(line) && !/^\s+- (AC|DA)-/.test(line)) { mode = null; continue; }
      const ac = line.match(/^\s+- (AC-\d+):\s*(.+)$/);
      if (ac && mode === "ac") { uc.acs.push({ id: ac[1], text: ac[2].trim(), line: n }); continue; }
      const da = line.match(/^\s+- (DA-\d+):\s*(.+)$/);
      if (da && mode === "da") {
        const parts = da[2].split("=> expect:");
        uc.das.push({
          id: da[1],
          desc: parts[0].trim(),
          assertion: parts.length > 1 ? parts.slice(1).join("=> expect:").trim() : null,
          line: n,
        });
      }
    }
  }
  return ucs;
}

function parsePlan(art) {
  const items = extractItems(art, "plan.md");
  const tasks = items.filter((it) => it.id.startsWith("T-"));
  const milestones = items.filter((it) => /^M\d+$/.test(it.id));
  for (const t of tasks) {
    t.implements = (t.fields["Implements"] || "")
      .split(",").map((s) => s.trim()).filter(Boolean);
    t.dependsOn = (t.fields["Depends on"] || "none")
      .split(",").map((s) => s.trim()).filter((s) => s && s.toLowerCase() !== "none");
    t.status = (t.fields["Status"] || "todo").toLowerCase();
  }
  return { tasks, milestones };
}

function parseDbml(raw) {
  const tables = new Map(); // name -> line
  const enums = new Map(); // name -> { values, line }
  const lines = raw.split(/\r?\n/);
  let currentEnum = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // DBML keywords are case-insensitive (the renderer/live-test accept `table`/`enum`
    // as readily as `Table`/`Enum`), so the parser must be too — otherwise a valid model
    // written with lowercase keywords parses as zero tables and cascades false AL-01/02/04s.
    const t = line.match(/^\s*Table\s+"?([\w.]+)"?\s*\{/i);
    if (t) { tables.set(t[1], i + 1); currentEnum = null; continue; }
    const e = line.match(/^\s*Enum\s+"?([\w.]+)"?\s*\{/i);
    if (e) { currentEnum = { values: [], line: i + 1 }; enums.set(e[1], currentEnum); continue; }
    if (currentEnum) {
      if (/^\s*\}/.test(line)) { currentEnum = null; continue; }
      const v = line.trim().replace(/\/\/.*$/, "").trim().replace(/^"|"$/g, "");
      if (v) currentEnum.values.push(v);
    }
  }
  return { tables, enums };
}

function parseApi(art) {
  const ops = [];
  let current = null;
  const API_HEAD_RE = /^## (API-UC-\d{3}(?:-internal)?) — (.+)$/;
  const ERROR_RE = /^\s*- Response \d{3}: ([A-Z][A-Z0-9_]+)/;
  for (let i = 0; i < art.lines.length; i++) {
    const line = art.lines[i];
    const m = line.match(API_HEAD_RE);
    if (m) {
      current = { id: m[1], title: m[2].trim(), line: i + 1, fields: {}, errorCodes: [] };
      ops.push(current);
      continue;
    }
    if (/^## /.test(line) && !m) { current = null; continue; }
    if (current) {
      const f = line.match(FIELD_RE);
      if (f && line.match(/^- /)) current.fields[f[1]] = f[2].trim();
      const e = line.match(ERROR_RE);
      if (e) current.errorCodes.push({ code: e[1], line: i + 1 });
    }
  }
  return ops;
}

function parseNfr(art) {
  const errorCodes = new Set();
  let inErrorContracts = false;
  for (let i = 0; i < art.lines.length; i++) {
    const line = art.lines[i];
    if (/^## Error contracts/.test(line)) { inErrorContracts = true; continue; }
    if (/^## /.test(line)) { inErrorContracts = false; continue; }
    if (inErrorContracts) {
      const m = line.match(/^\s*- .+: \d{3} ([A-Z][A-Z0-9_]+)/);
      if (m) errorCodes.add(m[1]);
    }
  }
  return { errorCodes };
}

function parseStack(art) {
  const sections = {};
  let currentSection = null;
  // Looser field regex for stack.md that also captures path-style keys (e.g. apps/api).
  const STACK_FIELD_RE = /^\s*- ([A-Za-z][A-Za-z0-9 /_-]*): (.*)$/;
  for (let i = 0; i < art.lines.length; i++) {
    const line = art.lines[i];
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      currentSection = h2[1].trim();
      if (!sections[currentSection]) sections[currentSection] = { fields: {}, pathEntries: [] };
      continue;
    }
    if (!currentSection) continue;
    const f = line.match(STACK_FIELD_RE);
    if (f) {
      const key = f[1].trim();
      sections[currentSection].fields[key] = f[2].trim();
      if (key.includes("/")) sections[currentSection].pathEntries.push(key);
    }
  }
  return sections;
}

// ---------------------------------------------------------------- main

const args = parseArgs(process.argv);
if (!existsSync(args.spec) || !statSync(args.spec).isDirectory()) {
  fail(`spec directory not found: ${args.spec}`);
}

const artifacts = {}; // type -> parsed artifact file
const found = [];

for (const file of readdirSync(args.spec)) {
  if (!file.endsWith(".md")) continue;
  const art = readArtifact(join(args.spec, file));
  art.file = file;
  if (art.type && KNOWN_TYPES.includes(art.type)) {
    if (artifacts[art.type]) {
      report("AL-15", "error", file, 1,
        `duplicate \`ddd: ${art.type}\` marker — already declared by ${artifacts[art.type].file}`);
    } else {
      artifacts[art.type] = art;
      found.push(art.type);
    }
  } else if (art.type) {
    report("AL-15", "error", file, 1, `unknown artifact type \`ddd: ${art.type}\``);
  } else if (EXPECTED_FILENAMES[file]) {
    report("AL-15", "error", file, 1,
      `expected artifact file is missing its \`<!-- ddd: ${EXPECTED_FILENAMES[file]} -->\` marker — it is invisible to the alignment check`);
  }
}

const modelPath = join(args.spec, "data", "model.dbml");
const sqlPath = join(args.spec, "data", "usecases.sql");
const dbml = existsSync(modelPath) ? parseDbml(readFileSync(modelPath, "utf8")) : null;
const sqlRaw = existsSync(sqlPath) ? readFileSync(sqlPath, "utf8") : null;
if (dbml) found.push("model");
if (sqlRaw) found.push("sql");

// --- parse each artifact
const glossary = artifacts.glossary ? parseGlossary(artifacts.glossary) : null;
const flows = artifacts.flows ? parseFlows(artifacts.flows) : null;
const ucs = artifacts.usecases ? parseUsecases(artifacts.usecases) : null;
const plan = artifacts.plan ? parsePlan(artifacts.plan) : null;
const apiOps = artifacts.api ? parseApi(artifacts.api) : null;
const nfr = artifacts.nfr ? parseNfr(artifacts.nfr) : null;
const stackSections = artifacts.stack ? parseStack(artifacts.stack) : null;

// Trigger malformed-heading detection for artifacts not covered by extractItems.
if (artifacts.brief) extractItems(artifacts.brief, "brief.md");
if (artifacts.glossary) extractItems(artifacts.glossary, "glossary.md");

// --- AL-10: ID format + uniqueness
for (const [name, items] of [
  ["flows.md", flows ? flows.flows : []],
  ["usecases.md", ucs || []],
  ["plan.md", plan ? [...plan.tasks, ...plan.milestones] : []],
]) {
  const seen = new Map();
  for (const it of items) {
    if (seen.has(it.id)) {
      report("AL-10", "error", name, it.line,
        `duplicate id ${it.id} (first declared on line ${seen.get(it.id)})`);
    } else seen.set(it.id, it.line);
  }
}

// --- glossary ↔ DBML (AL-01..AL-04)
if (glossary && dbml) {
  const mapped = new Map(); // table -> term
  for (const [term, t] of glossary.terms) {
    const m = (t.fields["Maps to"] || "").match(/^ERD:\s*([\w.]+)$/);
    if (m) {
      mapped.set(m[1], term);
      if (!dbml.tables.has(m[1])) {
        report("AL-01", "error", "glossary.md", t.line,
          `term "${term}" maps to table \`${m[1]}\` which does not exist in model.dbml (tables: ${[...dbml.tables.keys()].join(", ")})`);
      }
    } else if (t.fields["Maps to"]) {
      report("AL-15", "error", "glossary.md", t.line,
        `term "${term}" has a malformed Maps to field (expected \`Maps to: ERD: <table_name>\`): ${t.fields["Maps to"]}`);
    }
  }
  for (const [table, line] of dbml.tables) {
    if (!mapped.has(table)) {
      report("AL-02", "error", "data/model.dbml", line,
        `table \`${table}\` does not trace to any glossary term (add a term with \`Maps to: ERD: ${table}\` — relationship/bridge concepts deserve a name too)`);
    }
  }
  for (const [name, g] of glossary.enums) {
    const d = dbml.enums.get(name);
    if (!d) {
      report("AL-04", "error", "glossary.md", g.line,
        `enumeration \`${name}\` is not defined as an Enum in model.dbml`);
      continue;
    }
    const gSet = new Set(g.values), dSet = new Set(d.values);
    const missing = g.values.filter((v) => !dSet.has(v));
    const extra = d.values.filter((v) => !gSet.has(v));
    if (missing.length || extra.length) {
      report("AL-03", "error", "data/model.dbml", d.line,
        `enum \`${name}\` value drift — glossary says [${g.values.join(", ")}], DBML says [${d.values.join(", ")}] (spelling is contract: never respell an enum value)`);
    } else if (g.values.join("|") !== d.values.join("|")) {
      report("AL-03b", "warn", "data/model.dbml", d.line,
        `enum \`${name}\` has the right values in a different order than the glossary`);
    }
  }
  for (const [name, d] of dbml.enums) {
    if (!glossary.enums.has(name)) {
      report("AL-04b", "warn", "data/model.dbml", d.line,
        `DBML enum \`${name}\` has no row in the glossary Enumerations table`);
    }
  }
}

// --- actor closure (AL-09)
if (glossary) {
  const terms = new Set(glossary.terms.keys());
  const checkActor = (actor, artifact, line) => {
    if (actor && !terms.has(actor)) {
      report("AL-09", "error", artifact, line,
        `actor "${actor}" is not a glossary term (terms: ${[...terms].join(", ")})`);
    }
  };
  if (flows) {
    for (const fl of flows.flows) checkActor(fl.fields["Actor"], "flows.md", fl.fieldLines["Actor"] || fl.line);
    for (const sa of flows.stepActors) checkActor(sa.actor, "flows.md", sa.line);
  }
  if (ucs) for (const uc of ucs) checkActor(uc.fields["Actor"], "usecases.md", uc.fieldLines["Actor"] || uc.line);
}

// --- use cases (AL-07, AL-08, AL-12)
if (ucs) {
  for (const uc of ucs) {
    if (uc.status !== "active") continue;
    if (uc.acs.length === 0) {
      report("AL-07", "error", "usecases.md", uc.line,
        `${uc.id} has no acceptance criteria — every active use case needs at least one EARS criterion`);
    } else {
      for (const ac of uc.acs) {
        if (!EARS_RES.some((re) => re.test(ac.text))) {
          report("AL-07", "error", "usecases.md", ac.line,
            `${uc.id}/${ac.id} is not an EARS criterion (expected WHEN/WHILE/IF…THEN/THE SYSTEM SHALL shape): ${ac.text}`);
        }
      }
    }
    if (uc.das.length === 0) {
      report("AL-08", "error", "usecases.md", uc.line,
        `${uc.id} has no data assertions — every active use case needs at least one \`=> expect:\` proof`);
    } else {
      for (const da of uc.das) {
        if (da.assertion === null) {
          report("AL-08", "error", "usecases.md", da.line,
            `${uc.id}/${da.id} is missing its \`=> expect: <assertion>\` tail`);
        } else if (!ASSERTION_RES.some((re) => re.test(da.assertion))) {
          report("AL-08", "error", "usecases.md", da.line,
            `${uc.id}/${da.id} assertion \`${da.assertion}\` is not in the closed grammar (error, error ~ <reason>, rowcount=N, rows=N, rows>=N, value=<v>, col:<name>=<v>)`);
        }
      }
    }
    if (flows && uc.fields["Trigger"]) {
      const trig = uc.fields["Trigger"].trim();
      if (!flows.commands.has(trig) && !flows.events.has(trig)) {
        report("AL-12", "warn", "usecases.md", uc.fieldLines["Trigger"] || uc.line,
          `${uc.id} trigger "${trig}" is not a Command or Event in flows.md`);
      }
    }
  }
}

// --- plan (AL-05, AL-06, AL-11)
if (plan && ucs) {
  const ucIds = new Map(ucs.map((u) => [u.id, u]));
  const cited = new Set();
  for (const t of plan.tasks) {
    for (const ref of t.implements) {
      cited.add(ref);
      const uc = ucIds.get(ref);
      if (!uc) {
        report("AL-06", "error", "plan.md", t.line,
          `${t.id} implements ${ref}, which does not exist in usecases.md`);
      } else if (uc.status !== "active") {
        report("AL-06b", "warn", "plan.md", t.line,
          `${t.id} implements ${ref}, which is deprecated`);
      }
    }
  }
  for (const uc of ucs) {
    if (uc.status === "active" && !cited.has(uc.id)) {
      report("AL-05", "error", "usecases.md", uc.line,
        `${uc.id} is active but no plan task implements it — every active use case must be planned (or deprecated)`);
    }
  }
}
if (plan) {
  const taskIds = new Map(plan.tasks.map((t) => [t.id, t]));
  for (const t of plan.tasks) {
    for (const dep of t.dependsOn) {
      if (!taskIds.has(dep)) {
        report("AL-06", "error", "plan.md", t.line, `${t.id} depends on ${dep}, which does not exist`);
      }
    }
  }
  // AL-11: cycle detection (iterative DFS).
  const state = new Map(); // 0=unvisited 1=in-stack 2=done
  const inCycle = new Set();
  function visit(id, stack) {
    if (state.get(id) === 1) {
      const at = stack.indexOf(id);
      stack.slice(at).forEach((x) => inCycle.add(x));
      return;
    }
    if (state.get(id) === 2 || !taskIds.has(id)) return;
    state.set(id, 1);
    stack.push(id);
    for (const dep of taskIds.get(id).dependsOn) visit(dep, stack);
    stack.pop();
    state.set(id, 2);
  }
  for (const t of plan.tasks) visit(t.id, []);
  if (inCycle.size) {
    const first = plan.tasks.find((t) => inCycle.has(t.id));
    report("AL-11", "error", "plan.md", first.line,
      `dependency cycle between tasks: ${[...inCycle].sort().join(" → ")}`);
  }
}

// --- AL-13: forbidden synonyms in downstream prose.
// A synonym that appears only as a sub-token of a *longer* canonical glossary term
// (e.g. "User" inside the distinct term "End User") is legitimate, not drift — shield
// those term occurrences before testing so the check fires only on standalone misuse.
if (glossary) {
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const termNames = [...glossary.terms.keys()];
  for (const [term, t] of glossary.terms) {
    const syns = (t.fields["Forbidden synonyms"] || "")
      .split(",").map((s) => s.trim()).filter(Boolean);
    for (const syn of syns) {
      const re = new RegExp(`\\b${escape(syn)}\\b`, "i");
      const shields = termNames
        .filter((n) => n.toLowerCase() !== syn.toLowerCase() && re.test(n))
        .map((n) => new RegExp(escape(n), "gi"));
      const mask = (l) => shields.reduce((acc, r) => acc.replace(r, (m) => " ".repeat(m.length)), l);
      for (const type of ["flows", "usecases", "plan"]) {
        const art = artifacts[type];
        if (!art) continue;
        const idx = art.lines.findIndex((l) => re.test(mask(l)));
        if (idx !== -1) {
          report("AL-13", "warn", art.file, idx + 1,
            `forbidden synonym "${syn}" used — the glossary term is "${term}"`);
        }
      }
    }
  }
}

// --- AL-14: every active UC labeled in usecases.sql
if (sqlRaw && ucs) {
  const labeled = new Set();
  for (const m of sqlRaw.matchAll(/^--\s*usecase:\s*(UC-\d{3})\b/gm)) labeled.add(m[1]);
  for (const uc of ucs) {
    if (uc.status === "active" && !labeled.has(uc.id)) {
      report("AL-14", "error", "data/usecases.sql", 1,
        `${uc.id} is active but has no \`-- usecase: ${uc.id}/DA-n …\` block in usecases.sql — its data assertions were never live-tested`);
    }
  }
}

// --- AL-16: upstream-fingerprint staleness
if (existsSync(modelPath)) {
  const modelRaw = readFileSync(modelPath, "utf8");
  const fpRe = /^\/\/ upstream-fingerprint: (.+)@sha256:([0-9a-f]{64})/gm;
  for (const fp of modelRaw.matchAll(fpRe)) {
    const [, relPath, storedHash] = fp;
    const absPath = join(args.spec, "..", relPath);
    if (!existsSync(absPath)) {
      report("AL-16", "warn", "data/model.dbml", 1,
        `fingerprint references ${relPath} which does not exist`);
      continue;
    }
    const actual = createHash("sha256").update(readFileSync(absPath)).digest("hex");
    if (actual !== storedHash) {
      report("AL-16", "warn", "data/model.dbml", 1,
        `upstream fingerprint mismatch for ${relPath} — model may be stale (stored ${storedHash.slice(0, 8)}…, actual ${actual.slice(0, 8)}…)`);
    }
  }
}

// --- AL-17: every active UC has an API-UC-xxx entry in api.md (when api.md exists)
if (apiOps !== null && ucs) {
  const apiIds = new Set(apiOps.map((op) => op.id));
  for (const uc of ucs) {
    if (uc.status !== "active") continue;
    const expected = "API-" + uc.id;
    if (!apiIds.has(expected)) {
      report("AL-17", "error", "api.md", 1,
        `${uc.id} is active but has no \`## ${expected}\` entry in api.md`);
    }
  }
}

// --- AL-18: every error code in api.md appears in nfr.md Error contracts (when both exist)
if (apiOps !== null && nfr !== null) {
  for (const op of apiOps) {
    for (const { code, line } of op.errorCodes) {
      if (!nfr.errorCodes.has(code)) {
        report("AL-18", "error", "api.md", line,
          `error code ${code} in ${op.id} is not declared in nfr.md §Error contracts`);
      }
    }
  }
}

// --- AL-19: every Policy command Y is the trigger of at least one active UC
if (flows && ucs) {
  const ucTriggers = new Set(
    ucs.filter((u) => u.status === "active").map((u) => u.fields["Trigger"]).filter(Boolean)
  );
  const POLICY_RE = /^Whenever .+, then (.+)$/;
  for (const fl of flows.flows) {
    for (const { line, n } of fl.body) {
      const s = line.match(/^\s*\d+\.\s+Policy:\s*(.+)$/);
      if (!s) continue;
      const m = s[1].match(POLICY_RE);
      if (!m) continue;
      const cmd = m[1].trim();
      if (!ucTriggers.has(cmd)) {
        report("AL-19", "warn", "flows.md", n,
          `policy command "${cmd}" is not the trigger of any active use case — implement it as a UC or document the deferral`);
      }
    }
  }
}

// --- AL-20..AL-24: stack.md structural checks (activate only when stack.md present)
if (stackSections) {
  // AL-20: ##Conventions must have File naming + File structure fields.
  const conv = stackSections["Conventions"];
  if (!conv) {
    report("AL-20", "error", "stack.md", 1, "§Conventions section is missing");
  } else {
    for (const field of ["File naming", "File structure"]) {
      if (!conv.fields[field]) {
        report("AL-20", "error", "stack.md", 1, `§Conventions missing required field: ${field}`);
      }
    }
  }

  // AL-21: ##Structure must have Repo field + at least 3 path entries.
  const struct = stackSections["Structure"];
  if (!struct) {
    report("AL-21", "error", "stack.md", 1, "§Structure section is missing");
  } else {
    if (!struct.fields["Repo"]) {
      report("AL-21", "error", "stack.md", 1, "§Structure missing Repo field");
    }
    if (struct.pathEntries.length < 3) {
      report("AL-21", "error", "stack.md", 1,
        `§Structure has fewer than 3 path entries (found ${struct.pathEntries.length})`);
    }
  }

  // AL-22: Preset: value must be a known preset name (when field is present).
  const preset = stackSections["Runtime"]?.fields?.["Preset"];
  if (preset !== undefined && !PRESET_CONVENTIONS[preset]) {
    report("AL-22", "error", "stack.md", 1, `unknown Preset value: ${preset}`);
  }

  // AL-23: When Preset: declared, File naming + File structure must match preset's values.
  if (preset && PRESET_CONVENTIONS[preset] && conv) {
    for (const [field, expectedVal] of Object.entries(PRESET_CONVENTIONS[preset])) {
      const actual = conv.fields[field];
      if (actual && !actual.startsWith(expectedVal)) {
        report("AL-23", "error", "stack.md", 1,
          `§Conventions ${field} mismatch: expected "${expectedVal}…", got "${actual}"`);
      }
    }
  }

  // AL-24: ##Pipeline must exist with CI, Branching, and Branch map fields.
  const pipeline = stackSections["Pipeline"];
  if (!pipeline) {
    report("AL-24", "error", "stack.md", 1, "§Pipeline section is missing");
  } else {
    for (const field of ["CI", "Branching", "Branch map"]) {
      if (!pipeline.fields[field]) {
        report("AL-24", "error", "stack.md", 1, `§Pipeline missing required field: ${field}`);
      }
    }
  }
}

// --- missing-artifact info + --require
const missing = KNOWN_TYPES.filter((t) => !artifacts[t]);
for (const t of missing) {
  report("AL-00", "info", `${t}.md`, 0, `artifact not present (fine for a partial pipeline)`);
}
const requireMissing = args.require.filter((r) => !found.includes(r));
for (const r of requireMissing) {
  report("AL-00", "error", r, 0, `required artifact \`${r}\` is missing`);
}

// ---------------------------------------------------------------- summary

const errors = findings.filter((f) => f.severity === "error").length;
const warns = findings.filter((f) => f.severity === "warn").length;
const ok = found.length > 0 && errors === 0 && requireMissing.length === 0;

const summary = {
  ok,
  artifacts: { found, missing },
  findings,
  stats: {
    artifacts_found: found.length,
    errors,
    warnings: warns,
    infos: findings.filter((f) => f.severity === "info").length,
    usecases_active: ucs ? ucs.filter((u) => u.status === "active").length : 0,
    plan_tasks: plan ? plan.tasks.length : 0,
  },
};

process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
process.exit(ok ? 0 : 1);
