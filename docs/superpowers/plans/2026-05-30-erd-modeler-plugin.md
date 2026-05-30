# erd-modeler Plugin Landing Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the existing `erd-modeler` skill as the second plugin in the `jann0z-claude-plugins` marketplace, source-only (no vendored `node_modules`).

**Architecture:** Copy the finished skill from `~/.claude/skills/erd-modeler` into `plugins/erd-modeler/skills/erd-modeler/`, add a `plugin.json`, register it in `marketplace.json`, and update the README. Then validate structurally and dogfood the PGlite harness self-test.

**Tech Stack:** Markdown skill content, JSON manifests, Node.js ESM harness (`@electric-sql/pglite`, auto-installed on first run).

**Source spec:** `docs/superpowers/specs/2026-05-30-erd-modeler-plugin-design.md`
**Skill source:** `~/.claude/skills/erd-modeler` (ship everything EXCEPT `scripts/node_modules/` and `scripts/package-lock.json`).

---

### Task 1: Land the plugin (source, manifest, marketplace, README)

**Files:**
- Create: `plugins/erd-modeler/.claude-plugin/plugin.json`
- Create (copy): `plugins/erd-modeler/skills/erd-modeler/` (SKILL.md, references/, scripts/ minus node_modules & package-lock)
- Modify: `.claude-plugin/marketplace.json` (add erd-modeler entry)
- Modify: `README.md` (add erd-modeler section)

- [ ] **Step 1: Copy the skill source (excluding node_modules and package-lock.json)**

```bash
mkdir -p plugins/erd-modeler/skills/erd-modeler
rsync -a --exclude 'node_modules' --exclude 'package-lock.json' \
  ~/.claude/skills/erd-modeler/ plugins/erd-modeler/skills/erd-modeler/
```

- [ ] **Step 2: Verify exactly the intended files copied (no node_modules, no lockfile)**

Run:
```bash
find plugins/erd-modeler/skills/erd-modeler -type f | sort
```
Expected EXACTLY these 9 files (order as sorted):
```
plugins/erd-modeler/skills/erd-modeler/SKILL.md
plugins/erd-modeler/skills/erd-modeler/references/live-testing.md
plugins/erd-modeler/skills/erd-modeler/references/metamodel.md
plugins/erd-modeler/skills/erd-modeler/references/validation-rules.md
plugins/erd-modeler/skills/erd-modeler/scripts/README.md
plugins/erd-modeler/skills/erd-modeler/scripts/package.json
plugins/erd-modeler/skills/erd-modeler/scripts/run-erd-test.mjs
plugins/erd-modeler/skills/erd-modeler/scripts/selftest.mjs
```
That is 8 files. Confirm there is NO `node_modules` path and NO `package-lock.json`. If `package-lock.json` or any `node_modules` file appears, delete it:
```bash
rm -f plugins/erd-modeler/skills/erd-modeler/scripts/package-lock.json
rm -rf plugins/erd-modeler/skills/erd-modeler/scripts/node_modules
```

- [ ] **Step 3: Confirm the copied SKILL.md has valid frontmatter**

Run:
```bash
python3 - <<'PY'
t = open('plugins/erd-modeler/skills/erd-modeler/SKILL.md').read()
assert t.startswith('---'), "missing frontmatter"
fm = t.split('---', 2)[1]
import re
assert re.search(r'^name:\s*erd-modeler\s*$', fm, re.M), "name frontmatter wrong/missing"
assert 'description:' in fm, "description missing"
print('frontmatter OK')
PY
```
Expected: `frontmatter OK`.

- [ ] **Step 4: Create the plugin manifest**

Create `plugins/erd-modeler/.claude-plugin/plugin.json`:

```json
{
  "name": "erd-modeler",
  "version": "0.1.0",
  "description": "Turn a natural-language domain description into a clean, normalized DBML data model, validate it against best practices, then live-test it against an in-memory Postgres (PGlite) — looping with improvements until every business use-case passes.",
  "author": {
    "name": "janno",
    "email": "janno.siilbek@gmail.com"
  },
  "license": "MIT",
  "keywords": ["erd", "dbml", "data-modeling", "database", "schema", "postgres", "pglite"]
}
```

- [ ] **Step 5: Register the plugin in marketplace.json**

Modify `.claude-plugin/marketplace.json` — add a second object to the `plugins` array (after the `gherkin` entry). The resulting `plugins` array must be:

```json
  "plugins": [
    {
      "name": "gherkin",
      "source": "./plugins/gherkin",
      "description": "Author and review framework-agnostic Gherkin/BDD specs with best-practice enforcement, foundation-first ordering, and multi-pass validation."
    },
    {
      "name": "erd-modeler",
      "source": "./plugins/erd-modeler",
      "description": "Turn a domain description into a clean, normalized DBML model, validate it, and live-test it against in-memory Postgres (PGlite) until every business use-case passes."
    }
  ]
```

- [ ] **Step 6: Add the README entry**

In `README.md`, under the `## Plugins` section and after the existing `### gherkin` block (before the `## License` section), insert:

```markdown
### erd-modeler

Turn a natural-language domain description into a clean, normalized **DBML** data model,
**validate** it against best practices, then **prove it works** by live-testing it against a
real in-memory Postgres (PGlite) — generating SQL, seed data, and asserting business-use-case
queries, looping until every use-case passes. The PGlite harness auto-installs its one
dependency on first run (no manual setup, no native Postgres needed).

Triggers on prompts like "design a data model for…", "create an ERD", or "validate this schema".
```

Also update the install example so it shows installing either plugin (optional but recommended): leave the existing `gherkin` install line and add below it:

```
/plugin install erd-modeler@jann0z-claude-plugins
```

- [ ] **Step 7: Validate manifests parse and marketplace lists both plugins**

Run:
```bash
python3 - <<'PY'
import json
mp = json.load(open('.claude-plugin/marketplace.json'))
names = {p['name'] for p in mp['plugins']}
assert names == {'gherkin', 'erd-modeler'}, names
assert any(p['name']=='erd-modeler' and p['source']=='./plugins/erd-modeler' for p in mp['plugins'])
json.load(open('plugins/erd-modeler/.claude-plugin/plugin.json'))
json.load(open('plugins/gherkin/.claude-plugin/plugin.json'))
print('manifests OK')
PY
```
Expected: `manifests OK`.

- [ ] **Step 8: Confirm no node_modules is staged**

Run:
```bash
git add -A
git status --short | grep -i node_modules && echo "FAIL: node_modules staged" || echo "no node_modules staged"
```
Expected: `no node_modules staged`. If FAIL, unstage and remove those paths, ensure `.gitignore` covers `node_modules/`.

- [ ] **Step 9: Commit**

```bash
git commit -m "feat: land erd-modeler as second marketplace plugin"
```

---

### Task 2: Validate & dogfood the harness

**Files:**
- Create: `docs/superpowers/validation-erd-2026-05-30.md`

- [ ] **Step 1: Structural validation**

Run:
```bash
python3 - <<'PY'
import json, os
mp = json.load(open('.claude-plugin/marketplace.json'))
assert {p['name'] for p in mp['plugins']} == {'gherkin','erd-modeler'}
base='plugins/erd-modeler/skills/erd-modeler/'
for f in ['SKILL.md','references/metamodel.md','references/validation-rules.md','references/live-testing.md','scripts/run-erd-test.mjs','scripts/selftest.mjs','scripts/package.json','scripts/README.md']:
    assert os.path.exists(base+f), f
assert not os.path.exists(base+'scripts/node_modules'), "node_modules must not be committed"
assert not os.path.exists(base+'scripts/package-lock.json'), "package-lock should be omitted"
print('structure OK')
PY
```
Expected: `structure OK`.

- [ ] **Step 2: Run the adversarial harness self-test (auto-installs PGlite)**

Run (first run installs `@electric-sql/pglite`; needs npm + network):
```bash
cd plugins/erd-modeler/skills/erd-modeler/scripts && node selftest.mjs; echo "exit=$?"; cd - >/dev/null
```
Expected: the self-test runs and exits 0 (`exit=0`). It prints its own pass/fail summary. If the environment is OFFLINE (npm cannot fetch pglite), record the failure as "offline — not run" in the validation doc and continue; do NOT treat offline as a code defect.

- [ ] **Step 3: Smoke-test run-erd-test.mjs on a tiny model**

Create scratch files and run the harness:
```bash
mkdir -p /tmp/erd-smoke
cat > /tmp/erd-smoke/schema.sql <<'SQL'
CREATE TABLE customers (id int PRIMARY KEY, name text NOT NULL);
CREATE TABLE orders (id int PRIMARY KEY, customer_id int NOT NULL REFERENCES customers(id));
SQL
cat > /tmp/erd-smoke/seed.sql <<'SQL'
INSERT INTO customers (id, name) VALUES (1, 'Ada');
INSERT INTO orders (id, customer_id) VALUES (1, 1);
SQL
cat > /tmp/erd-smoke/usecases.sql <<'SQL'
-- usecase: list orders for a customer
SELECT count(*) FROM orders WHERE customer_id = 1;
-- expect: value=1
-- usecase: reject orphan order
INSERT INTO orders (id, customer_id) VALUES (2, 999);
-- expect: error ~ foreign key
SQL
cd plugins/erd-modeler/skills/erd-modeler/scripts && node run-erd-test.mjs --schema /tmp/erd-smoke/schema.sql --seed /tmp/erd-smoke/seed.sql --usecases /tmp/erd-smoke/usecases.sql; echo "exit=$?"; cd - >/dev/null
```
Expected: a JSON summary with `"ok": true` and both use-cases passing, `exit=0`. If offline, record "offline — not run".

- [ ] **Step 4: Write the validation record**

Create `docs/superpowers/validation-erd-2026-05-30.md` capturing: the `structure OK` line, the selftest result (exit code + summary, or "offline — not run"), the smoke-run JSON summary (or "offline — not run"), and an explicit confirmation that no `node_modules` or `package-lock.json` is tracked (`git ls-files | grep -c node_modules` → 0).

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/validation-erd-2026-05-30.md
git commit -m "test: validate and dogfood erd-modeler plugin (structure + PGlite harness)"
```

---

## Final verification

- [ ] Both tasks committed; `git log --oneline` shows the sequence.
- [ ] `marketplace.json` lists `gherkin` and `erd-modeler`.
- [ ] Harness self-test exits 0 (or offline recorded).
- [ ] `git ls-files | grep node_modules` returns nothing.

## Notes for the implementer

- The skill content is finished — copy it verbatim; do NOT edit SKILL.md, references, or scripts.
- `node_modules` and `package-lock.json` are deliberately excluded (see spec §2). The harness
  installs PGlite itself on first run.
- Network is required the first time the harness runs (to `npm install` PGlite). Offline is an
  environment limitation, not a defect — record it and proceed.
