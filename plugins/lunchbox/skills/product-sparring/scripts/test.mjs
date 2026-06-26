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

describe('Persona entry validation', () => {
  test('missing Role fails', () => {
    const entry = `#### Solo indie hacker
**Goal:** Validate and launch ideas without operational overhead.
**Access:** terminal CLI
**Friction:** Context switching between tools fragments their flow.`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for missing Role');
    assert.ok(r.output.includes('Missing **Role:**'), r.output);
  });

  test('missing Goal fails', () => {
    const entry = `#### Solo indie hacker
**Role:** A solo developer shipping products without a team.
**Access:** terminal CLI
**Friction:** Context switching between tools fragments their flow.`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for missing Goal');
    assert.ok(r.output.includes('Missing **Goal:**'), r.output);
  });

  test('missing Access fails', () => {
    const entry = `#### Solo indie hacker
**Role:** A solo developer shipping products without a team.
**Goal:** Validate and launch ideas without operational overhead.
**Friction:** Context switching between tools fragments their flow.`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for missing Access');
    assert.ok(r.output.includes('Missing **Access:**'), r.output);
  });

  test('missing Friction fails', () => {
    const entry = `#### Solo indie hacker
**Role:** A solo developer shipping products without a team.
**Goal:** Validate and launch ideas without operational overhead.
**Access:** terminal CLI`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for missing Friction');
    assert.ok(r.output.includes('Missing **Friction:**'), r.output);
  });

  test('Role with two sentences fails', () => {
    const entry = `#### Solo indie hacker
**Role:** A solo developer shipping products without a team. They work alone.
**Goal:** Validate and launch ideas without operational overhead.
**Access:** terminal CLI
**Friction:** Context switching between tools fragments their flow.`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for two-sentence Role');
    assert.ok(r.output.includes('**Role** must be exactly 1 sentence'), r.output);
  });

  test('multi-line Access fails', () => {
    const entry = `#### Solo indie hacker
**Role:** A solo developer shipping products without a team.
**Goal:** Validate and launch ideas without operational overhead.
**Access:** terminal CLI
MCP server
**Friction:** Context switching between tools fragments their flow.`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for multi-line Access');
    assert.ok(r.output.includes('**Access** must be a single line'), r.output);
  });

  test('verb-phrase persona name fails', () => {
    const entry = `#### Build solo products
**Role:** A solo developer shipping products without a team.
**Goal:** Validate and launch ideas without operational overhead.
**Access:** terminal CLI
**Friction:** Context switching between tools fragments their flow.`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for verb-phrase persona name');
    assert.ok(r.output.includes('starts with a verb'), r.output);
  });
});

describe('Technical constraint entry validation', () => {
  test('missing What fails', () => {
    const entry = `#### Cloud-only deployment
**Shapes:** Features requiring offline access are out of scope.`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for missing What');
    assert.ok(r.output.includes('Missing **What:**'), r.output);
  });

  test('missing Shapes fails', () => {
    const entry = `#### Cloud-only deployment
**What:** All data lives in cloud infrastructure with no local persistence layer.
**Locked by:** AWS S3`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for missing Shapes');
    assert.ok(r.output.includes('Missing **Shapes:**'), r.output);
  });

  test('Locked by is optional', () => {
    const entry = `#### Cloud-only deployment
**What:** All data lives in cloud infrastructure with no local persistence layer.
**Shapes:** Features requiring offline access or local-first sync are out of scope.`;
    const r = lint('', entry);
    assert.ok(r.pass, `Expected PASS with no Locked by:\n${r.output}`);
  });

  test('multi-line Locked by fails', () => {
    const entry = `#### Cloud-only deployment
**What:** All data lives in cloud infrastructure with no local persistence layer.
**Shapes:** Features requiring offline access are out of scope.
**Locked by:** AWS S3
and CloudFront`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for multi-line Locked by');
    assert.ok(r.output.includes('**Locked by** must be a single line'), r.output);
  });
});

describe('Canvas structural validation — new sections', () => {
  const BASE = `# My Product
> vision

**What it is:** A thing.
**Who it's for:** People.
**What makes it different:** Unique.

---

## Features

### Core

#### Offline mode
**What:** Users can read and edit documents without an internet connection.
**Why it matters:** Network drops during travel make the app unusable.
**Sharpest constraint:** Conflict resolution when the same document is edited on two devices.
`;

  test('persona without group fails', () => {
    const canvas = BASE.replace('## Features', `## Personas

#### Solo indie hacker
**Role:** A solo developer shipping products without a team.
**Goal:** Validate and launch ideas without operational overhead.
**Access:** terminal CLI
**Friction:** Context switching between tools fragments their flow.

## Features`);
    const r = lint(canvas);
    assert.ok(!r.pass, 'Expected FAIL for persona without group');
    assert.ok(r.output.includes('not inside any group'), r.output);
  });

  test('Technical Constraints fully grouped passes', () => {
    const canvas = BASE.replace('## Features', `## Technical Constraints

### Infrastructure

#### Cloud-only deployment
**What:** All data lives in cloud infrastructure with no local persistence layer.
**Shapes:** Features requiring offline access are out of scope.

## Features`);
    const r = lint(canvas);
    assert.ok(r.pass, `Expected PASS for fully-grouped constraints:\n${r.output}`);
  });

  test('Glossary fully grouped passes', () => {
    const canvas = BASE.replace('## Features', `## Glossary

### Core terms

#### Agent
**Means:** An autonomous process that invokes tools without per-action confirmation.

## Features`);
    const r = lint(canvas);
    assert.ok(r.pass, `Expected PASS for fully-grouped glossary:\n${r.output}`);
  });
});

describe('Glossary entry validation', () => {
  test('missing Means fails', () => {
    const entry = `#### Agent
**Disambiguates:** Not a chatbot`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for missing Means');
    assert.ok(r.output.includes('Missing **Means:**'), r.output);
  });

  test('Disambiguates is optional', () => {
    const entry = `#### Agent
**Means:** An autonomous process that can invoke tools and make decisions without per-action user confirmation.`;
    const r = lint('', entry);
    assert.ok(r.pass, `Expected PASS with no Disambiguates:\n${r.output}`);
  });

  test('Means with two sentences fails', () => {
    const entry = `#### Agent
**Means:** An autonomous process that invokes tools. It acts without per-action confirmation.`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for two-sentence Means');
    assert.ok(r.output.includes('**Means** must be exactly 1 sentence'), r.output);
  });

  test('multi-line Disambiguates fails', () => {
    const entry = `#### Agent
**Means:** An autonomous process that can invoke tools without per-action confirmation.
**Disambiguates:** Not a chatbot
Not a rule-based bot`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for multi-line Disambiguates');
    assert.ok(r.output.includes('**Disambiguates** must be a single line'), r.output);
  });
});

describe('Foundation entry validation', () => {
  test('valid foundation entry passes', () => {
    const entry = `#### Inference Engine
**Does:** Runs LLM completions and tool-calling loops for every agent action.
**Powers:** Agent reasoning, feature suggestions, and the expert panel.
**Built on:** Claude Sonnet 4.6 via the Anthropic API.`;
    const r = lint('', entry);
    assert.ok(r.pass, `Expected PASS for valid foundation entry:\n${r.output}`);
  });

  test('missing Does fails', () => {
    const entry = `#### Inference Engine
**Powers:** Agent reasoning, feature suggestions, and the expert panel.`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for missing Does');
    assert.ok(r.output.includes('Missing **Does:**'), r.output);
  });

  test('missing Powers fails', () => {
    const entry = `#### Inference Engine
**Does:** Runs LLM completions and tool-calling loops for every agent action.
**Built on:** Claude Sonnet 4.6 via the Anthropic API.`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for missing Powers');
    assert.ok(r.output.includes('Missing **Powers:**'), r.output);
  });

  test('Built on is optional', () => {
    const entry = `#### Inference Engine
**Does:** Runs LLM completions and tool-calling loops for every agent action.
**Powers:** Agent reasoning, feature suggestions, and the expert panel.`;
    const r = lint('', entry);
    assert.ok(r.pass, `Expected PASS with no Built on:\n${r.output}`);
  });

  test('Does with two sentences fails', () => {
    const entry = `#### Inference Engine
**Does:** Runs LLM completions. It also handles tool calls.
**Powers:** Agent reasoning, feature suggestions, and the expert panel.`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for two-sentence Does');
    assert.ok(r.output.includes('**Does** must be exactly 1 sentence'), r.output);
  });

  test('multi-line Built on fails', () => {
    const entry = `#### Inference Engine
**Does:** Runs LLM completions and tool-calling loops for every agent action.
**Powers:** Agent reasoning and feature suggestions.
**Built on:** Claude Sonnet 4.6
via the Anthropic API`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for multi-line Built on');
    assert.ok(r.output.includes('**Built on** must be a single line'), r.output);
  });

  test('verb-phrase component name fails', () => {
    const entry = `#### Build the engine
**Does:** Runs LLM completions and tool-calling loops for every agent action.
**Powers:** Agent reasoning, feature suggestions, and the expert panel.`;
    const r = lint('', entry);
    assert.ok(!r.pass, 'Expected FAIL for verb-phrase component name');
    assert.ok(r.output.includes('starts with a verb'), r.output);
  });
});

describe('Canvas structural validation — Foundation', () => {
  const BASE = `# My Product
> vision

**What it is:** A thing.
**Who it's for:** People.
**What makes it different:** Unique.

---

## Features

### Core

#### Offline mode
**What:** Users can read and edit documents without an internet connection.
**Why it matters:** Network drops during travel make the app unusable.
**Sharpest constraint:** Conflict resolution when the same document is edited on two devices.
`;

  test('Foundation fully grouped passes', () => {
    const canvas = BASE.replace('## Features', `## Foundation

### Compute Layer

#### Inference Engine
**Does:** Runs LLM completions and tool-calling loops for every agent action.
**Powers:** Agent reasoning, feature suggestions, and the expert panel.

## Features`);
    const r = lint(canvas);
    assert.ok(r.pass, `Expected PASS for fully-grouped foundation:\n${r.output}`);
  });
});

describe('Optional groups (Constraints / Foundation / Glossary)', () => {
  const BASE = `# My Product
> vision

**What it is:** A thing.
**Who it's for:** People.
**What makes it different:** Unique.

---

## Features

### Core

#### Offline mode
**What:** Users can read and edit documents without an internet connection.
**Why it matters:** Network drops during travel make the app unusable.
**Sharpest constraint:** Conflict resolution when the same document is edited on two devices.
`;

  test('flat Technical Constraints (no group) passes', () => {
    const canvas = BASE.replace('## Features', `## Technical Constraints

#### Cloud-only deployment
**What:** All data lives in cloud infrastructure with no local persistence layer.
**Shapes:** Features requiring offline access or local-first sync are out of scope.

## Features`);
    const r = lint(canvas);
    assert.ok(r.pass, `Expected PASS for flat constraints:\n${r.output}`);
  });

  test('mixed ungrouped + grouped constraints fails (all-or-nothing)', () => {
    const canvas = BASE.replace('## Features', `## Technical Constraints

#### Loose constraint
**What:** All data lives in cloud infrastructure with no local persistence layer.
**Shapes:** Features requiring offline access or local-first sync are out of scope.

### Infrastructure

#### Cloud-only deployment
**What:** Application state is persisted exclusively in managed cloud storage services.
**Shapes:** Local-first or offline-capable features cannot be supported under this model.

## Features`);
    const r = lint(canvas);
    assert.ok(!r.pass, 'Expected FAIL for mixed grouped/ungrouped constraints');
    assert.ok(r.output.includes('not inside a group'), r.output);
  });

  test('empty Foundation group fails', () => {
    const canvas = BASE.replace('## Features', `## Foundation

### Compute Layer

## Features`);
    const r = lint(canvas);
    assert.ok(!r.pass, 'Expected FAIL for empty foundation group');
    assert.ok(r.output.toLowerCase().includes('empty'), r.output);
  });

  test('verb-phrase glossary group name fails', () => {
    const canvas = BASE.replace('## Features', `## Glossary

### Build terms

#### Agent
**Means:** An autonomous process that invokes tools without per-action confirmation.

## Features`);
    const r = lint(canvas);
    assert.ok(!r.pass, 'Expected FAIL for verb-phrase glossary group name');
    assert.ok(r.output.includes('starts with a verb'), r.output);
  });
});
