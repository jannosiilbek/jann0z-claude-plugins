// staleness.mjs — check class 3. Every emitted artifact carries a fingerprint
// block listing `<upstream-artifact>@sha256:<content-hash>` per consumed input.
// We recompute each hash over the EXACT bytes of the referenced input and report
// a mismatch as a `stale` finding (a class within the `fail` status) against the
// DOWNSTREAM artifact, naming both files + both hashes.
//
// 01's fingerprint references the domain description file (e.g. domain.md) which
// may live OUTSIDE specs/. With --domain <path> we verify it; without, we record
// the 01 domain fingerprint as `skipped` (shape-verified only, never silently
// passed). A fingerprint-looking line whose SHAPE is broken => malformed.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readFingerprints } from './model.mjs';

function hashBytes(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

// Resolve a fingerprint entry NAME to an on-disk path. Names are bare basenames
// like '01-event-storming.md', '04-erd.dbml', or the domain file.
function resolveInput(name, specsDir, domainPath) {
  // domain file
  if (domainPath && (name === 'domain.md' || name === pathBase(domainPath))) {
    return { path: domainPath, isDomain: true };
  }
  if (/^domain\b/i.test(name) || name.endsWith('domain.md')) {
    return { path: domainPath || null, isDomain: true };
  }
  // specs-rooted artifact
  const p = join(specsDir, name);
  return { path: p, isDomain: false };
}

function pathBase(p) {
  return p.split(/[\\/]/).pop();
}

// art: discoverArtifacts() output. Returns findings + malformed flag.
export function stalenessChecks(art, specsDir, domainPath) {
  const out = [];
  const malformedFindings = [];

  const F = (id, status, detail, files, extra = {}) =>
    out.push({ id, class: 'staleness', status, reason: status === 'fail' ? 'stale' : (status === 'skipped' ? 'domain-not-provided' : null), severity: status === 'fail' ? 'error' : null, detail: detail || null, files: files || [], ...extra });

  // each downstream artifact (with a fingerprint block) gets ONE check that
  // walks every referenced input.
  const targets = [];
  for (const k of ['01', '02', '03', '04dbml', '04trans']) if (art[k]) targets.push({ key: k, path: art[k].path, ext: art[k].ext, text: art[k].text, label: pathBase(art[k].path) });
  for (const f of (art['05'] || [])) targets.push({ key: '05', path: f.path, ext: '.scxml', text: f.text, label: `05-statecharts/${pathBase(f.path)}` });
  for (const f of (art['06'] || [])) targets.push({ key: '06', path: f.path, ext: '.feature', text: f.text, label: `06-gherkin/${pathBase(f.path)}` });

  for (const t of targets) {
    const fp = readFingerprints(t.text, t.ext);
    const id = `S-${t.label.replace(/[^A-Za-z0-9_.-]/g, '_')}`;

    // malformed fingerprint line shape => malformed (the whole suite)
    if (fp.malformed.length) {
      malformedFindings.push({ id, class: 'staleness', status: 'fail', severity: 'error', reason: 'malformed-fingerprint', detail: `${t.label} has malformed fingerprint line(s): ${fp.malformed.join(' ; ')}`, files: [t.label] });
      continue;
    }
    // 01 is the head; its only fingerprint is the domain file. Others MUST carry
    // a block (missing block => malformed).
    if (!fp.present || fp.entries.length === 0) {
      malformedFindings.push({ id, class: 'staleness', status: 'fail', severity: 'error', reason: 'missing-fingerprint', detail: `${t.label} carries no fingerprint block`, files: [t.label] });
      continue;
    }

    const subs = [];
    for (const e of fp.entries) {
      const res = resolveInput(e.name, specsDir, domainPath);
      if (res.isDomain) {
        if (!domainPath) {
          subs.push({ name: e.name, status: 'skipped', detail: `domain fingerprint shape OK; not verified (no --domain): ${e.name}@sha256:${e.hash.slice(0, 12)}…` });
          continue;
        }
      }
      if (!res.path || !existsSync(res.path)) {
        subs.push({ name: e.name, status: 'fail', detail: `referenced input not found on disk: ${e.name}` });
        continue;
      }
      const actual = hashBytes(readFileSync(res.path));
      if (actual !== e.hash) {
        subs.push({ name: e.name, status: 'fail', detail: `STALE: ${t.label} pins ${e.name}@sha256:${e.hash} but recomputed ${e.name}@sha256:${actual}` });
      } else {
        subs.push({ name: e.name, status: 'pass' });
      }
    }

    const anyFail = subs.some((s) => s.status === 'fail');
    const skipped = subs.filter((s) => s.status === 'skipped');
    const verified = subs.filter((s) => s.status === 'pass');

    if (anyFail) {
      F(id, 'fail', subs.filter((s) => s.status === 'fail').map((s) => s.detail).join(' ; '), [t.label], { edges: subs.length });
    } else if (skipped.length && verified.length === 0) {
      // every referenced input was domain-only and skipped (the 01 case)
      F(id, 'skipped', skipped.map((s) => s.detail).filter(Boolean).join(' ; '), [t.label], { edges: subs.length });
    } else {
      F(id, 'pass', skipped.length ? skipped.map((s) => s.detail).join(' ; ') : null, [t.label], { edges: subs.length });
    }
  }

  return { findings: out, malformedFindings };
}
