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
 * Canvas structure: features use #### headings, grouped under ### section headings.
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

function argValue(list, flag) {
  const idx = list.indexOf(flag);
  return idx !== -1 ? list[idx + 1] : null;
}

function detectSectionType(h2) {
  const normalized = h2.trim().toLowerCase();
  if (normalized === 'personas') return 'personas';
  if (normalized === 'technical constraints') return 'technical-constraints';
  if (normalized === 'glossary') return 'glossary';
  if (normalized === 'features') return 'features';
  return null;
}

function detectEntryType(block) {
  if (fieldValue(block, 'Role') !== null || fieldValue(block, 'Goal') !== null || fieldValue(block, 'Friction') !== null) return 'personas';
  if (fieldValue(block, 'Shapes') !== null) return 'technical-constraints';
  if (fieldValue(block, 'Means') !== null) return 'glossary';
  return 'features';
}

function parseEntryFields(block, name, sectionType, group) {
  if (sectionType === 'personas') {
    const role = fieldValue(block, 'Role');
    const goal = fieldValue(block, 'Goal');
    const access = fieldValue(block, 'Access');
    const friction = fieldValue(block, 'Friction');
    if (role !== null || goal !== null || access !== null || friction !== null) {
      return { name, sectionType, group, role, goal, access, friction, raw: block };
    }
  } else if (sectionType === 'technical-constraints') {
    const what = fieldValue(block, 'What');
    const shapes = fieldValue(block, 'Shapes');
    const lockedBy = fieldValue(block, 'Locked by');
    if (what !== null || shapes !== null) {
      return { name, sectionType, group, what, shapes, lockedBy, raw: block };
    }
  } else if (sectionType === 'glossary') {
    const means = fieldValue(block, 'Means');
    const disambiguates = fieldValue(block, 'Disambiguates');
    if (means !== null) {
      return { name, sectionType, group, means, disambiguates, raw: block };
    }
  } else {
    const what = fieldValue(block, 'What');
    const why = fieldValue(block, 'Why it matters');
    const constraint = fieldValue(block, 'Sharpest constraint');
    const enabledBy = fieldValue(block, 'Enabled by');
    if (what !== null || why !== null || constraint !== null) {
      return { name, sectionType: 'features', group, what, why, constraint, enabledBy, raw: block };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Parse canvas — entries are #### headings, groups are ### headings, sections are ## headings
// ---------------------------------------------------------------------------

function parseCanvas(text) {
  const entries = [];
  let currentSectionType = null;
  let currentGroup = null;
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^## /.test(line)) {
      currentSectionType = detectSectionType(line.replace(/^## /, '').trim());
      currentGroup = null;
      i++;
      continue;
    }

    if (/^### /.test(line)) {
      currentGroup = line.replace(/^### /, '').trim();
      i++;
      continue;
    }

    if (/^#### /.test(line)) {
      const blockLines = [line];
      i++;
      while (i < lines.length && !/^#{1,4} /.test(lines[i])) {
        blockLines.push(lines[i]);
        i++;
      }
      const block = blockLines.join('\n');
      const name = line.replace(/^#### /, '').trim();
      const sectionType = currentSectionType ?? detectEntryType(block);
      const entry = parseEntryFields(block, name, sectionType, currentGroup);
      if (entry) entries.push(entry);
      continue;
    }

    i++;
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Section structure parsing
// ---------------------------------------------------------------------------

function extractFeaturesBlock(text) {
  const lines = text.split('\n');
  let inFeatures = false;
  const result = [];
  for (const line of lines) {
    if (/^## Features\s*$/.test(line)) { inFeatures = true; continue; }
    if (inFeatures && /^## /.test(line)) break;
    if (inFeatures) result.push(line);
  }
  return result.join('\n');
}

function parseCanvasSections(text) {
  const featuresBlock = extractFeaturesBlock(text);
  const sections = [];
  const orphaned = [];
  let currentSection = null;

  for (const line of featuresBlock.split('\n')) {
    if (/^### /.test(line)) {
      currentSection = { name: line.replace(/^### /, '').trim(), features: [] };
      sections.push(currentSection);
    } else if (/^#### /.test(line)) {
      const featureName = line.replace(/^#### /, '').trim();
      if (!currentSection) {
        orphaned.push(featureName);
      } else {
        currentSection.features.push(featureName);
      }
    }
  }

  return { sections, orphaned };
}

// Detect features written with the old ### heading (pre-section format).
// A ### block is old-format only if it has feature fields AND no #### children
// (a valid section header's block will contain its child #### features).
function detectOldFormatEntries(text) {
  const warnings = [];
  const parts = text.split(/^(?=### )/m);
  for (const part of parts) {
    if (!part.startsWith('### ')) continue;
    const nameMatch = part.match(/^### (.+)/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();
    const hasChildFeatures = /^#### /m.test(part);
    if (!hasChildFeatures && (fieldValue(part, 'What') !== null || fieldValue(part, 'Why it matters') !== null)) {
      warnings.push(`"${name}" uses old ### heading — features now use #### headings inside a ### section`);
    }
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Field extraction
// ---------------------------------------------------------------------------

function fieldValue(text, fieldName) {
  const re = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+?)(?=\\n\\*\\*|$)`, 's');
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

// ---------------------------------------------------------------------------
// Sentence / word counting
// ---------------------------------------------------------------------------

function countSentences(text) {
  if (!text) return 0;
  const cleaned = text.trim();
  const matches = cleaned.match(/[^.!?]*[.!?]+/g);
  return matches ? matches.length : (cleaned.length > 0 ? 1 : 0);
}

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Structural lint (canvas-level)
// ---------------------------------------------------------------------------

const VERB_PREFIX = /^(add|build|create|implement|enable|allow|support|make|provide|give|let|show|display|update|change|fix|remove|introduce|integrate|improve|extend|handle)\b/i;

function lintCanvasStructure(text) {
  const violations = [];
  const { sections, orphaned } = parseCanvasSections(text);

  for (const feature of orphaned) {
    violations.push(`Feature "${feature}" is not inside any section — every feature must be under a ### section header`);
  }

  for (const section of sections) {
    if (section.features.length === 0) {
      violations.push(`Section "${section.name}" is empty — add a feature or remove the section`);
    }
    const nameWords = section.name.split(/\s+/).filter(Boolean);
    if (nameWords.length > 3) {
      violations.push(`Section name "${section.name}" is too long (${nameWords.length} words, max 3)`);
    }
    if (VERB_PREFIX.test(section.name)) {
      violations.push(`Section name "${section.name}" starts with a verb — use a noun phrase`);
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Entry lint (field-level)
// ---------------------------------------------------------------------------

const CONVERSATION_REFS = /\b(as discussed|as mentioned|as we said|as noted|building on|from earlier|previously|in our conversation|we talked about)\b/i;
const SUBBULLET = /^[ \t]*[-*•]/m;

function lintEntry(entry, existingEntries) {
  const violations = [];
  const { name, sectionType, what, why, constraint } = entry;

  // Non-feature entries (personas, technical-constraints, glossary) have their
  // own field shapes — feature-specific validation does not apply to them.
  if (sectionType && sectionType !== 'features') return violations;

  if (!name || name.length === 0) violations.push('Missing feature name (#### heading)');
  if (!what) violations.push('Missing **What:** field');
  if (!why) violations.push('Missing **Why it matters:** field');
  if (!constraint) violations.push('Missing **Sharpest constraint:** field');

  if (violations.length > 0) return violations;

  const nameWords = name.split(/\s+/).filter(Boolean);
  if (nameWords.length > 4) {
    violations.push(`Feature name too long (${nameWords.length} words, max 4): "${name}"`);
  }
  if (VERB_PREFIX.test(name)) {
    violations.push(`Feature name starts with a verb: "${name}" — use a noun phrase (e.g. "Dark mode" not "Add dark mode")`);
  }

  const whatSentences = countSentences(what);
  if (whatSentences !== 1) {
    violations.push(`**What** must be exactly 1 sentence (found ${whatSentences}): "${what}"`);
  }

  const whySentences = countSentences(why);
  if (whySentences < 1 || whySentences > 2) {
    violations.push(`**Why it matters** must be 1–2 sentences (found ${whySentences}): "${why}"`);
  }

  const constraintSentences = countSentences(constraint);
  if (constraintSentences !== 1) {
    violations.push(`**Sharpest constraint** must be exactly 1 sentence (found ${constraintSentences}): "${constraint}"`);
  }

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

  for (const [label, value] of [['What', what], ['Why it matters', why], ['Sharpest constraint', constraint]]) {
    if (CONVERSATION_REFS.test(value)) {
      violations.push(`**${label}** contains a conversation reference — entries must stand alone`);
    }
  }

  const bodyText = `${what}\n${why}\n${constraint}\n${enabledBy ?? ''}`;
  if (SUBBULLET.test(bodyText)) {
    violations.push('Entry contains sub-bullets — use prose only');
  }

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
  // Canvas doesn't exist yet — fine for new canvases
}

const existingEntries = parseCanvas(canvasText);

if (rawEntry) {
  // Lint a candidate entry. Entry must start with #### Feature name.
  const candidate = parseCanvas(rawEntry);

  if (candidate.length === 0) {
    console.error('Could not parse entry. Ensure it starts with #### and has all three required fields.');
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
  // Lint the full canvas: old-format detection + structure + per-entry fields
  const oldFormatWarnings = detectOldFormatEntries(canvasText);
  const structuralViolations = lintCanvasStructure(canvasText);
  const entryViolations = [];

  for (const entry of existingEntries) {
    const others = existingEntries.filter(e => e !== entry);
    const violations = lintEntry(entry, others);
    if (violations.length > 0) {
      entryViolations.push({ entry: entry.name, violations });
    }
  }

  const totalIssues = oldFormatWarnings.length + structuralViolations.length + entryViolations.length;

  if (totalIssues === 0) {
    console.log(`PASS — ${existingEntries.length} entries checked`);
    process.exit(0);
  }

  console.log('FAIL');

  if (oldFormatWarnings.length > 0) {
    console.log('\n  Migration needed (old ### format):');
    oldFormatWarnings.forEach(w => console.log(`  • ${w}`));
  }

  if (structuralViolations.length > 0) {
    console.log('\n  Structure:');
    structuralViolations.forEach(v => console.log(`  • ${v}`));
  }

  if (entryViolations.length > 0) {
    console.log(`\n  Entry violations (${entryViolations.length} of ${existingEntries.length} entries):`);
    for (const { entry, violations } of entryViolations) {
      console.log(`\n  #### ${entry}`);
      violations.forEach(v => console.log(`    • ${v}`));
    }
  }

  process.exit(1);
}
