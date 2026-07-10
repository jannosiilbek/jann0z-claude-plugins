#!/usr/bin/env node
/**
 * selftest.mjs — regression suite for scaffold-usecases.mjs.
 *
 * Runs the scaffolder against the fixture spec and asserts the emitted skeleton:
 * one stub per Command / policy command / Read paths entry, Actor and Trigger
 * prefilled verbatim, fingerprints present, and hard failures on bad input.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCAFFOLD = join(HERE, "scaffold-usecases.mjs");
const SPEC = join(HERE, "fixtures", "spec");

let passed = 0;
let failed = 0;
function check(name, cond, detail = "") {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}${detail ? `: ${detail}` : ""}`); }
}

console.log("scaffold-usecases selftest\n");

const r = spawnSync(process.execPath, [SCAFFOLD, "--spec", SPEC], { encoding: "utf8" });
const out = r.stdout;

check("exits 0 on the fixture spec", r.status === 0, `exit=${r.status} stderr=${r.stderr}`);
check("emits the usecases marker", out.includes("<!-- ddd: usecases -->"));
check("emits the project name from flows.md", out.includes("# Use cases — Course Platform"));
const sha = (rel) => createHash("sha256").update(readFileSync(join(SPEC, rel))).digest("hex");
check("fingerprints glossary.md with its real sha256",
  out.includes(`<!-- upstream-fingerprint: spec/glossary.md@sha256:${sha("glossary.md")} -->`));
check("fingerprints flows.md with its real sha256",
  out.includes(`<!-- upstream-fingerprint: spec/flows.md@sha256:${sha("flows.md")} -->`));
check("UC-001 from the first command", out.includes("## UC-001 — Enroll student"));
check("step-actor override wins over flow actor",
  /## UC-001 — Enroll student\n- Actor: Registrar/.test(out));
check("trigger is the command text verbatim", out.includes("- Trigger: Enroll student"));
check("policy command becomes a stub", out.includes("## UC-002 — Send welcome email"));
check("policy stub actor is a TODO marker",
  /## UC-002 — Send welcome email\n- Actor: <TODO:/.test(out));
check("second flow's command is scaffolded", out.includes("## UC-003 — Drop enrollment"));
check("read path becomes a stub, deferred after all commands",
  out.includes("## UC-004 — student's course list"));
check("read stub trigger points at an event of its flow",
  /## UC-004 — student's course list\n- Actor: Student\n- Trigger: <TODO: an Event from FL-001>/.test(out));
check("every stub carries EARS and DA TODO markers",
  (out.match(/AC-1: <TODO:/g) || []).length === 4 && (out.match(/DA-1: <TODO:/g) || []).length === 4);
check("ends with a Changelog", /## Changelog\n- \d{4}-\d{2}-\d{2} \(ddd-usecases\): scaffolded 4 use-case stubs from flows\.md/.test(out));

const rMissing = spawnSync(process.execPath, [SCAFFOLD, "--spec", join(HERE, "fixtures")], { encoding: "utf8" });
check("exits 2 when flows.md is missing", rMissing.status === 2);
const rNoArgs = spawnSync(process.execPath, [SCAFFOLD], { encoding: "utf8" });
check("exits 2 without --spec", rNoArgs.status === 2);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
