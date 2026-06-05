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
import { readFingerprints, readProseFingerprints } from './model.mjs';

function hashBytes(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

// Resolve a fingerprint entry NAME to an on-disk path. Names are specs-relative
// (e.g. '01-event-storming.md', '04-erd.dbml', '06-gherkin/order.feature') OR an
// EXTERNAL free-text input: the domain file (verified via --domain) or the
// product-intent file (verified via --intent). External inputs live outside specs/
// and are marked so the caller can skip honestly when the flag is absent.
function resolveInput(name, specsDir, domainPath, intentPath) {
  // domain file
  if (/^domain\b/i.test(name) || name.endsWith('domain.md')) {
    return { path: domainPath || null, external: 'domain' };
  }
  // product-intent file
  if (/^product-intent\b/i.test(name) || name.endsWith('product-intent.md')) {
    return { path: intentPath || null, external: 'intent' };
  }
  if (domainPath && name === pathBase(domainPath)) return { path: domainPath, external: 'domain' };
  if (intentPath && name === pathBase(intentPath)) return { path: intentPath, external: 'intent' };
  // specs-rooted artifact
  const p = join(specsDir, name);
  return { path: p, external: null };
}

function pathBase(p) {
  return p.split(/[\\/]/).pop();
}

// ENFORCEMENT MIRROR of the pipeline upstream-consumption topology (see PLAN.md).
// Per artifact, the set of upstreams that MUST appear in its fingerprint block
// REGARDLESS of artifact-specific wiring (the "always-expected" set). Validating
// only DECLARED entries is a blind spot: an artifact that simply OMITS an upstream
// would pass staleness vacuously. We enforce this floor so an omission is caught.
//
// Entries are either external tokens ('domain'/'intent' — verified via --domain/
// --intent, but their PRESENCE in the block is still required) or specs-relative
// names matched against each declared entry's normalized name.
//
// NOT enforced here (artifact-specific, so checked only as declared):
//   - 05 is a CONDITIONAL artifact (may be absent entirely);
//   - the per-entity 05 / per-feature 06 / per-model 08 / per-persona 09 entries
//     that 06/08/09/10 consume vary by artifact.
const EXPECTED_UPSTREAMS = {
  '00': ['intent'],
  '01': ['00-impact-map.md', 'domain'],
  '02': ['01-event-storming.md'],
  '03': ['01-event-storming.md', '02-glossary.md'],
  '04dbml': ['02-glossary.md', '03-aggregates.md'],
  '04trans': ['02-glossary.md', '03-aggregates.md'],
  '05': ['01-event-storming.md', '02-glossary.md', '03-aggregates.md', '04-erd.dbml', '04-transitions.md'],
  '06': ['01-event-storming.md', '02-glossary.md', '03-aggregates.md', '04-erd.dbml', '04-transitions.md'],
  '07': ['00-impact-map.md', '01-event-storming.md'],
  '08': ['07-personas.md'],
  '09': ['02-glossary.md', '04-erd.dbml', '04-transitions.md', '07-personas.md'],
  '10': [], // every input (consumed 06/08/09) is artifact-specific
};

// Is a declared fingerprint entry the external `kind` ('domain'|'intent')?
function entryIsExternal(name, kind) {
  if (kind === 'domain') return /^domain\b/i.test(name) || name.endsWith('domain.md');
  if (kind === 'intent') return /^product-intent\b/i.test(name) || name.endsWith('product-intent.md');
  return false;
}

// art: discoverArtifacts() output. Returns findings + malformed flag.
export function stalenessChecks(art, specsDir, domainPath, intentPath) {
  const out = [];
  const malformedFindings = [];

  const F = (id, status, detail, files, extra = {}) =>
    out.push({ id, class: 'staleness', status, reason: status === 'fail' ? 'stale' : (status === 'skipped' ? 'external-input-not-provided' : null), severity: status === 'fail' ? 'error' : null, detail: detail || null, files: files || [], ...extra });

  // each downstream artifact (with a fingerprint block) gets ONE check that
  // walks every referenced input. `prose` marks the 07 dialect (no <!-- --> block).
  const targets = [];
  for (const k of ['00', '01', '02', '03', '04dbml', '04trans']) if (art[k]) targets.push({ key: k, path: art[k].path, ext: art[k].ext, text: art[k].text, label: pathBase(art[k].path) });
  for (const f of (art['05'] || [])) targets.push({ key: '05', path: f.path, ext: '.scxml', text: f.text, label: `05-statecharts/${pathBase(f.path)}` });
  for (const f of (art['06'] || [])) targets.push({ key: '06', path: f.path, ext: '.feature', text: f.text, label: `06-gherkin/${pathBase(f.path)}` });
  if (art['07']) targets.push({ key: '07', path: art['07'].path, ext: '.md', text: art['07'].text, label: pathBase(art['07'].path), prose: true });
  for (const f of (art['08'] || [])) targets.push({ key: '08', path: f.path, ext: '.xml', text: f.text, label: `08-task-models/${pathBase(f.path)}` });
  for (const f of (art['09'] || [])) targets.push({ key: '09', path: f.path, ext: '.xml', text: f.text, label: `09-ui-flows/${pathBase(f.path)}` });
  for (const f of (art['10'] || [])) targets.push({ key: '10', path: f.path, ext: '.feature', text: f.text, label: `10-flow-acceptance/${pathBase(f.path)}` });

  for (const t of targets) {
    const fp = t.prose ? readProseFingerprints(t.text) : readFingerprints(t.text, t.ext);
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

    // EXPECTED-UPSTREAM ENFORCEMENT: a present block that OMITS an always-expected
    // upstream is a `staleness` defect (the staleness blind spot). Reason-qualified
    // per (artifact, missing upstream) so the omission is named, not merely counted.
    const expected = EXPECTED_UPSTREAMS[t.key] || [];
    for (const want of expected) {
      const declared = want === 'domain' || want === 'intent'
        ? fp.entries.some((e) => entryIsExternal(e.name, want))
        : fp.entries.some((e) => e.name === want);
      if (!declared) {
        F(`S-MISSING-FP-${t.label.replace(/[^A-Za-z0-9_.-]/g, '_')}-${String(want).replace(/[^A-Za-z0-9_.-]/g, '_')}`,
          'fail',
          `${t.label} fingerprint block omits always-expected upstream ${want}`,
          [t.label],
          { reason: 'missing-expected-fingerprint' });
      }
    }

    const subs = [];
    for (const e of fp.entries) {
      const res = resolveInput(e.name, specsDir, domainPath, intentPath);
      if (res.external) {
        const flag = res.external === 'domain' ? '--domain' : '--intent';
        if (!res.path) {
          subs.push({ name: e.name, status: 'skipped', detail: `${res.external} fingerprint shape OK; not verified (no ${flag}): ${e.name}@sha256:${e.hash.slice(0, 12)}…` });
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
      // every referenced input was an external free-text input that was skipped
      // (the 00-needs-intent / 01-needs-domain head cases)
      F(id, 'skipped', skipped.map((s) => s.detail).filter(Boolean).join(' ; '), [t.label], { edges: subs.length });
    } else {
      // the verified inputs PASS this check; but if any external input was skipped
      // it must NEVER be silent — surface it as its own `skipped` finding so the
      // skip is visible in the JSON, while the verified inputs still pass.
      F(id, 'pass', null, [t.label], { edges: verified.length });
      if (skipped.length) {
        F(`${id}__ext`, 'skipped', skipped.map((s) => s.detail).join(' ; '), [t.label], { edges: skipped.length });
      }
    }
  }

  return { findings: out, malformedFindings };
}
