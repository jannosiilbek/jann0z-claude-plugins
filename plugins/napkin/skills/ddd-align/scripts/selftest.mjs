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
  (s) => edit(s, "data/model.dbml", (t) =>
    t.replace(/^(\s*)Table\b/gm, "$1table").replace(/^(\s*)Enum\b/gm, "$1enum")),
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

// 11. An empty spec dir must not be green — zero artifacts proves nothing.
testCase("empty spec dir → non-zero (no vacuous green)",
  (s) => {
    rmSync(s, { recursive: true });
    cpSync(GOLDEN, s, { recursive: true });
    for (const f of ["brief.md", "glossary.md", "flows.md", "usecases.md", "plan.md", "stack.md", "nfr.md", "api.md"]) unlinkSync(join(s, f));
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

// 17. AL-16: model.dbml fingerprint is stale (glossary was edited after model was saved).
testCase("stale upstream fingerprint → AL-16 warn",
  (s) => edit(s, "data/model.dbml", (t) =>
    t.replace(/sha256:[0-9a-f]{64}/, "sha256:" + "0".repeat(64))),
  (r) => (hasWarn(r, "AL-16") ? null : `stale fingerprint must produce an AL-16 warn`));

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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
