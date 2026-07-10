#!/usr/bin/env node
/**
 * scaffold-usecases.mjs — mechanical skeleton generator for spec/usecases.md.
 *
 * Reads spec/flows.md and emits a usecases.md skeleton to stdout: one UC stub per
 * distinct Command step, per policy command, and per `Read paths:` entry, with
 * Actor/Trigger/fingerprints prefilled verbatim from the flows (grammar:
 * ../ddd-align/references/spec-format.md §4). The model fills every `<TODO: …>`
 * marker; an unfilled marker fails the ddd-align gate (AL-15), so a
 * half-filled skeleton cannot pass as done.
 *
 * Usage: node scaffold-usecases.mjs --spec <path-to-spec-dir>
 * Output: markdown on stdout. Never writes files — redirect or paste.
 * Zero runtime dependencies on purpose, like the ddd-align harness.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

function fail(msg) {
  process.stderr.write(`scaffold-usecases: ${msg}\n`);
  process.exit(2);
}

const args = { spec: null };
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--spec") args.spec = process.argv[++i];
  else fail(`unknown argument: ${process.argv[i]}`);
}
if (!args.spec) fail("missing --spec <path-to-spec-dir>");
const flowsPath = join(args.spec, "flows.md");
if (!existsSync(flowsPath)) fail(`flows.md not found in ${args.spec} — run ddd-domain first`);

const raw = readFileSync(flowsPath, "utf8");
const lines = raw.split(/\r?\n/);

// Parse flows: FL headings, per-flow Actor and Read paths, Command/Policy steps.
// Read-path stubs are deferred to the end of the file: command/policy UCs come first
// in flow order, then all read UCs — so write-path numbering never shifts when a
// read path is added to an early flow.
const FLOW_RE = /^## (FL-\d{3}) — (.+)$/;
const STEP_RE = /^\s*\d+\.\s+(Command|Event|Policy):\s*(.+)$/;
const candidates = []; // { title, trigger, actor }
const reads = [];
const seen = new Set();
let flowId = null;
let flowActor = null;
for (const line of lines) {
  const fl = line.match(FLOW_RE);
  if (fl) { flowId = fl[1]; flowActor = null; continue; }
  const af = line.match(/^- Actor:\s*(.+)$/);
  if (af) { flowActor = af[1].trim(); continue; }
  const rp = line.match(/^- Read paths:\s*(.+)$/);
  if (rp) {
    for (const q of rp[1].split(",").map((s) => s.trim()).filter(Boolean)) {
      if (seen.has(q)) continue;
      seen.add(q);
      reads.push({ title: q, trigger: `<TODO: an Event from ${flowId}>`, actor: flowActor });
    }
    continue;
  }
  const s = line.match(STEP_RE);
  if (!s) continue;
  if (s[1] === "Command") {
    let text = s[2].trim();
    let actor = flowActor;
    const am = text.match(/\(Actor:\s*([^)]+)\)\s*$/);
    if (am) { actor = am[1].trim(); text = text.replace(/\s*\(Actor:[^)]+\)\s*$/, "").trim(); }
    if (seen.has(text)) continue;
    seen.add(text);
    candidates.push({ title: text, trigger: text, actor });
  } else if (s[1] === "Policy") {
    const pm = s[2].trim().match(/^Whenever .+?, then (.+)$/);
    if (!pm) continue;
    const cmd = pm[1].trim();
    if (seen.has(cmd)) continue;
    seen.add(cmd);
    candidates.push({
      title: cmd,
      trigger: cmd,
      actor: null, // policies are system-triggered; the operator-of-record is a judgment call
    });
  }
}
for (const c of reads) candidates.push(c);
if (candidates.length === 0) fail("flows.md contains no Command or Policy steps — nothing to scaffold");

const project = (raw.match(/^# Flows — (.+)$/m) || [, "<Project name>"])[1];
const sha = (rel) => {
  const p = join(args.spec, rel);
  return existsSync(p) ? createHash("sha256").update(readFileSync(p)).digest("hex") : null;
};

const out = [];
out.push(`# Use cases — ${project}`);
out.push("<!-- ddd: usecases -->");
for (const dep of ["glossary.md", "flows.md"]) {
  const h = sha(dep);
  if (h) out.push(`<!-- upstream-fingerprint: spec/${dep}@sha256:${h} -->`);
}
out.push("");
let n = 0;
for (const c of candidates) {
  n++;
  const id = `UC-${String(n).padStart(3, "0")}`;
  out.push(`## ${id} — ${c.title}`);
  out.push(`- Actor: ${c.actor ?? "<TODO: glossary term — policy-derived UC; name its operator-of-record>"}`);
  out.push(`- Trigger: ${c.trigger}`);
  out.push("- Status: active");
  out.push("- Main flow:");
  out.push("  1. <TODO: step in domain language>");
  out.push("- Acceptance criteria:");
  out.push("  - AC-1: <TODO: EARS shape — WHEN <condition>, THE SYSTEM SHALL <observable behavior>.>");
  out.push("- Data assertions:");
  out.push("  - DA-1: <TODO: positive proof> => expect: rowcount=1");
  out.push("  - DA-2: <TODO: negative proof guarding an integrity rule> => expect: error ~ <TODO: reason>");
  out.push("");
}
out.push("## Changelog");
out.push(`- ${new Date().toISOString().slice(0, 10)} (ddd-usecases): scaffolded ${n} use-case stubs from flows.md`);
out.push("");
process.stdout.write(out.join("\n"));
