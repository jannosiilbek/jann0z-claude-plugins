// _gen.mjs — generator for the negative fixture directories. Each negative is a COPY of
// valid-08 with EXACTLY ONE injected defect in one model file, so the negative fires for
// its stated reason (M-BIJ stays satisfied; only the injected check fails). This keeps the
// 25 negatives precise and maintainable per simulation.md §3.4.
//
// Run: node fixtures/_gen.mjs   (regenerates every negative directory from the baseline)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const VALID = join(HERE, 'valid-08');
const TF = 'accountholder-transfer_funds.xml'; // the rich model we mutate most often

function baseline() {
  const files = {};
  for (const f of readdirSync(VALID)) files[f] = readFileSync(join(VALID, f), 'utf8');
  return files;
}

// Write a negative directory: start from baseline, apply mutator(files), write the dir.
function neg(name, mutator) {
  const dir = join(HERE, name);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const files = baseline();
  mutator(files);
  for (const [f, text] of Object.entries(files)) {
    if (text === null) continue; // mutator removed the file
    writeFileSync(join(dir, f), text, 'utf8');
  }
}

const replace = (files, f, from, to) => {
  if (!files[f].includes(from)) throw new Error(`gen: '${from}' not found in ${f}`);
  files[f] = files[f].replace(from, to);
};

// --- the 21 single-file .xml / directory negatives -------------------------

// malformed-xml: unclosed <Task> tag.
neg('malformed-xml', (f) => {
  replace(f, TF, '<Task id="post-ledger-entry" category="system"', '<Task id="post-ledger-entry" category="system"');
  // inject an unclosed tag by removing a closing </Task> of the root.
  f[TF] = f[TF].replace('  </Task>\n</TaskModel>', '</TaskModel>');
});

// missing-fingerprint: drop the leading fingerprint comment block.
neg('missing-fingerprint', (f) => {
  f[TF] = f[TF].replace(/<!-- fingerprints:[\s\S]*?-->\n/, '');
});

// missing-budget: remove the <Budget> element.
neg('missing-budget', (f) => {
  replace(f, TF, '  <Budget klm="14"/>\n', '');
});

// budget-mismatch: declared 99 ≠ computed 14.
neg('budget-mismatch', (f) => {
  replace(f, TF, '<Budget klm="14"/>', '<Budget klm="99"/>');
});

// bad-operator: operator="precedes" (not in the 9-set).
neg('bad-operator', (f) => {
  replace(f, TF, '<Task id="transfer-funds" category="abstract" operator="enabling">', '<Task id="transfer-funds" category="abstract" operator="precedes">');
});

// bad-category: category="action".
neg('bad-category', (f) => {
  replace(f, TF, '<Task id="confirm-transfer" category="interaction"', '<Task id="confirm-transfer" category="action"');
});

// bad-klm-token: klm="MXP" (X off-alphabet) on an interaction leaf.
neg('bad-klm-token', (f) => {
  replace(f, TF, 'klm="MBB"', 'klm="MXP"');
});

// m-on-system-leaf: system leaf klm="MW" (illegal M).
neg('m-on-system-leaf', (f) => {
  replace(f, TF, '          scenario-tags="@policy:double-entry-ledger"\n          klm="W"/>', '          scenario-tags="@policy:double-entry-ledger"\n          klm="MW"/>');
});

// missing-m-on-interaction-leaf: interaction leaf klm="PBB" (no leading M).
neg('missing-m-on-interaction-leaf', (f) => {
  replace(f, TF, 'klm="MBB"', 'klm="PBB"');
});

// single-child-abstract: an abstract task with exactly one child.
// choose-account becomes abstract with one child (remove pick-savings).
neg('single-child-abstract', (f) => {
  replace(f, TF,
    '      <Task id="pick-savings" category="interaction"\n            scenario-tags="@transition:select_source_account"\n            klm="MPBB"/>\n',
    '');
  // choose-account now has one child but still operator="choice" — that ALSO trips M12.
  // To isolate M10 (abstract arity), drop the operator so only the single-child-abstract fires.
  replace(f, TF, '<Task id="choose-account" category="abstract" operator="choice">', '<Task id="choose-account" category="abstract">');
});

// operator-on-single-child: a task with one child carrying operator="choice".
// Isolate M12 (C1): make choose-account a NON-abstract single-child parent that keeps its
// operator. Remove pick-savings (one child left) but keep operator="choice"; recategorise to
// interaction so M10 (abstract arity) does NOT fire — only M12 (operator on <2 children).
// The nominal path still takes the first child (pick-checking, MPBB=3) so the budget is
// unchanged (14) and W-BUDGET passes — M12 is the clean owner.
neg('operator-on-single-child', (f) => {
  replace(f, TF,
    '      <Task id="pick-savings" category="interaction"\n            scenario-tags="@transition:select_source_account"\n            klm="MPBB"/>\n',
    '');
  replace(f, TF, '<Task id="choose-account" category="abstract" operator="choice">', '<Task id="choose-account" category="interaction" operator="choice">');
});

// abstract-leaf: a childless <Task category="abstract">.
neg('abstract-leaf', (f) => {
  replace(f, TF, '<Task id="confirm-transfer" category="interaction"\n          scenario-tags="@transition:confirm_transfer @terminal:transfer_posted"\n          klm="MBB"/>',
    '<Task id="confirm-transfer" category="abstract"\n          scenario-tags="@transition:confirm_transfer @terminal:transfer_posted"\n          klm="MBB"/>');
});

// ghost-scenario-tag: a leaf tag @transition:nonexistent (well-formed, absent from 06).
neg('ghost-scenario-tag', (f) => {
  replace(f, TF, 'scenario-tags="@transition:confirm_transfer @terminal:transfer_posted"', 'scenario-tags="@transition:nonexistent @terminal:transfer_posted"');
});

// untagged-leaf: a leaf with no scenario-tags.
neg('untagged-leaf', (f) => {
  replace(f, TF, '          scenario-tags="@transition:confirm_transfer @terminal:transfer_posted"\n          klm="MBB"/>', '          klm="MBB"/>');
});

// persona-attr-mismatch: @persona="AccountOwner" (not the 07 AccountHolder).
neg('persona-attr-mismatch', (f) => {
  replace(f, TF, 'persona="AccountHolder"', 'persona="AccountOwner"');
  // keep id/filename so only M-ATTR (E2) fires, not M4/M-BIJ. The slug uses persona, so id
  // must still equal snake(persona)-snake(job). But @persona changed ⇒ M4 would also fire.
  // To isolate M-ATTR, the file is renamed AND id updated so M4/M-BIJ pass, leaving only E2.
  // Handled below by renaming the file + id to the AccountOwner slug.
  const renamed = 'accountowner-transfer_funds.xml';
  f[renamed] = f[TF].replace('id="accountholder-transfer_funds"', 'id="accountowner-transfer_funds"');
  f[TF] = null;
});

// restated-gherkin-text: a comment pasting a When/Then step line.
neg('restated-gherkin-text', (f) => {
  f[TF] = f[TF].replace('<Budget klm="14"/>', '<Budget klm="14"/>\n  <!-- When they confirm the transfer is posted -->');
});

// unreachable-leaf: a leaf under a sibling the operators can never enable (dead branch:
// a child Task nested under a childless executable leaf).
neg('unreachable-leaf', (f) => {
  // give post-ledger-entry (a klm-bearing leaf) a nested child Task ⇒ dead branch.
  replace(f, TF,
    '    <Task id="post-ledger-entry" category="system"\n          scenario-tags="@policy:double-entry-ledger"\n          klm="W"/>',
    '    <Task id="post-ledger-entry" category="system"\n          scenario-tags="@policy:double-entry-ledger"\n          klm="W">\n      <Task id="dead-leaf" category="system" scenario-tags="@policy:double-entry-ledger" klm="W"/>\n    </Task>');
});

// wrong-reason-trap: TWO defects — budget mismatch (D5) AND a ghost tag (E4). The OWNER
// reported is W-BUDGET (the walker), proving W-BUDGET isolates over R-TAG.
neg('wrong-reason-trap', (f) => {
  replace(f, TF, '<Budget klm="14"/>', '<Budget klm="99"/>');
  replace(f, TF, 'scenario-tags="@transition:confirm_transfer @terminal:transfer_posted"', 'scenario-tags="@transition:nonexistent @terminal:transfer_posted"');
});

// missing-model: a 07 job (teller/open_account) with no file.
neg('missing-model', (f) => {
  f['teller-open_account.xml'] = null;
});

// extra-model: a file for a (persona,job) not in 07.
neg('extra-model', (f) => {
  f['accountholder-close_account.xml'] = f['accountholder-view_balance.xml']
    .replace('id="accountholder-view_balance"', 'id="accountholder-close_account"')
    .replace('job="view_balance"', 'job="close_account"');
});

// --- the 9 ADDED negatives (Finding 1: A3/A4/A6/A8/C2/C4/D1/D7; Finding 2: B6) ----------
// Each is a full directory-form set (a COPY of valid-08) with EXACTLY ONE injected defect,
// owner-pinned. Most mutate the simple `accountholder-view_balance.xml` model (2 leaves) to
// avoid a budget cascade muddying the single-defect isolation.
const VB = 'accountholder-view_balance.xml';

// A3 → root-not-taskmodel: the root element is <TaskTree>, not <TaskModel>. The tree cannot
// be anchored; M3 (A3) owns it (the harness anchor guard short-circuits to M3).
neg('root-not-taskmodel', (f) => {
  replace(f, VB, '<TaskModel id="accountholder-view_balance"', '<TaskTree id="accountholder-view_balance"');
  replace(f, VB, '</TaskModel>', '</TaskTree>');
});

// A4 → id-not-slug: TaskModel/@id ≠ snake(persona)-snake(job). The filename stem and
// persona/job are unchanged (M-BIJ + M-ATTR stay satisfied); only M4 (A4) fires.
neg('id-not-slug', (f) => {
  replace(f, VB, 'id="accountholder-view_balance"', 'id="ah-viewbal"');
});

// A6 → multi-root-task: two top-level <Task> children under <TaskModel>. M6 (A6) fires.
// The 2nd root Task is self-closed + valid in isolation so only the multi-root defect fires.
neg('multi-root-task', (f) => {
  replace(f, VB, '  </Task>\n</TaskModel>',
    '  </Task>\n  <Task id="stray-root" category="interaction" scenario-tags="@transition:open_dashboard" klm="MBB"/>\n</TaskModel>');
});

// A8 → unknown-attribute: an undeclared attribute on a <Task>. M8 (A8) fires.
neg('unknown-attribute', (f) => {
  replace(f, VB,
    '<Task id="open-dashboard" category="interaction"',
    '<Task id="open-dashboard" category="interaction" priority="high"');
});

// C2 → multi-child-no-operator: a ≥2-child task with no operator attribute. M13 (C2) fires.
// The walker defaults an operator-less parent to 'all', so the budget is unchanged.
neg('multi-child-no-operator', (f) => {
  replace(f, VB, '<Task id="view-balance" category="abstract" operator="enabling">', '<Task id="view-balance" category="abstract">');
});

// C4 → unary-as-operator: operator="optional" (a unary name used as an N-ary operator).
// M15 (C4) owns it (the unary-as-operator arm). (M14 co-fires since 'optional' ∉ the 9-set;
// the single injected change is the one operator value.)
neg('unary-as-operator', (f) => {
  replace(f, VB, '<Task id="view-balance" category="abstract" operator="enabling">', '<Task id="view-balance" category="abstract" operator="optional">');
});

// D1 → klm-absent-leaf: an interaction leaf with no klm attribute. M16 (D1) fires.
neg('klm-absent-leaf', (f) => {
  replace(f, VB,
    '    <Task id="open-dashboard" category="interaction"\n          scenario-tags="@transition:open_dashboard"\n          klm="MBB"/>',
    '    <Task id="open-dashboard" category="interaction"\n          scenario-tags="@transition:open_dashboard"/>');
});

// D7 → bad-multiplier: a malformed klm multiplier ("0K" — zero, not a positive integer).
// M20 (D7) owns the multiplier violation.
neg('bad-multiplier', (f) => {
  replace(f, VB, 'klm="MH"', 'klm="MH0K"');
});

// B6 (Finding 2) → iterative-root: iterative="true" on the ROOT task = an unbounded job loop
// with no terminating nominal path. M11 (B6) owns it (the constructible non-termination
// smell; W-TERM is no longer B6's owner). The budget is unchanged (iterative counts once).
neg('iterative-root', (f) => {
  replace(f, VB, '<Task id="view-balance" category="abstract" operator="enabling">', '<Task id="view-balance" category="abstract" iterative="true" operator="enabling">');
});

console.log('generated negative fixtures');
