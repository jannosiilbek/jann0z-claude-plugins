// tags.mjs — the minimal 06 tag-scanner (simulation.md §1 "06 tag-scanner"). A line
// scanner over each `.feature`: collect every `@…` token on tag lines that immediately
// precede a `Scenario:`/`Scenario Outline:` keyword. NO Gherkin parser — single-ownership:
// the 06 harness owns full `.feature` parsing (steps, examples, backgrounds). 08 reads 06
// ONLY for the tag set needed for E4/E5 resolution.
//
// Produces the `tags06` set (E4) + the per-tag→feature index (E7) + a per-feature
// scenario count (the B3/M26 advisory) + the list of grammar-violating tags (the §9
// bad-tag-06 upstream-defect precheck).

import { isLegalTag } from './lexicon.mjs';

// A tag line: every whitespace-separated token begins with `@`.
function isTagLine(line) {
  const trimmed = line.trim();
  if (trimmed === '' || !trimmed.startsWith('@')) return false;
  return trimmed.split(/\s+/).every((tok) => tok.startsWith('@'));
}

function isScenarioKeyword(line) {
  return /^\s*(Scenario Outline|Scenario)\s*:/.test(line);
}

// scanFeature(text) → { tags:Set, scenarioCount, allTags:Set }
//   tags          — tokens on tag lines IMMEDIATELY preceding a Scenario keyword
//   scenarioCount — number of Scenario / Scenario Outline keywords
//   ok            — false if the file carries no scannable Scenario keyword (unscannable)
export function scanFeature(text) {
  const lines = String(text == null ? '' : text).split(/\r?\n/);
  const tags = new Set();
  let scenarioCount = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!isScenarioKeyword(lines[i])) continue;
    scenarioCount++;
    // walk backwards over the contiguous run of tag lines immediately above.
    let j = i - 1;
    // skip blank lines between tags and the Scenario keyword? The pinned convention
    // places tag lines IMMEDIATELY preceding the keyword; we accept a contiguous run
    // (no blank in between) to stay strict.
    while (j >= 0 && isTagLine(lines[j])) {
      for (const tok of lines[j].trim().split(/\s+/)) tags.add(tok);
      j--;
    }
  }
  return { tags, scenarioCount, ok: scenarioCount > 0 };
}

// scanDir(features) → { ok, tags06:Set, tagFile06:Map(tag→Set(feature)),
//                       featureScenarioCount06:Map(feature→N), badTags:[{feature, tag}],
//                       unscannable:[feature] }
//   features — [{ name, text }] (name = basename, text = file content)
//   ok       — false if ANY feature is unscannable (no Scenario keyword) ⇒ broken-test
//   badTags  — tags matching NO closed grammar class (§9 bad-tag-06 precheck → the feature)
export function scanDir(features) {
  const tags06 = new Set();
  const tagFile06 = new Map();
  const featureScenarioCount06 = new Map();
  const badTags = [];
  const unscannable = [];

  for (const { name, text } of features) {
    const r = scanFeature(text);
    featureScenarioCount06.set(name, r.scenarioCount);
    if (!r.ok) { unscannable.push(name); continue; }
    for (const tag of r.tags) {
      tags06.add(tag);
      if (!tagFile06.has(tag)) tagFile06.set(tag, new Set());
      tagFile06.get(tag).add(name);
      if (!isLegalTag(tag)) badTags.push({ feature: name, tag });
    }
  }

  return {
    ok: unscannable.length === 0,
    tags06,
    tagFile06,
    featureScenarioCount06,
    badTags,
    unscannable,
  };
}
