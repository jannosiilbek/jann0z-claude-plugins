import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
let _id = 0;

function lint(canvasContent, entryContent = null) {
  const path = join(tmpdir(), `lint-test-${process.pid}-${++_id}.md`);
  writeFileSync(path, canvasContent, 'utf8');
  try {
    const args = ['lint-canvas.mjs', '--canvas', path];
    if (entryContent !== null) args.push('--entry', entryContent);
    try {
      const output = execFileSync('node', args, { cwd: __dirname, encoding: 'utf8' });
      return { pass: true, output };
    } catch (err) {
      return { pass: false, output: err.stdout || '' };
    }
  } finally {
    unlinkSync(path);
  }
}

const VALID_FEATURE = `#### Offline mode
**What:** Users can read and edit documents without an internet connection.
**Why it matters:** Network drops during travel make the app unusable.
**Sharpest constraint:** Conflict resolution when the same document is edited on two devices simultaneously.`;

describe('Feature entries (existing behavior)', () => {
  test('valid feature entry passes', () => {
    const r = lint('', VALID_FEATURE);
    assert.ok(r.pass, `Expected PASS, got:\n${r.output}`);
  });

  test('missing What field fails', () => {
    const entry = `#### Offline mode
**Why it matters:** Network drops during travel make the app unusable.
**Sharpest constraint:** Conflict resolution is non-trivial.`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for missing What');
    assert.ok(r.output.includes('Missing **What:**'), r.output);
  });

  test('verb-phrase feature name fails', () => {
    const entry = `#### Add dark mode
**What:** Users can switch the interface to a dark color scheme.
**Why it matters:** Reduces eye strain in low-light environments.
**Sharpest constraint:** Consistent theming across all third-party embedded components.`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for verb-phrase name');
    assert.ok(r.output.includes('starts with a verb'), r.output);
  });

  test('What with two sentences fails', () => {
    const entry = `#### Dark mode
**What:** Users can switch to a dark theme. It reduces eye strain.
**Why it matters:** Reduces eye strain in low-light environments.
**Sharpest constraint:** Consistent theming across all third-party components.`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for two-sentence What');
    assert.ok(r.output.includes('**What** must be exactly 1 sentence'), r.output);
  });

  test('orphaned feature (no section) fails full canvas lint', () => {
    const canvas = `# My Product
> vision

**What it is:** A thing.
**Who it's for:** People.
**What makes it different:** Unique.

---

## Features

#### Orphaned feature
**What:** Users can do something useful.
**Why it matters:** It saves time.
**Sharpest constraint:** Performance at scale is hard.
`;
    const r = lint(canvas);
    assert.ok(!r.pass, 'Expected FAIL for orphaned feature');
    assert.ok(r.output.includes('not inside any section'), r.output);
  });
});

describe('Section-type detection via --entry', () => {
  test('valid persona entry passes', () => {
    const entry = `#### Solo indie hacker
**Role:** A solo developer shipping products without a team.
**Goal:** Validate and launch ideas without operational overhead.
**Access:** terminal CLI, MCP server
**Friction:** Context switching between disconnected tools fragments their flow.`;
    const r = lint('', entry);
    assert.ok(r.pass, `Expected PASS for valid persona entry:\n${r.output}`);
  });

  test('valid technical constraint entry passes', () => {
    const entry = `#### Cloud-only deployment
**What:** All data lives in cloud infrastructure with no local persistence layer.
**Shapes:** Features requiring offline access or local-first sync are out of scope; latency assumptions apply to all operations.`;
    const r = lint('', entry);
    assert.ok(r.pass, `Expected PASS for valid constraint entry:\n${r.output}`);
  });

  test('valid glossary entry passes', () => {
    const entry = `#### Agent
**Means:** An autonomous process that can invoke tools and make decisions without per-action user confirmation.`;
    const r = lint('', entry);
    assert.ok(r.pass, `Expected PASS for valid glossary entry:\n${r.output}`);
  });
});
