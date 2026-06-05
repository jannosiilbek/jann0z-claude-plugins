// steps.mjs — the pinned step-grammar matcher (simulation.md §3.1 "Derived scenario graph").
// Derives, from each parsed 10 `.feature` (AST + pickles), the per-scenario ORDERED walk
// step list, classifying each pickle step into the closed step grammar
// {location|interaction|navigation|outcome|unknown} and extracting screen ids / event
// refs / embedded 01-event strings / 06 tags. Also exposes the AST-level keyword sequence
// (Given/When/Then/And/But) the M-GWT / M-THEN-SHAPE / M-WHEN-FORM mechanical gates read.
//
// The pickle step text is the fully-rendered step line with the keyword stripped (the §0
// recorded fact); the pickle step.type is Context|Action|Outcome. We pair the pickle step
// order with the AST step keywords (And/But inherit the role of the preceding primary
// keyword) so the role gate can run over the rendered text.

import { classifyStep } from './lexicon.mjs';

// Extract, from a GherkinDocument feature, the list of scenarios with their AST steps
// (keyword + text). Background steps are folded into each scenario's prefix (the pickle
// already does this, but we read the AST to recover keyword roles).
export function astScenarios(feature) {
  if (!feature) return { background: null, scenarios: [] };
  let background = null;
  const scenarios = [];
  for (const child of feature.children || []) {
    if (child.background) {
      background = {
        steps: (child.background.steps || []).map((s) => ({ keyword: (s.keyword || '').trim(), text: s.text })),
      };
    } else if (child.scenario) {
      scenarios.push({
        title: child.scenario.name,
        keyword: child.scenario.keyword,
        tags: (child.scenario.tags || []).map((t) => t.name),
        steps: (child.scenario.steps || []).map((s) => ({ keyword: (s.keyword || '').trim(), text: s.text })),
      });
    }
  }
  return { background, scenarios };
}

// Resolve each step's ROLE keyword (And/But/* inherit the preceding primary keyword).
// Returns steps with { keyword (primary: Given|When|Then), rawKeyword, text }.
export function resolveRoles(steps) {
  const out = [];
  let current = null;
  for (const s of steps) {
    const kw = s.keyword;
    if (kw === 'Given' || kw === 'When' || kw === 'Then') current = kw;
    // And/But/* keep `current`; a leading And/But (no primary yet) stays null (caught by M-GWT).
    out.push({ keyword: current, rawKeyword: kw, text: s.text });
  }
  return out;
}

// Build the ordered walk-step list for one scenario: each entry
//   { role (Given|When|Then|null), rawKeyword, text, cls (classifyStep result) }
// The cls carries kind + extracted tokens. Background steps prefix the scenario steps.
export function walkSteps(background, scenario) {
  const all = [];
  if (background) for (const s of background.steps) all.push(s);
  for (const s of scenario.steps) all.push(s);
  const roled = resolveRoles(all);
  return roled.map((s) => ({
    role: s.keyword,
    rawKeyword: s.rawKeyword,
    text: s.text,
    cls: classifyStep(s.keyword, s.text),
  }));
}

// classify a Then-position step (for M-THEN-SHAPE): a Then/And/But whose ROLE is Then must
// be a navigation OR an outcome. Returns 'navigation' | 'outcome' | 'other'.
export function thenShape(step) {
  if (step.cls.kind === 'navigation') return 'navigation';
  if (step.cls.kind === 'outcome') return 'outcome';
  return 'other';
}
