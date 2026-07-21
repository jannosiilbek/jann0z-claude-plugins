#!/usr/bin/env node
/**
 * selftest.mjs — adversarial regression suite for check-align.mjs.
 *
 * Each case copies the golden fixture spec, mutates exactly one thing that a
 * drifting pipeline (or a careless hand edit) would produce, runs the checker,
 * and asserts that the specific drift is caught. The suite exists to prove the
 * checker refuses false-greens — a green that doesn't mean anything is worse
 * than no checker at all.
 *
 * Run: node selftest.mjs   (or: npm test)
 */

import { cpSync, mkdtempSync, rmSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN = join(HERE, "fixtures", "golden", "spec");
const CHECKER = join(HERE, "check-align.mjs");

let passed = 0;
let failed = 0;

function run(specDir, extraArgs = []) {
  const res = spawnSync(process.execPath, [CHECKER, "--spec", specDir, ...extraArgs], {
    encoding: "utf8",
  });
  let json = null;
  try { json = JSON.parse(res.stdout); } catch { /* asserted below */ }
  return { exit: res.status, json, stderr: res.stderr };
}

/**
 * @param {string} name
 * @param {(dir: string) => void} mutate   applied to a fresh copy of golden
 * @param {(r: {exit:number|null,json:any}) => string|null} verify  null = pass, string = failure reason
 */
function testCase(name, mutate, verify) {
  const dir = mkdtempSync(join(tmpdir(), "ddd-align-selftest-"));
  const spec = join(dir, "spec");
  try {
    cpSync(GOLDEN, spec, { recursive: true });
    mutate(spec);
    const r = run(spec, mutateArgs);
    const reason = verify(r);
    if (reason === null) {
      passed++;
      console.log(`  ✅ ${name}`);
    } else {
      failed++;
      console.log(`  ❌ ${name}: ${reason}`);
      if (r.json) console.log(`     findings: ${JSON.stringify(r.json.findings)}`);
      else console.log(`     exit=${r.exit} stderr=${r.stderr}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
let mutateArgs = [];

function edit(spec, rel, fn) {
  const p = join(spec, rel);
  writeFileSync(p, fn(readFileSync(p, "utf8")));
}

const hasCheck = (r, check) =>
  r.json && r.json.findings.some((f) => f.check === check && f.severity === "error");
const hasWarn = (r, check) =>
  r.json && r.json.findings.some((f) => f.check === check && f.severity === "warn");
const caught = (r, check) =>
  r.exit !== 0 && hasCheck(r, check)
    ? null
    : `expected exit!=0 with an ${check} error (got exit=${r.exit})`;

console.log("check-align selftest — every case proves a refused false-green\n");

// 1. Baseline: the golden fixture must be green (guards against over-strictness —
//    a checker that rejects correct specs trains people to ignore it).
//    Info-level findings (AL-00 "artifact not present") are informational and never
//    affect exit code or ok status — they are excluded from this assertion.
testCase("golden fixture is green",
  () => {},
  (r) => {
    const nonInfo = r.json ? r.json.findings.filter((f) => f.severity !== "info") : null;
    return (r.exit === 0 && r.json && r.json.ok && nonInfo && nonInfo.length === 0
      ? null
      : `expected clean green, got exit=${r.exit}, findings=${r.json ? r.json.findings.length : "?"}`);
  });

// 1b. Lowercase DBML block keywords (`table`/`enum`) are valid DBML — the diagram renderer
//     and the PGlite live-test accept them as readily as `Table`/`Enum`. A case-sensitive
//     parser would see zero tables and cascade false AL-01/AL-02/AL-04s; this locks that shut.
testCase("lowercase DBML keywords stay green",
  (s) => {
    edit(s, "data/model.dbml", (t) =>
      t.replace(/^(\s*)Table\b/gm, "$1table").replace(/^(\s*)Enum\b/gm, "$1enum"));
    // plan.md fingerprints data/model.dbml (spec-format §1.6); re-embed it here as a
    // real save would, so this DBML-casing test doesn't also trip the unrelated,
    // separately-tested AL-16 staleness check (see cases 17/17b).
    const newHash = createHash("sha256").update(readFileSync(join(s, "data/model.dbml"))).digest("hex");
    edit(s, "plan.md", (t) =>
      t.replace(/spec\/data\/model\.dbml@sha256:[0-9a-f]{64}/, `spec/data/model.dbml@sha256:${newHash}`));
  },
  (r) => {
    const nonInfo = r.json ? r.json.findings.filter((f) => f.severity !== "info") : null;
    return (r.exit === 0 && r.json && r.json.ok && nonInfo && nonInfo.length === 0
      ? null
      : `expected clean green with lowercase keywords, got exit=${r.exit}, findings=${r.json ? JSON.stringify(r.json.findings.map((f) => f.check)) : "?"}`);
  });

// 2. A table renamed in the DBML (e.g. by a hand edit) breaks glossary tracing.
testCase("renamed DBML table → AL-01 + AL-02",
  (s) => edit(s, "data/model.dbml", (t) => t.replace("Table enrollments {", "Table registrations {")),
  (r) => (hasCheck(r, "AL-01") && hasCheck(r, "AL-02") && r.exit !== 0
    ? null
    : `expected AL-01 (term→missing table) and AL-02 (untraced table)`));

// 3. A UC deleted outright (instead of deprecated) leaves the plan citing a ghost.
testCase("deleted-but-cited UC → AL-06",
  (s) => edit(s, "usecases.md", (t) => t.replace(/## UC-003[\s\S]*?(?=## Changelog)/, "")),
  (r) => caught(r, "AL-06"));

// 4. Enum value respelled in the DBML — the classic silent drift erd-modeler's
//    glossary contract exists to prevent.
testCase("enum drift dropped→removed → AL-03",
  (s) => edit(s, "data/model.dbml", (t) => t.replace(/^  dropped$/m, "  removed")),
  (r) => caught(r, "AL-03"));

// 5. Acceptance criteria stripped from an active UC.
testCase("UC without EARS criteria → AL-07",
  (s) => edit(s, "usecases.md", (t) =>
    t.replace(/- Acceptance criteria:\n(  - AC-\d+: WHEN a student requests.*\n)/, "")),
  (r) => caught(r, "AL-07"));

// 6. An actor that isn't in the ubiquitous language.
testCase("non-glossary actor → AL-09",
  (s) => edit(s, "usecases.md", (t) => t.replace("- Actor: Registrar", "- Actor: Administrator")),
  (r) => caught(r, "AL-09"));

// 6b. A forbidden synonym that appears only as a sub-token of a LONGER canonical term
//     ("Pupil" inside the distinct term "Pupil Liaison") is legitimate, not drift — it must
//     NOT trip AL-13. (Student forbids "Pupil"; we add "Pupil Liaison" as its own role term.)
testCase("forbidden synonym inside a longer term → not flagged",
  (s) => {
    edit(s, "glossary.md", (t) => t.replace("### Registrar",
      "### Pupil Liaison\n- Definition: A volunteer who supports pupils; owns no rows.\n\n### Registrar"));
    edit(s, "flows.md", (t) => t.replace("- 2026-06-11 (ddd-domain): created",
      "- 2026-06-11 (ddd-domain): created; added Pupil Liaison role"));
  },
  (r) => (r.exit === 0 && !hasWarn(r, "AL-13") ? null
    : `"Pupil Liaison" must not trip AL-13 (exit=${r.exit}, al13=${r.json ? JSON.stringify(r.json.findings.filter((f) => f.check === "AL-13")) : "?"})`));

// 6c. ...but a STANDALONE forbidden synonym is still caught — the shield didn't disable AL-13.
testCase("standalone forbidden synonym → AL-13 warn",
  (s) => edit(s, "flows.md", (t) => t.replace("- 2026-06-11 (ddd-domain): created",
    "- 2026-06-11 (ddd-domain): created; Pupil signup flow pending")),
  (r) => (hasWarn(r, "AL-13") ? null : `standalone "Pupil" should trip AL-13 (got ${r.json ? JSON.stringify(r.json.findings.map((f) => f.check)) : "?"})`));

// 7. Duplicate ID — renumbering/copy-paste accidents must not pass.
testCase("duplicate UC id → AL-10",
  (s) => edit(s, "usecases.md", (t) => t.replace("## UC-003 — Drop an enrollment", "## UC-001 — Drop an enrollment")),
  (r) => caught(r, "AL-10"));

// 8. An invented assertion operator — outside the closed grammar, it would never
//    map onto a live test, so it must be rejected here, not discovered later.
testCase("invented assertion operator rows>2 → AL-08",
  (s) => edit(s, "usecases.md", (t) => t.replace("=> expect: rows=2", "=> expect: rows>2")),
  (r) => caught(r, "AL-08"));

// 9. A dependency cycle in the plan.
testCase("plan dependency cycle → AL-11",
  (s) => edit(s, "plan.md", (t) =>
    t.replace("### T-002 — Enrollment listing API\n- Implements: UC-002\n- Depends on: T-001",
              "### T-002 — Enrollment listing API\n- Implements: UC-002\n- Depends on: T-003")
     .replace("### T-003 — Drop flow\n- Implements: UC-003\n- Depends on: T-001",
              "### T-003 — Drop flow\n- Implements: UC-003\n- Depends on: T-002")),
  (r) => caught(r, "AL-11"));

// 10. Marker stripped from a known artifact file — it must be reported as
//     malformed, never silently treated as "no usecases here".
testCase("stripped ddd marker → AL-15, artifact not counted as found",
  (s) => edit(s, "usecases.md", (t) => t.replace("<!-- ddd: usecases -->\n", "")),
  (r) => {
    if (!hasCheck(r, "AL-15")) return "expected an AL-15 malformed error";
    if (r.json.artifacts.found.includes("usecases")) return "usecases must NOT be in artifacts.found";
    if (r.exit === 0) return "expected non-zero exit";
    return null;
  });

// An unfilled scaffold marker means the artifact was saved half-finished — never green.
testCase("unfilled <TODO:> marker in usecases.md → AL-15",
  (s) => edit(s, "usecases.md", (t) => t.replace(
    "  - DA-1: enrolling an existing student in an existing course inserts one row => expect: rowcount=1",
    "  - DA-1: <TODO: positive proof> => expect: rowcount=1")),
  (r) => caught(r, "AL-15"));

// 11. An empty spec dir must not be green — zero artifacts proves nothing.
testCase("empty spec dir → non-zero (no vacuous green)",
  (s) => {
    rmSync(s, { recursive: true });
    cpSync(GOLDEN, s, { recursive: true });
    for (const f of ["brief.md", "glossary.md", "flows.md", "usecases.md", "plan.md", "stack.md", "nfr.md", "api.md", "env.md", "screens.md"]) unlinkSync(join(s, f));
    rmSync(join(s, "data"), { recursive: true });
  },
  (r) => (r.exit !== 0 && r.json && r.json.ok === false ? null : `expected non-zero exit, got ${r.exit}`));

// 12. --require must fail when the required artifact is absent.
testCase("--require plan without plan.md → non-zero",
  (s) => { unlinkSync(join(s, "plan.md")); mutateArgs = ["--require", "plan"]; },
  (r) => { mutateArgs = []; return r.exit !== 0 ? null : "expected non-zero exit"; });

// 13. usecases.sql missing an active UC's labeled block — the spec claims a
//     proof that was never run.
testCase("usecases.sql missing a UC label → AL-14",
  (s) => edit(s, "data/usecases.sql", (t) => t.replace(/-- usecase: UC-002[\s\S]*?-- expect: rows=2\n/, "")),
  (r) => caught(r, "AL-14"));

// 14. AL-17: api.md exists but is missing an entry for an active UC.
testCase("api.md missing API-UC-002 entry → AL-17",
  (s) => edit(s, "api.md", (t) => t.replace(
    /## API-UC-002[\s\S]*?(?=## API-UC-003)/, "")),
  (r) => caught(r, "AL-17"));

// 15. AL-18: api.md uses an error code not declared in nfr.md.
testCase("api.md uses undeclared error code → AL-18",
  (s) => edit(s, "api.md", (t) => t.replace(
    "- Response 409: ENROLLMENT_EXISTS — student already enrolled in this course",
    "- Response 409: DUPLICATE_ENROLLMENT — student already enrolled in this course")),
  (r) => caught(r, "AL-18"));

// 16. AL-19: flows.md has a Policy whose command Y is not a UC trigger.
testCase("uncovered policy command → AL-19 warn",
  (s) => edit(s, "flows.md", (t) => t.replace(
    "## Changelog",
    "## FL-002 — Auto-notify on enrollment\n- Actor: Registrar\n- Steps:\n  1. Command: Enroll student\n  2. Event: Student enrolled\n  3. Policy: Whenever Student enrolled, then Send welcome email\n\n## Changelog")),
  (r) => (hasWarn(r, "AL-19") ? null : `"Send welcome email" has no UC trigger — expected AL-19 warn`));

// A policy-derived UC trigger is legitimate — AL-19 demands it, so AL-12 must accept it.
testCase("policy-derived UC trigger → no AL-12",
  (s) => {
    edit(s, "flows.md", (t) => t.replace(
      "## Changelog",
      "## FL-004 — Welcome mail\n- Actor: Registrar\n- Steps:\n  1. Policy: Whenever Student enrolled, then Send welcome email\n\n## Changelog"));
    edit(s, "usecases.md", (t) => t.replace("- Trigger: Student enrolled", "- Trigger: Send welcome email"));
  },
  (r) => (r.json && !r.json.findings.some((f) => f.check === "AL-12")
    ? null
    : `policy command as UC trigger must not fire AL-12 (got ${r.json ? JSON.stringify(r.json.findings.filter((f) => f.check === "AL-12")) : "?"})`));

// The FIRST ", then" separates a policy's trigger from its command — a command
// containing ", then" stays whole, and AL-12/AL-19 agree on it.
testCase("compound policy command splits on the first ', then'",
  (s) => {
    edit(s, "flows.md", (t) => t.replace(
      "## Changelog",
      "## FL-004 — Escalation\n- Actor: Registrar\n- Steps:\n  1. Policy: Whenever Student enrolled, then Notify registrar, then archive\n\n## Changelog"));
    edit(s, "usecases.md", (t) => t.replace("- Trigger: Student enrolled", "- Trigger: Notify registrar, then archive"));
  },
  (r) => (r.json
      && !r.json.findings.some((f) => f.check === "AL-12")
      && !r.json.findings.some((f) => f.check === "AL-19")
    ? null
    : `compound command must satisfy both AL-12 and AL-19 (got ${r.json ? JSON.stringify(r.json.findings.filter((f) => f.check === "AL-12" || f.check === "AL-19")) : "?"})`));

// 17. AL-16: model.dbml fingerprint is stale (glossary was edited after model was saved).
testCase("stale upstream fingerprint → AL-16 warn",
  (s) => edit(s, "data/model.dbml", (t) =>
    t.replace(/sha256:[0-9a-f]{64}/, "sha256:" + "0".repeat(64))),
  (r) => (hasWarn(r, "AL-16") ? null : `stale fingerprint must produce an AL-16 warn`));

// 17b. AL-16 generalized: usecases.md fingerprints flows.md — editing flows.md after
//      usecases.md was generated must warn on usecases.md, not just on model.dbml.
testCase("stale usecases.md fingerprint after flows.md edit → AL-16 warn on usecases.md",
  (s) => edit(s, "flows.md", (t) => t.replace(
    "## FL-001 — Enroll in a course", "## FL-001 — Enroll in a course, revised")),
  (r) => (r.json && r.json.findings.some(
      (f) => f.check === "AL-16" && f.severity === "warn" && f.artifact === "usecases.md")
    ? null
    : `expected an AL-16 warn on usecases.md (got ${r.json ? JSON.stringify(r.json.findings.filter((f) => f.check === "AL-16")) : "?"})`));

// 18. AL-17 only fires when api.md exists — a spec without api.md is fine.
testCase("spec without api.md does not trigger AL-17",
  (s) => { unlinkSync(join(s, "api.md")); },
  (r) => (r.exit === 0 && !hasCheck(r, "AL-17")
    ? null
    : `spec without api.md must not fire AL-17 (exit=${r.exit})`));

// AL-20: File naming field missing from ##Conventions.
testCase("stack.md missing File naming in §Conventions → AL-20",
  (s) => edit(s, "stack.md", (t) =>
    t.replace(/- File naming:.*\n/, "")),
  (r) => caught(r, "AL-20"));

// AL-21: Repo field missing from ##Structure.
testCase("stack.md missing Repo in §Structure → AL-21",
  (s) => edit(s, "stack.md", (t) =>
    t.replace(/- Repo:.*\n/, "")),
  (r) => caught(r, "AL-21"));

// AL-21: Fewer than 3 path entries in ##Structure.
testCase("stack.md §Structure fewer than 3 path entries → AL-21",
  (s) => edit(s, "stack.md", (t) => {
    let kept = 0;
    return t.replace(/^- (apps|packages|tests|tooling)\/.+$/gm, (m) => {
      kept++;
      return kept <= 2 ? m : "";
    });
  }),
  (r) => caught(r, "AL-21"));

// AL-22: Preset field set to an unrecognised name.
testCase("stack.md Preset: unknown-preset → AL-22",
  (s) => edit(s, "stack.md", (t) =>
    t.replace("- Language: TypeScript\n", "- Language: TypeScript\n- Preset: unknown-preset\n")),
  (r) => caught(r, "AL-22"));

// AL-23: Preset declared as hono-monorepo but File naming uses underscore convention.
testCase("stack.md Preset: hono-monorepo with wrong File naming → AL-23",
  (s) => edit(s, "stack.md", (t) =>
    t.replace("- Language: TypeScript\n", "- Language: TypeScript\n- Preset: hono-monorepo\n")
     .replace(/- File naming:.*/, "- File naming: stereotype_identifier (e.g. enrollment_aggregate.ts)")),
  (r) => caught(r, "AL-23"));

// AL-24: ##Pipeline section stripped entirely.
testCase("stack.md missing §Pipeline → AL-24",
  (s) => edit(s, "stack.md", (t) =>
    t.replace(/\n## Pipeline\n[\s\S]*?(?=\n## )/, "")),
  (r) => caught(r, "AL-24"));

// AL-25: §TypeScript section absent when Preset: hono-monorepo.
testCase("stack.md Preset: hono-monorepo missing §TypeScript → AL-25",
  (s) => edit(s, "stack.md", (t) =>
    t.replace("- Language: TypeScript\n", "- Language: TypeScript\n- Preset: hono-monorepo\n")),
  (r) => caught(r, "AL-25"));

// AL-26: §TypeScript present but moduleResolution uses wrong value.
testCase("stack.md Preset: hono-monorepo wrong moduleResolution → AL-26",
  (s) => edit(s, "stack.md", (t) =>
    t.replace("- Language: TypeScript\n", "- Language: TypeScript\n- Preset: hono-monorepo\n")
     .replace("## Changelog",
       "## TypeScript\n- strict: true\n- moduleResolution: node16\n- verbatimModuleSyntax: true\n- isolatedModules: true\n\n## Changelog")),
  (r) => caught(r, "AL-26"));

// AL-33: canonical path missing from §Structure for hono-monorepo.
testCase("stack.md Preset: hono-monorepo missing tooling/eslint → AL-33",
  (s) => edit(s, "stack.md", (t) =>
    t.replace("- Language: TypeScript\n", "- Language: TypeScript\n- Preset: hono-monorepo\n")
     .replace("- tooling/eslint: shared ESLint config\n", "")
     .replace("## Changelog",
       "## TypeScript\n- strict: true\n- moduleResolution: Bundler\n- verbatimModuleSyntax: true\n- isolatedModules: true\n\n## Changelog")),
  (r) => caught(r, "AL-33"));

// AL-27: aggregate root with no Invariants block → warn.
testCase("aggregate root missing Invariants block → AL-27 warn",
  (s) => edit(s, "glossary.md", (t) => t.replace(
    "### Student\n- Definition: A person who enrolls in and takes courses.\n- Maps to: ERD: students\n- Forbidden synonyms: Learner, Pupil",
    "### Student\n- Definition: A person who enrolls in and takes courses.\n- Aggregate root: yes\n- Maps to: ERD: students\n- Forbidden synonyms: Learner, Pupil")),
  (r) => (hasWarn(r, "AL-27") ? null
    : `aggregate root without Invariants must produce AL-27 warn (got ${r.json ? JSON.stringify(r.json.findings.map((f) => f.check)) : "?"})`));

// AL-27 does NOT fire when Invariants is present.
testCase("aggregate root WITH Invariants block → no AL-27",
  (s) => edit(s, "glossary.md", (t) => t.replace(
    "### Student\n- Definition: A person who enrolls in and takes courses.\n- Maps to: ERD: students\n- Forbidden synonyms: Learner, Pupil",
    "### Student\n- Definition: A person who enrolls in and takes courses.\n- Aggregate root: yes\n- Invariants:\n  - a student may not be enrolled in more than one section of the same course\n- Maps to: ERD: students\n- Forbidden synonyms: Learner, Pupil")),
  (r) => (!hasWarn(r, "AL-27") ? null
    : `aggregate root with Invariants must NOT fire AL-27 (got ${r.json ? JSON.stringify(r.json.findings.filter((f) => f.check === "AL-27")) : "?"})`));

// AL-28: value object with Maps to → warn.
testCase("value object with Maps to → AL-28 warn",
  (s) => edit(s, "glossary.md", (t) => t.replace(
    "### Registrar\n- Definition: Staff member who manages the catalog and enrollments; owns no rows of their own.",
    "### Email\n- Definition: An immutable validated email address.\n- Value object: yes\n- Maps to: ERD: students\n\n### Registrar\n- Definition: Staff member who manages the catalog and enrollments; owns no rows of their own.")),
  (r) => (hasWarn(r, "AL-28") ? null
    : `value object with Maps to must produce AL-28 warn (got ${r.json ? JSON.stringify(r.json.findings.map((f) => f.check)) : "?"})`));

// AL-29: nfr.md declares soft-delete but no model table has the column.
testCase("nfr soft-delete with no deleted_at columns → AL-29 warn",
  (s) => edit(s, "nfr.md", (t) => t.replace("## Changelog",
    "## Data retention\n- PII entities: Student\n- Soft-delete: deleted_at column on all entities; hard delete not exposed\n\n## Changelog")),
  (r) => (hasWarn(r, "AL-29") ? null
    : `nfr soft-delete with a bare model must produce AL-29 warn (got ${r.json ? JSON.stringify(r.json.findings.map((f) => f.check)) : "?"})`));

// AL-29 does NOT fire when every table has the declared column.
testCase("nfr soft-delete satisfied by the model → no AL-29",
  (s) => {
    edit(s, "nfr.md", (t) => t.replace("## Changelog",
      "## Data retention\n- Soft-delete: deleted_at column on all entities\n\n## Changelog"));
    edit(s, "data/model.dbml", (t) => t
      .replace(/^(  email text \[unique, not null\])$/m, "$1\n  deleted_at timestamptz")
      .replace(/^(  capacity int \[not null\])$/m, "$1\n  deleted_at timestamptz")
      .replace(/^(  enrolled_at timestamptz \[not null\])$/m, "$1\n  deleted_at timestamptz"));
  },
  (r) => (!hasWarn(r, "AL-29") ? null
    : `model with deleted_at everywhere must NOT fire AL-29 (got ${JSON.stringify(r.json.findings.filter((f) => f.check === "AL-29"))})`));

// AL-30: nfr.md §Audit names a log table the model does not define.
testCase("nfr audit table missing from model → AL-30 warn",
  (s) => edit(s, "nfr.md", (t) => t.replace("## Changelog",
    "## Audit\n- Status transitions: logged to status_history\n\n## Changelog")),
  (r) => {
    const f = r.json && r.json.findings.find((x) => x.check === "AL-30" && x.severity === "warn");
    if (!f) return `undeclared audit table must produce AL-30 warn (got ${r.json ? JSON.stringify(r.json.findings.map((x) => x.check)) : "?"})`;
    if (!(f.line > 1)) return `AL-30 must anchor at the Status transitions line, not line ${f.line}`;
    return null;
  });

// AL-30 parses only the canonical shape — free-text mentions of "logged to" don't count.
testCase("non-canonical audit line → no AL-30",
  (s) => edit(s, "nfr.md", (t) => t.replace("## Changelog",
    "## Audit\n- Rationale: all admin actions are logged to satisfy SOC2\n\n## Changelog")),
  (r) => (r.json && !r.json.findings.some((f) => f.check === "AL-30")
    ? null
    : `free-text "logged to" must not fire AL-30 (got ${JSON.stringify(r.json.findings.filter((f) => f.check === "AL-30"))})`));

// AL-34: api.md TypeID<t> must reference a model.dbml table.
testCase("api.md TypeID referencing a missing table → AL-34",
  (s) => edit(s, "api.md", (t) => t.replace(
    "- student_id: TypeID<students> required",
    "- student_id: TypeID<people> required")),
  (r) => caught(r, "AL-34"));

// AL-34b: an enum-shaped field type that is not a model Enum → warn.
testCase("api.md enum-shaped type missing from model → AL-34b warn",
  (s) => edit(s, "api.md", (t) => t.replace(
    "    - status: enrollment_status\n    - enrolled_at: timestamp",
    "    - status: enrollment_state\n    - enrolled_at: timestamp")),
  (r) => (hasWarn(r, "AL-34b") ? null
    : `enum-shaped type \`enrollment_state\` must produce AL-34b warn (got ${r.json ? JSON.stringify(r.json.findings.map((f) => f.check)) : "?"})`));

// AL-34 only activates when the model exists — api.md alone stays quiet.
testCase("api.md without model.dbml does not fire AL-34",
  (s) => {
    edit(s, "api.md", (t) => t.replace(
      "- student_id: TypeID<students> required",
      "- student_id: TypeID<people> required"));
    rmSync(join(s, "data"), { recursive: true });
  },
  (r) => (!hasCheck(r, "AL-34")
    ? null
    : `AL-34 must not fire without model.dbml (got ${JSON.stringify(r.json.findings.filter((f) => f.check === "AL-34"))})`));

// AL-31: an EARS-shaped but content-free acceptance criterion.
testCase("vacuous acceptance criterion → AL-31 warn",
  (s) => edit(s, "usecases.md", (t) => t.replace(
    "  - AC-1: WHEN a student requests their courses, THE SYSTEM SHALL return every enrollment of that student.",
    "  - AC-1: WHEN a student requests their courses, THE SYSTEM SHALL work correctly.")),
  (r) => (hasWarn(r, "AL-31") ? null
    : `"work correctly" must produce AL-31 warn (got ${r.json ? JSON.stringify(r.json.findings.map((f) => f.check)) : "?"})`));

// AL-32: a glossary definition that restates the term.
testCase("circular glossary definition → AL-32 warn",
  (s) => edit(s, "glossary.md", (t) => t.replace(
    "- Definition: The fact that a specific Student is taking a specific Course, with a lifecycle status.",
    "- Definition: An Enrollment is when a student enrolls.")),
  (r) => (hasWarn(r, "AL-32") ? null
    : `circular definition must produce AL-32 warn (got ${r.json ? JSON.stringify(r.json.findings.map((f) => f.check)) : "?"})`));

// AL-32 does NOT fire on a substantive definition that happens to be short.
testCase("short but substantive definition → no AL-32",
  (s) => edit(s, "glossary.md", (t) => t.replace(
    "- Definition: The fact that a specific Student is taking a specific Course, with a lifecycle status.",
    "- Definition: A student-course pairing with a lifecycle status.")),
  (r) => (!hasWarn(r, "AL-32") ? null
    : `substantive short definition must NOT fire AL-32 (got ${JSON.stringify(r.json.findings.filter((f) => f.check === "AL-32"))})`));

// AL-35: plan.md without the execution contract loses the pipeline's rules at handoff.
testCase("plan.md missing Execution contract → AL-35 warn",
  (s) => edit(s, "plan.md", (t) => t.replace(/\n## Execution contract\n[\s\S]*?(?=\n## )/, "")),
  (r) => (hasWarn(r, "AL-35") ? null
    : `plan without §Execution contract must produce AL-35 warn (got ${r.json ? JSON.stringify(r.json.findings.map((f) => f.check)) : "?"})`));

// AL-35 checks the BODY, not just the heading — a reworded bullet under an intact
// heading must warn (the docs promise the contract is copied verbatim).
testCase("reworded Execution contract bullet → AL-35 warn",
  (s) => edit(s, "plan.md", (t) => t.replace(
    "- Deprecation: spec items are retired with `Status: deprecated`, never deleted, so citations cannot dangle.",
    "- Deprecation: old spec items can simply be deleted when no longer needed.")),
  (r) => (hasWarn(r, "AL-35") ? null
    : `a reworded contract bullet must produce AL-35 warn (got ${r.json ? JSON.stringify(r.json.findings.map((f) => f.check)) : "?"})`));

// Whitespace-only divergence is normalized away — no false-red on formatting.
testCase("whitespace-only contract divergence → no AL-35",
  (s) => edit(s, "plan.md", (t) => t.replace(
    "- Gate: every edit to `spec/` re-runs the alignment gate",
    "- Gate:  every edit to `spec/`   re-runs the alignment gate")),
  (r) => (r.json && !r.json.findings.some((f) => f.check === "AL-35")
    ? null
    : `whitespace-only divergence must not fire AL-35 (got ${r.json ? JSON.stringify(r.json.findings.filter((f) => f.check === "AL-35")) : "?"})`));

// Anti-drift pin: rebuild plan.md's contract from spec-format §6's canonical fenced
// block and assert it passes — proving the constant embedded in check-align.mjs and the
// spec-format text cannot silently diverge.
testCase("execution contract constant is pinned to spec-format §6",
  (s) => {
    const sf = readFileSync(join(HERE, "..", "references", "spec-format.md"), "utf8").split("\n");
    const head = sf.findIndex((l, i) => l.trim() === "## Execution contract"
      && sf.slice(i + 1, i + 4).some((n) => n.trim().startsWith("- Gate:")));
    if (head === -1) throw new Error("spec-format §6 canonical contract block not found");
    const bullets = [];
    for (let i = head + 1; i < sf.length; i++) {
      const t = sf[i].trim();
      if (t.startsWith("```")) break;
      if (t.startsWith("- ")) bullets.push(t);
    }
    edit(s, "plan.md", (t) => t.replace(/## Execution contract\n[\s\S]*?(?=\n## )/,
      "## Execution contract\n\n" + bullets.join("\n") + "\n"));
  },
  (r) => (r.json && !r.json.findings.some((f) => f.check === "AL-35")
    ? null
    : `a contract rebuilt from spec-format §6 must pass AL-35 — the embedded constant has drifted (got ${r.json ? JSON.stringify(r.json.findings.filter((f) => f.check === "AL-35")) : "?"})`));

// AL-36: a typo'd UC status must be caught, never silently skip the UC's checks.
testCase("UC Status typo (activ) → AL-36",
  (s) => edit(s, "usecases.md", (t) => t.replace("- Trigger: Enroll student\n- Status: active", "- Trigger: Enroll student\n- Status: activ")),
  (r) => caught(r, "AL-36"));

// AL-36 is FAIL-CLOSED: the typo'd UC is treated as active, so its coverage checks
// still run — deleting its SQL block must ALSO fire AL-14.
testCase("Status typo cannot exempt a UC from coverage → AL-36 + AL-14",
  (s) => {
    edit(s, "usecases.md", (t) => t.replace("- Trigger: Enroll student\n- Status: active", "- Trigger: Enroll student\n- Status: activ"));
    edit(s, "data/usecases.sql", (t) => t.replace(/-- usecase: UC-001[\s\S]*?-- expect: error ~ foreign key\n/, ""));
  },
  (r) => (hasCheck(r, "AL-36") && hasCheck(r, "AL-14") && r.exit !== 0
    ? null
    : `typo'd status must not exempt the UC: expected AL-36 AND AL-14 (got ${r.json ? JSON.stringify(r.json.findings.map((f) => f.check)) : "?"})`));

// AL-36 also covers plan task statuses (todo|in-progress|done).
testCase("plan task Status typo (in progress) → AL-36",
  (s) => edit(s, "plan.md", (t) => t.replace(
    "- Implements: UC-002\n- Depends on: T-001\n- Status: todo",
    "- Implements: UC-002\n- Depends on: T-001\n- Status: in progress")),
  (r) => caught(r, "AL-36"));

// A deprecated UC (valid vocabulary) is still exempt from coverage — no AL-36, no AL-14.
testCase("deprecated UC stays exempt without AL-36",
  (s) => {
    edit(s, "usecases.md", (t) => t.replace("- Trigger: Enroll student\n- Status: active", "- Trigger: Enroll student\n- Status: deprecated"));
    edit(s, "data/usecases.sql", (t) => t.replace(/-- usecase: UC-001[\s\S]*?-- expect: error ~ foreign key\n/, ""));
    // UC-001 is now deprecated but plan task T-001 implements it → AL-06b warn is
    // expected and unrelated; this case only asserts AL-36/AL-14 stay quiet.
  },
  (r) => (r.json
      && !r.json.findings.some((f) => f.check === "AL-36")
      && !r.json.findings.some((f) => f.check === "AL-14")
    ? null
    : `deprecated is valid vocabulary and exempts coverage (got ${r.json ? JSON.stringify(r.json.findings.map((f) => f.check)) : "?"})`));

// AL-37: a derived artifact with a required fingerprint line stripped must error —
// provenance-stripped artifacts must not pass silently.
testCase("stripped flows.md fingerprint in usecases.md → AL-37",
  (s) => edit(s, "usecases.md", (t) => t.replace(/<!-- upstream-fingerprint: spec\/flows\.md@sha256:[0-9a-f]{64} -->\n/, "")),
  (r) => caught(r, "AL-37"));

// AL-37 requires a fingerprint only when the upstream actually exists on disk.
testCase("absent upstream needs no fingerprint → no AL-37",
  (s) => {
    unlinkSync(join(s, "flows.md"));
    edit(s, "usecases.md", (t) => t.replace(/<!-- upstream-fingerprint: spec\/flows\.md@sha256:[0-9a-f]{64} -->\n/, ""));
  },
  (r) => (r.json && !r.json.findings.some((f) => f.check === "AL-37")
    ? null
    : `no AL-37 when the upstream file is absent (got ${r.json ? JSON.stringify(r.json.findings.filter((f) => f.check === "AL-37")) : "?"})`));

// AL-14 is per-DA: one bare block cannot cover a UC's other assertions — deleting only
// UC-003/DA-2's block must name exactly that assertion.
testCase("usecases.sql missing one DA block → AL-14 names UC-003/DA-2",
  (s) => edit(s, "data/usecases.sql", (t) => t.replace(/-- usecase: UC-003\/DA-2[\s\S]*?-- expect: col:status=dropped\n/, "")),
  (r) => (r.json && r.json.findings.some((f) => f.check === "AL-14" && f.severity === "error" && f.message.includes("UC-003/DA-2")) && r.exit !== 0
    ? null
    : `expected an AL-14 error naming UC-003/DA-2 (got ${r.json ? JSON.stringify(r.json.findings.filter((f) => f.check === "AL-14")) : "?"})`));

// AL-17: a policy UC's `-internal` block satisfies coverage (ddd-api §Policy steps).
testCase("API-UC-xxx-internal block satisfies AL-17",
  (s) => edit(s, "api.md", (t) => t.replace("## API-UC-003 —", "## API-UC-003-internal —")),
  (r) => (r.json && !r.json.findings.some((f) => f.check === "AL-17")
    ? null
    : `an -internal block must satisfy AL-17 coverage (got ${r.json ? JSON.stringify(r.json.findings.filter((f) => f.check === "AL-17")) : "?"})`));

// AL-36 covers screen statuses too — a typo'd screen status must be caught.
testCase("screen Status typo (activ) → AL-36",
  (s) => edit(s, "screens.md", (t) => t.replace("- Navigation: from entry; to SC-002\n- Status: active", "- Navigation: from entry; to SC-002\n- Status: activ")),
  (r) => caught(r, "AL-36"));

// SC ids join the global uniqueness rule.
testCase("duplicate screen id → AL-10",
  (s) => edit(s, "screens.md", (t) => t.replace("## SC-003 — Enrollment management", "## SC-001 — Enrollment management")),
  (r) => caught(r, "AL-10"));

// Screen actors join the ubiquitous-language closure.
testCase("non-glossary screen actor → AL-09",
  (s) => edit(s, "screens.md", (t) => t.replace("- Actor: Registrar", "- Actor: Admin")),
  (r) => caught(r, "AL-09"));

// AL-38: Serves must cite an existing UC.
testCase("screen serves a non-existent UC → AL-38",
  (s) => edit(s, "screens.md", (t) => t.replace("- Serves: UC-002", "- Serves: UC-009")),
  (r) => caught(r, "AL-38"));

// AL-38: a deprecated Serves target errors and the message names the replacement.
testCase("screen serves a deprecated UC → AL-38 naming the replacement",
  (s) => edit(s, "usecases.md", (t) => t.replace(
    "## UC-002 — List a student's courses\n- Actor: Student\n- Trigger: Student enrolled\n- Status: active",
    "## UC-002 — List a student's courses\n- Actor: Student\n- Trigger: Student enrolled\n- Status: deprecated\n- Superseded-by: UC-003")),
  (r) => {
    const f = r.json && r.json.findings.find((x) => x.check === "AL-38" && x.severity === "error");
    if (!f || r.exit === 0) return `expected an AL-38 error for a deprecated Serves target (exit=${r.exit})`;
    if (!f.message.includes("UC-003")) return `AL-38 message must name the Superseded-by replacement (got: ${f.message})`;
    return null;
  });

// AL-38: States is required on every active screen.
testCase("screen without States → AL-38",
  (s) => edit(s, "screens.md", (t) => t.replace("- States: loading, error, ready\n", "")),
  (r) => caught(r, "AL-38"));

// AL-38: Serves is required on every active screen.
testCase("screen without Serves → AL-38",
  (s) => edit(s, "screens.md", (t) => t.replace("- Serves: UC-001\n", "")),
  (r) => caught(r, "AL-38"));

// AL-38: Navigation SC refs must resolve.
testCase("navigation cites a non-existent screen → AL-38",
  (s) => edit(s, "screens.md", (t) => t.replace("- Navigation: from entry; to SC-002", "- Navigation: from entry; to SC-009")),
  (r) => caught(r, "AL-38"));

// AL-38: plan-task Screens anchors must resolve.
testCase("plan task cites a non-existent screen → AL-38",
  (s) => edit(s, "plan.md", (t) => t.replace("- Screens: SC-001", "- Screens: SC-009")),
  (r) => caught(r, "AL-38"));

// AL-38: a Screens anchor with no screens.md at all is dangling.
testCase("plan Screens anchor without screens.md → AL-38",
  (s) => { unlinkSync(join(s, "screens.md")); },
  (r) => caught(r, "AL-38"));

// Repoint SC-002's Serves at UC-002 so UC-003 loses screen coverage, then re-embed the
// screens fingerprint in plan.md so the mutation doesn't also trip AL-16 staleness.
const uncoverUc003 = (s) => {
  edit(s, "screens.md", (t) => t.replace("- Serves: UC-003", "- Serves: UC-002"));
  const newHash = createHash("sha256").update(readFileSync(join(s, "screens.md"))).digest("hex");
  edit(s, "plan.md", (t) =>
    t.replace(/spec\/screens\.md@sha256:[0-9a-f]{64}/, `spec/screens.md@sha256:${newHash}`));
};

// AL-39: an active UC served by no active screen is uncovered UI work.
testCase("active UC with no screen coverage → AL-39 warn",
  uncoverUc003,
  (r) => (hasWarn(r, "AL-39") ? null : `expected an AL-39 warn for uncovered UC-003 (findings=${r.json ? JSON.stringify(r.json.findings.map((f) => f.check)) : "?"})`));

// AL-39: an -internal api.md operation exempts its UC — policies and schedules have no screen.
testCase("internal api operation exempts its UC from AL-39",
  (s) => {
    uncoverUc003(s);
    edit(s, "api.md", (t) => t.replace("## API-UC-003 —", "## API-UC-003-internal —"));
  },
  (r) => (r.json && !r.json.findings.some((f) => f.check === "AL-39")
    ? null
    : `an -internal operation must exempt its UC from AL-39 (findings=${r.json ? JSON.stringify(r.json.findings.filter((f) => f.check === "AL-39")) : "?"})`));

// AL-39: with no api.md there is no exemption path — every active UC needs a screen.
testCase("uncovered UC without api.md → AL-39 warn (no exemptions)",
  (s) => {
    uncoverUc003(s);
    unlinkSync(join(s, "api.md"));
  },
  (r) => (hasWarn(r, "AL-39") ? null : `expected an AL-39 warn with api.md absent (findings=${r.json ? JSON.stringify(r.json.findings.map((f) => f.check)) : "?"})`));

// AL-37: screens.md must record its usecases.md provenance (spec-format §12).
testCase("screens.md without usecases fingerprint → AL-37",
  (s) => edit(s, "screens.md", (t) => t.replace(/<!-- upstream-fingerprint: spec\/usecases\.md@sha256:[0-9a-f]{64} -->\n/, "")),
  (r) => caught(r, "AL-37"));

// AL-37: plan.md must record screens.md provenance when screens.md exists.
testCase("plan.md without screens fingerprint → AL-37",
  (s) => edit(s, "plan.md", (t) => t.replace(/<!-- upstream-fingerprint: spec\/screens\.md@sha256:[0-9a-f]{64} -->\n/, "")),
  (r) => caught(r, "AL-37"));

// AL-16 resolution must not assume the spec directory is literally named "spec/".
{
  const dir = mkdtempSync(join(tmpdir(), "ddd-align-selftest-"));
  const spec = join(dir, "workspace-spec");
  try {
    cpSync(GOLDEN, spec, { recursive: true });
    const r = run(spec);
    const al16 = r.json ? r.json.findings.filter((f) => f.check === "AL-16") : null;
    if (r.exit === 0 && al16 && al16.length === 0) {
      passed++;
      console.log("  ✅ renamed spec dir → no false AL-16");
    } else {
      failed++;
      console.log(`  ❌ renamed spec dir → no false AL-16: exit=${r.exit} al16=${JSON.stringify(al16)}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
