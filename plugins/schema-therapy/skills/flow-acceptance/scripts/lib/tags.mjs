// tags.mjs — the minimal 06 tag-scanner (simulation.md §1 "06 tag-scanner"). COPIED PATTERN
// from the `08` (task-models) tags.mjs — never imported (isolation directive). A line
// scanner over each 06 `.feature`: collect every `@…` token on tag lines that immediately
// precede a `Scenario:`/`Scenario Outline:` keyword. NO Gherkin parser over the 06 files —
// single-ownership: the 06 harness owns full `.feature` parsing (§9); 10 reads 06 ONLY for
// its tag set (the resolvable 06 tag vocabulary 10's outcome bindings resolve against,
// C-a/E-b).

import { isLegalTag } from './lexicon.mjs';

function isTagLine(line) {
  const trimmed = line.trim();
  if (trimmed === '' || !trimmed.startsWith('@')) return false;
  return trimmed.split(/\s+/).every((tok) => tok.startsWith('@'));
}
function isScenarioKeyword(line) {
  return /^\s*(Scenario Outline|Scenario)\s*:/.test(line);
}

// scanFeature(text) → { tags:Set, scenarioCount, ok }
export function scanFeature(text) {
  const lines = String(text == null ? '' : text).split(/\r?\n/);
  const tags = new Set();
  let scenarioCount = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!isScenarioKeyword(lines[i])) continue;
    scenarioCount++;
    let j = i - 1;
    while (j >= 0 && isTagLine(lines[j])) {
      for (const tok of lines[j].trim().split(/\s+/)) tags.add(tok);
      j--;
    }
  }
  return { tags, scenarioCount, ok: scenarioCount > 0 };
}

// scanDir(features) → { ok, tags06:Set, badTags:[{feature,tag}], unscannable:[feature] }
//   features — [{ name, text }] (name = basename, text = file content)
//   ok       — false if ANY feature is unscannable (no Scenario keyword) ⇒ broken-test
export function scanDir(features) {
  const tags06 = new Set();
  const badTags = [];
  const unscannable = [];
  for (const { name, text } of features) {
    const r = scanFeature(text);
    if (!r.ok) { unscannable.push(name); continue; }
    for (const tag of r.tags) {
      tags06.add(tag);
      if (!isLegalTag(tag)) badTags.push({ feature: name, tag });
    }
  }
  return { ok: unscannable.length === 0, tags06, badTags, unscannable };
}
