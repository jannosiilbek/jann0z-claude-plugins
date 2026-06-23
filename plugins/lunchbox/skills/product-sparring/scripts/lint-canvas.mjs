#!/usr/bin/env node
/**
 * lint-canvas.mjs
 *
 * Validates a product canvas entry before it is written to product.md.
 *
 * Usage:
 *   node lint-canvas.mjs --canvas <path>              # lint full existing canvas
 *   node lint-canvas.mjs --canvas <path> --entry <md> # lint candidate entry against canvas style
 *
 * Exit codes: 0 = pass, 1 = violations found
 */

import { readFileSync } from 'fs';
import { argv } from 'process';

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

const args = argv.slice(2);
const canvasPath = argValue(args, '--canvas');
const rawEntry = argValue(args, '--entry');

if (!canvasPath) {
  console.error('Usage: lint-canvas.mjs --canvas <path> [--entry <markdown>]');
  process.exit(1);
}

function argValue(args, flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

// ---------------------------------------------------------------------------
// Parse canvas
// ---------------------------------------------------------------------------

function parseCanvas(text) {
  const entries = [];
  const sections = text.split(/^(?=### )/m);
  for (const section of sections) {
    if (!section.startsWith('### ')) continue;
    const nameMatch = section.match(/^### (.+)/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();
    const what = fieldValue(section, 'What');
    const why = fieldValue(section, 'Why it matters');
    const constraint = fieldValue(section, 'Sharpest constraint');
    const enabledBy = fieldValue(section, 'Enabled by');
    if (what !== null || why !== null || constraint !== null) {
      entries.push({ name, what, why, constraint, enabledBy, raw: section });
    }
  }
  return entries;
}

function fieldValue(text, fieldName) {
  const re = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+?)(?=\\n\\*\\*|$)`, 's');
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

// ---------------------------------------------------------------------------
// Sentence counting (simple but robust for single-paragraph values)
// ---------------------------------------------------------------------------

function countSentences(text) {
  if (!text) return 0;
  // Split on sentence-ending punctuation followed by space or end of string
  const cleaned = text.trim();
  const matches = cleaned.match(/[^.!?]*[.!?]+/g);
  return matches ? matches.length : (cleaned.length > 0 ? 1 : 0);
}

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Lint rules
// ---------------------------------------------------------------------------

const VERB_PREFIX = /^(add|build|create|implement|enable|allow|support|make|provide|give|let|show|display|update|change|fix|remove|introduce|integrate|improve|extend|handle)\b/i;
const CONVERSATION_REFS = /\b(as discussed|as mentioned|as we said|as noted|building on|from earlier|previously|in our conversation|we talked about)\b/i;
const SUBBULLET = /^[ \t]*[-*•]/m;

function lintEntry(entry, existingEntries) {
  const violations = [];
  const { name, what, why, constraint } = entry;

  // --- Structural: all fields present ---
  if (!name || name.length === 0) violations.push('Missing feature name (### heading)');
  if (!what) violations.push('Missing **What:** field');
  if (!why) violations.push('Missing **Why it matters:** field');
  if (!constraint) violations.push('Missing **Sharpest constraint:** field');

  if (violations.length > 0) return violations; // can't continue

  // --- Feature name: noun phrase, ≤4 words, no verb prefix ---
  const nameWords = name.split(/\s+/).filter(Boolean);
  if (nameWords.length > 4) {
    violations.push(`Feature name too long (${nameWords.length} words, max 4): "${name}"`);
  }
  if (VERB_PREFIX.test(name)) {
    violations.push(`Feature name starts with a verb: "${name}" — use a noun phrase (e.g. "Dark mode" not "Add dark mode")`);
  }

  // --- What: exactly 1 sentence ---
  const whatSentences = countSentences(what);
  if (whatSentences !== 1) {
    violations.push(`**What** must be exactly 1 sentence (found ${whatSentences}): "${what}"`);
  }

  // --- Why it matters: 1–2 sentences ---
  const whySentences = countSentences(why);
  if (whySentences < 1 || whySentences > 2) {
    violations.push(`**Why it matters** must be 1–2 sentences (found ${whySentences}): "${why}"`);
  }

  // --- Sharpest constraint: exactly 1 sentence ---
  const constraintSentences = countSentences(constraint);
  if (constraintSentences !== 1) {
    violations.push(`**Sharpest constraint** must be exactly 1 sentence (found ${constraintSentences}): "${constraint}"`);
  }

  // --- Enabled by: optional, but if present must be a single line ---
  const { enabledBy } = entry;
  if (enabledBy !== null) {
    if (enabledBy.includes('\n')) {
      violations.push('**Enabled by** must be a single line — no multi-line values');
    }
    if (countSentences(enabledBy) > 2) {
      violations.push('**Enabled by** should be a brief tech note, not multiple sentences');
    }
    if (CONVERSATION_REFS.test(enabledBy)) {
      violations.push('**Enabled by** contains a conversation reference — entries must stand alone');
    }
  }

  // --- No conversation references ---
  for (const [label, value] of [['What', what], ['Why it matters', why], ['Sharpest constraint', constraint]]) {
    if (CONVERSATION_REFS.test(value)) {
      violations.push(`**${label}** contains a conversation reference — entries must stand alone`);
    }
  }

  // --- No sub-bullets ---
  const bodyText = `${what}\n${why}\n${constraint}\n${enabledBy ?? ''}`;
  if (SUBBULLET.test(bodyText)) {
    violations.push('Entry contains sub-bullets — use prose only');
  }

  // --- Style gate: word count calibration ---
  if (existingEntries.length > 0) {
    const avgs = computeAverages(existingEntries);
    const checks = [
      ['What', what, avgs.what],
      ['Why it matters', why, avgs.why],
      ['Sharpest constraint', constraint, avgs.constraint],
    ];
    for (const [label, value, avg] of checks) {
      if (avg === null) continue;
      const count = countWords(value);
      const min = Math.floor(avg * 0.8);
      const max = Math.ceil(avg * 1.2);
      if (count < min || count > max) {
        violations.push(
          `**${label}** word count (${count}) is outside style range ${min}–${max} ` +
          `(existing avg ${Math.round(avg)} words) — adjust to match canvas register`
        );
      }
    }
  }

  return violations;
}

function computeAverages(entries) {
  const valid = entries.filter(e => e.what && e.why && e.constraint);
  if (valid.length === 0) return { what: null, why: null, constraint: null };
  const sum = (fn) => valid.reduce((acc, e) => acc + fn(e), 0);
  return {
    what: sum(e => countWords(e.what)) / valid.length,
    why: sum(e => countWords(e.why)) / valid.length,
    constraint: sum(e => countWords(e.constraint)) / valid.length,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let canvasText = '';
try {
  canvasText = readFileSync(canvasPath, 'utf8');
} catch {
  // Canvas doesn't exist yet — that's fine for new canvases
  canvasText = '';
}

const existingEntries = parseCanvas(canvasText);

if (rawEntry) {
  // Lint a candidate entry against the existing canvas
  const candidate = parseCanvas(`# dummy\n## Features\n${rawEntry}`);

  if (candidate.length === 0) {
    console.error('Could not parse entry. Ensure it starts with ### and has all three fields.');
    process.exit(1);
  }

  const violations = lintEntry(candidate[0], existingEntries);

  if (violations.length === 0) {
    console.log('PASS');
    process.exit(0);
  } else {
    console.log('FAIL');
    violations.forEach(v => console.log(`  • ${v}`));
    process.exit(1);
  }
} else {
  // Lint the full canvas (all existing entries)
  let allViolations = [];
  for (const entry of existingEntries) {
    const others = existingEntries.filter(e => e !== entry);
    const violations = lintEntry(entry, others);
    if (violations.length > 0) {
      allViolations.push({ entry: entry.name, violations });
    }
  }

  if (allViolations.length === 0) {
    console.log(`PASS — ${existingEntries.length} entries checked`);
    process.exit(0);
  } else {
    console.log(`FAIL — ${allViolations.length} of ${existingEntries.length} entries have violations`);
    for (const { entry, violations } of allViolations) {
      console.log(`\n  ### ${entry}`);
      violations.forEach(v => console.log(`    • ${v}`));
    }
    process.exit(1);
  }
}
