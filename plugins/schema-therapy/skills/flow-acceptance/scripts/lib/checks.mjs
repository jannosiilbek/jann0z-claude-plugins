// checks.mjs — the closed mechanical assertion grammar (simulation.md §2/§4). Vendored
// assert-style checks; each returns { id, rule, status:'pass'|'fail'|'warn'|'info',
// detail }. This grammar is NEVER extended ad hoc (§4): adding a check means editing this
// file + simulation.md §4 + citing a catalog rule. The harness wires these into its JSON
// summary. No external assertion lib.

import {
  isLegalTag, isSnake, TASK_MODEL_TAG,
  UI_MECHANICS_RE, URL_RE, CSS_RE, PRONOUN_RE,
  plainTokens, RESTATEMENT_WINDOW_N,
} from './lexicon.mjs';
import { astScenarios, walkSteps, thenShape } from './steps.mjs';

// natural-case a kebab job stem: "fulfil-order" → "Fulfil order".
export function naturalCase(jobStem) {
  const words = String(jobStem).split(/[-_]/).filter(Boolean);
  if (words.length === 0) return '';
  return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ');
}

// the 08 job from a stem <persona>-<job>: everything after the first hyphen.
export function jobFromStem(stem) {
  const i = stem.indexOf('-');
  return i === -1 ? stem : stem.slice(i + 1);
}
export function personaFromStem(stem) {
  const i = stem.indexOf('-');
  return i === -1 ? stem : stem.slice(0, i);
}

// === M-BIJECT / R-BIJECT — directory ↔ 08 bijection (A-a) ===================
export function rBiject(featureStems, modelStems) {
  const fs = [...featureStems].sort();
  const ms = [...modelStems].sort();
  const fset = new Set(fs), mset = new Set(ms);
  const missing = ms.filter((m) => !fset.has(m));      // 08 model with no feature
  const extra = fs.filter((f) => !mset.has(f));        // feature with no 08 model
  // duplicate features collapse in a Set; the harness detects dup filenames separately.
  if (missing.length === 0 && extra.length === 0) return { id: 'R-BIJECT', rule: 'A-a', status: 'pass', edges: 1 };
  const parts = [];
  if (missing.length) parts.push(`08 model(s) with no 10 feature: ${missing.join(', ')}`);
  if (extra.length) parts.push(`10 feature(s) with no 08 model: ${extra.join(', ')}`);
  return { id: 'R-BIJECT', rule: 'A-a', status: 'fail', edges: 1, detail: parts.join('; ') };
}

// === M-FILENAME / R-FILENAME (A-b) =========================================
export function rFilename(fileStem, modelStems) {
  const ok = modelStems.includes(fileStem) && isStemWellFormed(fileStem);
  return ok
    ? { id: 'R-FILENAME', rule: 'A-b', status: 'pass' }
    : { id: 'R-FILENAME', rule: 'A-b', status: 'fail', detail: `file stem "${fileStem}" is not the exact stem of any 08 model (${modelStems.join(', ')})` };
}
function isStemWellFormed(stem) {
  return /^[a-z][a-z0-9_]*(?:-[a-z][a-z0-9_]*)+$/.test(stem);
}

// === M-FEATNAME / W-FEAT (A-c, A-i) ========================================
export function wFeat(feature, fileStem) {
  if (!feature) return { id: 'W-FEAT', rule: 'A-c', status: 'fail', detail: 'no Feature in document' };
  const expected = naturalCase(jobFromStem(fileStem));
  if ((feature.name || '').trim() !== expected) {
    return { id: 'W-FEAT', rule: 'A-c', status: 'fail', detail: `Feature name "${(feature.name || '').trim()}" ≠ natural-cased 08 job "${expected}"` };
  }
  return { id: 'W-FEAT', rule: 'A-c', status: 'pass' };
}

// === M-FINGERPRINT / R-FINGERPRINT (A-d) ===================================
// The leading `# fingerprints:` block: comment lines (from gherkinDocument.comments) BEFORE
// the Feature line, each `<file>@sha256:<64-hex>`, naming every consumed 06 feature + the
// persona 09 model + the 08 model. We check shape + naming, never recompute a digest (§8).
export function rFingerprint(comments, featureLine, { stem, consumed06, persona09File, model08File }) {
  const leading = comments.filter((c) => c.line < featureLine);
  const hasHeader = leading.some((c) => /^\s*#?\s*fingerprints\s*:/.test(c.text));
  if (!hasHeader) {
    return { id: 'R-FINGERPRINT', rule: 'A-d', status: 'fail', detail: `no leading "# fingerprints:" block before Feature (line ${featureLine})` };
  }
  // collect entry lines: `<file>@sha256:<token>` (the label line is skipped).
  const entries = [];
  for (const c of leading) {
    const body = c.text.replace(/^\s*#?\s*/, '');
    if (/^fingerprints\s*:/.test(body)) continue;
    const m = /^(\S+)@sha256:(\S+)\s*$/.exec(body.trim());
    if (m) entries.push({ file: m[1], hash: m[2] });
    else if (body.trim() !== '') entries.push({ file: null, hash: null, raw: body.trim(), malformed: true });
  }
  const malformed = entries.filter((e) => e.malformed);
  if (malformed.length) {
    return { id: 'R-FINGERPRINT', rule: 'A-d', status: 'fail', detail: `malformed fingerprint line(s): ${malformed.map((e) => e.raw).join(' | ')}` };
  }
  const badHash = entries.filter((e) => !/^[0-9a-f]{64}$/.test(e.hash) || /^0{64}$/.test(e.hash));
  if (badHash.length) {
    return { id: 'R-FINGERPRINT', rule: 'A-d', status: 'fail', detail: `fingerprint digest(s) not 64-hex / placeholder: ${badHash.map((e) => `${e.file}@sha256:${e.hash}`).join(', ')}` };
  }
  // naming: every consumed upstream present.
  const named = new Set(entries.map((e) => e.file));
  const required = [...consumed06, persona09File, model08File];
  const missing = required.filter((r) => !named.has(r));
  if (missing.length) {
    return { id: 'R-FINGERPRINT', rule: 'A-d', status: 'fail', detail: `fingerprint block omits consumed upstream(s): ${missing.join(', ')}` };
  }
  return { id: 'R-FINGERPRINT', rule: 'A-d', status: 'pass' };
}

// === M-FEATTAG / R-FEATTAG (A-e) ===========================================
export function rFeatTag(featureTags, fileStem, modelStems) {
  const taskTags = (featureTags || []).filter((t) => t.startsWith('@task-model:'));
  if (taskTags.length === 0) {
    return { id: 'R-FEATTAG', rule: 'A-e', status: 'fail', detail: 'Feature lacks a @task-model: tag' };
  }
  for (const t of taskTags) {
    if (!TASK_MODEL_TAG.test(t)) {
      return { id: 'R-FEATTAG', rule: 'A-e', status: 'fail', detail: `@task-model: tag malformed: "${t}"` };
    }
    const stem = t.slice('@task-model:'.length);
    if (stem !== fileStem || !modelStems.includes(stem)) {
      return { id: 'R-FEATTAG', rule: 'A-e', status: 'fail', detail: `@task-model:${stem} does not resolve to this file's 08 model (stem "${fileStem}")` };
    }
  }
  return { id: 'R-FEATTAG', rule: 'A-e', status: 'pass' };
}

// === W-INST (A-f, A-g) — non-empty pickle set ==============================
export function wInst(pickles) {
  if (!pickles || pickles.length === 0) {
    return { id: 'W-INST', rule: 'A-f', status: 'fail', detail: 'feature compiles to ZERO pickles (vacuous: a Feature with no executable scenario)' };
  }
  return { id: 'W-INST', rule: 'A-f', status: 'pass' };
}

// === M-THEN-SHAPE / R-THENSHAPE (C-c) ======================================
// Every Then-role step is navigation OR outcome. Runs over the AST step roles.
export function rThenShape(background, scenarios) {
  const offenders = [];
  for (const sc of scenarios) {
    const steps = walkSteps(background, sc);
    for (const s of steps) {
      if (s.role !== 'Then') continue;
      if (thenShape(s) === 'other') offenders.push(s.text);
    }
  }
  if (offenders.length === 0) return { id: 'R-THENSHAPE', rule: 'C-c', status: 'pass' };
  return { id: 'R-THENSHAPE', rule: 'C-c', status: 'fail', detail: `Then-step(s) neither navigation nor outcome (prose assertion): ${offenders.map((o) => `"${o}"`).join('; ')}` };
}

// === M-WHEN-FORM / R-WHENFORM (B-e, D-b) ===================================
// Each When-role interaction matches exactly one pinned form, one interaction (no `… and …`
// chaining two events). Shape-only (Event-kind correctness is V-EVENT).
export function rWhenForm(background, scenarios) {
  const offenders = [];
  for (const sc of scenarios) {
    const steps = walkSteps(background, sc);
    for (const s of steps) {
      if (s.role !== 'When') continue;
      if (s.cls.kind !== 'interaction') {
        offenders.push(`"${s.text}" (not a pinned interaction form)`);
        continue;
      }
      // chaining: count quoted runs / `: "` occurrences; an embedded-form with " and "
      // joining two clauses is a chain.
      if (/\band\b.*\bthe\b.*(?:triggers|: ")/.test(s.text)) {
        offenders.push(`"${s.text}" (chains two interactions)`);
      }
    }
  }
  if (offenders.length === 0) return { id: 'R-WHENFORM', rule: 'B-e', status: 'pass' };
  return { id: 'R-WHENFORM', rule: 'B-e', status: 'fail', detail: `When-step form violation(s): ${offenders.join('; ')}` };
}

// === M-ONEWHEN (D-b) — single interaction per When =========================
export function mOneWhen(background, scenarios) {
  const offenders = [];
  for (const sc of scenarios) {
    const steps = walkSteps(background, sc);
    for (const s of steps) {
      if (s.role !== 'When') continue;
      // a When joining two actions: " and " between two verb clauses, OR two quoted event
      // tokens.
      const quotedCount = (s.text.match(/"/g) || []).length / 2;
      if (quotedCount > 1 || /\b(and|then)\b\s+(?:the\s+\w+\s+)?(?:triggers|opens|starts|dispatches|cancels)/i.test(s.text)) {
        offenders.push(s.text);
      }
    }
  }
  if (offenders.length === 0) return { id: 'M-ONEWHEN', rule: 'D-b', status: 'pass' };
  return { id: 'M-ONEWHEN', rule: 'D-b', status: 'fail', detail: `When chains two events: ${offenders.map((o) => `"${o}"`).join('; ')}` };
}

// === M-PERSONA / R-PERSONA (E-a) ===========================================
// Every step names the actor with the exact 09 persona value; no pronoun.
export function rPersona(background, scenarios, persona09) {
  const offenders = [];
  for (const sc of scenarios) {
    const steps = walkSteps(background, sc);
    for (const s of steps) {
      if (PRONOUN_RE.test(s.text)) { offenders.push(`"${s.text}" (personal pronoun)`); continue; }
      const named = s.cls.persona;
      // outcome steps name no persona; skip them.
      if (s.cls.kind === 'outcome') continue;
      if (named == null) continue; // unknown-shape steps caught elsewhere
      if (named !== persona09) offenders.push(`"${s.text}" (names "${named}", not 09 persona "${persona09}")`);
    }
  }
  if (offenders.length === 0) return { id: 'R-PERSONA', rule: 'E-a', status: 'pass' };
  return { id: 'R-PERSONA', rule: 'E-a', status: 'fail', detail: `persona naming violation(s): ${offenders.join('; ')}` };
}

// === M-NO06BODY / R-NO06BODY (E-d, E-c) ====================================
// No 10 step reproduces a 06 scenario body (≥6 consecutive verbatim tokens from a single 06
// step). Mandated verbatim 09 01-event spans are masked first (E-c exemption).
export function rNo06Body(background, scenarios, sixtuplesFrom06, verbatimSpans) {
  const spanTokenRuns = (verbatimSpans || []).map((s) => plainTokens(s));
  const offenders = [];
  for (const sc of scenarios) {
    const steps = walkSteps(background, sc);
    for (const s of steps) {
      let toks = plainTokens(s.text);
      // mask any contiguous run equal to a mandated verbatim span.
      toks = maskSpans(toks, spanTokenRuns);
      for (let i = 0; i + RESTATEMENT_WINDOW_N <= toks.length; i++) {
        const win = toks.slice(i, i + RESTATEMENT_WINDOW_N);
        if (win.includes(' ')) continue;
        if (sixtuplesFrom06.has(win.join(' '))) {
          offenders.push(`"${s.text}" (copies a 06 scenario body span: ${win.join(' ')})`);
          break;
        }
      }
    }
  }
  if (offenders.length === 0) return { id: 'R-NO06BODY', rule: 'E-d', status: 'pass' };
  return { id: 'R-NO06BODY', rule: 'E-d', status: 'fail', detail: offenders.join('; ') };
}
function maskSpans(toks, spanRuns) {
  const out = toks.slice();
  for (const run of spanRuns) {
    if (run.length === 0) continue;
    for (let i = 0; i + run.length <= out.length; i++) {
      let match = true;
      for (let j = 0; j < run.length; j++) if (out[i + j] !== run[j]) { match = false; break; }
      if (match) for (let j = 0; j < run.length; j++) out[i + j] = ' ';
    }
  }
  return out;
}
// build the 06 six-token span set from raw 06 feature texts (step lines only).
export function sixtuplesFrom06Features(featureTexts) {
  const set = new Set();
  for (const text of featureTexts) {
    for (const line of String(text).split(/\r?\n/)) {
      const m = /^\s*(Given|When|Then|And|But)\s+(.*)$/.exec(line);
      if (!m) continue;
      const toks = plainTokens(m[2]);
      for (let i = 0; i + RESTATEMENT_WINDOW_N <= toks.length; i++) {
        set.add(toks.slice(i, i + RESTATEMENT_WINDOW_N).join(' '));
      }
    }
  }
  return set;
}

// === M-DECLARATIVE / R-DECLARATIVE (B-f, D-a) ==============================
export function rDeclarative(background, scenarios, verbatimSpans) {
  const offenders = [];
  for (const sc of scenarios) {
    const steps = walkSteps(background, sc);
    for (const s of steps) {
      // mask the mandated verbatim 01-event span (E-c) before the blocklist scan.
      let probe = s.text;
      for (const span of verbatimSpans || []) {
        if (span && probe.includes(span)) probe = probe.split(span).join(' ');
      }
      if (UI_MECHANICS_RE.test(probe) || URL_RE.test(probe) || CSS_RE.test(probe)) {
        offenders.push(s.text);
      }
    }
  }
  if (offenders.length === 0) return { id: 'R-DECLARATIVE', rule: 'B-f', status: 'pass' };
  return { id: 'R-DECLARATIVE', rule: 'B-f', status: 'fail', detail: `UI-mechanics token(s) below the screen-id abstraction: ${offenders.map((o) => `"${o}"`).join('; ')}` };
}

// === M-GWT (D-c) — role-order discipline ====================================
// Per scenario the step role sequence is Context (Action Outcome*)* — no Outcome before the
// first Action, no leading And/But with no primary, no Action in an Outcome position.
export function mGwt(background, scenarios) {
  const offenders = [];
  for (const sc of scenarios) {
    const steps = walkSteps(background, sc);
    let sawAction = false;
    for (const s of steps) {
      if (s.role == null) { offenders.push(`${sc.title}: leading "${s.rawKeyword}" with no primary keyword`); break; }
      if (s.role === 'When') sawAction = true;
      if (s.role === 'Then' && !sawAction) { offenders.push(`${sc.title}: Then before any When`); break; }
    }
  }
  if (offenders.length === 0) return { id: 'M-GWT', rule: 'D-c', status: 'pass' };
  return { id: 'M-GWT', rule: 'D-c', status: 'fail', detail: offenders.join('; ') };
}

// === warn-only mechanical checks (M-TITLE, M-BACKGROUND, M-LANG, M-DESC, M-INCIDENTAL) =====
const MECHANICAL_TITLE_BAD = /^(walk the screens|test |click through|untitled|scenario\b)/i;
export function mTitle(scenarios) {
  const bad = scenarios.filter((sc) => !sc.title || !sc.title.trim() || MECHANICAL_TITLE_BAD.test(sc.title.trim()));
  if (bad.length === 0) return { id: 'M-TITLE', rule: 'D-e', status: 'pass' };
  return { id: 'M-TITLE', rule: 'D-e', status: 'warn', detail: `mechanical/empty scenario title(s): ${bad.map((b) => `"${b.title}"`).join(', ')}` };
}
export function mBackground(background) {
  if (!background) return { id: 'M-BACKGROUND', rule: 'D-d', status: 'pass' };
  const nonGiven = background.steps.filter((s) => s.keyword === 'When' || s.keyword === 'Then');
  if (nonGiven.length === 0) return { id: 'M-BACKGROUND', rule: 'D-d', status: 'pass' };
  return { id: 'M-BACKGROUND', rule: 'D-d', status: 'warn', detail: 'Background contains When/Then steps' };
}
export function mLang(src) {
  const m = /^\s*#\s*language\s*:\s*(\S+)/m.exec(src);
  if (!m || m[1] === 'en') return { id: 'M-LANG', rule: 'A-h', status: 'pass' };
  return { id: 'M-LANG', rule: 'A-h', status: 'warn', detail: `non-en language header: ${m[1]}` };
}
export function mDesc(feature) {
  const desc = (feature && feature.description) ? feature.description : '';
  if (!desc.trim()) return { id: 'M-DESC', rule: 'A-j', status: 'pass' };
  // a domain-assertion dump: contains a tag-like token or a nav table marker.
  if (/@(invariant|transition|terminal|policy):/.test(desc) || /NavigationFlow|ViewContainer|<Task/.test(desc)) {
    return { id: 'M-DESC', rule: 'A-j', status: 'warn', detail: 'Feature description dumps upstream / restates a domain assertion' };
  }
  return { id: 'M-DESC', rule: 'A-j', status: 'pass' };
}
export function mIncidental(background, scenarios) {
  const offenders = [];
  for (const sc of scenarios) {
    const steps = walkSteps(background, sc);
    for (const s of steps) {
      if (/\b\d{4}-\d{2}-\d{2}\b|@[\w.]+@|\b[0-9a-f]{8,}\b/.test(s.text)) offenders.push(s.text);
    }
  }
  if (offenders.length === 0) return { id: 'M-INCIDENTAL', rule: 'D-f', status: 'pass' };
  return { id: 'M-INCIDENTAL', rule: 'D-f', status: 'info', detail: `incidental detail: ${offenders.map((o) => `"${o}"`).join('; ')}` };
}

// === X-RECON (reconciliation) ==============================================
export function checkXRecon(totalChecks, edgesWalked, edgesExpected, engineRun, replayRun, featureCount) {
  if (totalChecks === 0) return { status: 'fail', detail: 'zero checks executed' };
  if (edgesWalked !== edgesExpected) return { status: 'fail', detail: `edgesWalked ${edgesWalked} ≠ edgesExpected ${edgesExpected} (a check was silently dropped)` };
  if (featureCount > 0 && engineRun === 0) return { status: 'fail', detail: 'features present but engine layer ran zero checks' };
  if (featureCount > 0 && replayRun === 0) return { status: 'fail', detail: 'features present but replay layer ran zero checks' };
  return { status: 'pass', detail: '' };
}

// re-export helpers the harness uses
export { astScenarios, walkSteps };
