// _gen.mjs — generator for the illegal/edge fixture directories. Each illegal fixture is
// the valid-06-no05 pair (order + coupon) with EXACTLY ONE deliberate defect injected, so
// directory↔aggregate bijection holds and only the named defect fires (a fixture failing
// for any other reason is itself broken-test — the wrong-reason guard). Parse-error and
// 05-mode fixtures override as noted. Run: node fixtures/_gen.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const F = (p) => join(__dirname, p);
const BASE = 'valid-06-no05';
const BASE05 = 'valid-06';
const orderNo05 = readFileSync(F(`${BASE}/order.feature`), 'utf8');
const couponBase = readFileSync(F(`${BASE}/coupon.feature`), 'utf8');
const order05 = readFileSync(F(`${BASE05}/order.feature`), 'utf8');

function dir(name, files) {
  const d = F(`illegal/${name}`);
  if (existsSync(d)) rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
  for (const [fn, content] of Object.entries(files)) writeFileSync(join(d, fn), content);
}

// --- parse-error corpus (adapted from testdata/bad). order.feature is the defective
// file; coupon stays valid so the dir has both (bijection holds; the throw short-circuits).
dir('not-gherkin', { 'order.feature': 'not gherkin\n', 'coupon.feature': couponBase });
dir('inconsistent-cells', {
  'order.feature': `# fingerprints:
Feature: Order
  @transition:order
  Scenario: x
    Given a table
      | foo | bar |
      | boz |
`, 'coupon.feature': couponBase });
dir('whitespace-in-tag', {
  'order.feature': `Feature: Order

  @transition order
  Scenario: x
`, 'coupon.feature': couponBase });
dir('invalid-language', { 'order.feature': '#language:no-such\n\nFeature: Order\n', 'coupon.feature': couponBase });

// --- coverage / structure illegals (mutate order.feature; coupon valid) ---
// uncovered-invariant: drop the @invariant scenario from order.
dir('uncovered-invariant', {
  'order.feature': orderNo05.replace(/  @invariant:INV-Order-1[\s\S]*?Then the placement attempt is rejected\n\n/, ''),
  'coupon.feature': couponBase,
});
// uncovered-transition-04: drop the Delivering transition (a 04 transition uncovered).
dir('uncovered-transition-04', {
  'order.feature': orderNo05.replace(/  @transition:order\n  Scenario: Delivering[\s\S]*?Then the order is delivered\n\n/, ''),
  'coupon.feature': couponBase,
});
// missing-terminal: drop the delivered terminal scenario.
dir('missing-terminal', {
  'order.feature': orderNo05.replace(/  @terminal:order\n  Scenario: A delivered order admits no further event[\s\S]*?Then the order remains delivered\n\n/, ''),
  'coupon.feature': couponBase,
});
// uncovered-policy: drop the policy scenario.
dir('uncovered-policy', {
  'order.feature': orderNo05.replace(/\n  @policy:OrderShipsCoupon[\s\S]*?Then eventually the Coupon is issued\n/, '\n'),
  'coupon.feature': couponBase,
});
// eventual-as-immediate: policy phrased without 'eventually'.
dir('eventual-as-immediate', {
  'order.feature': orderNo05.replace('Then eventually the Coupon is issued', 'Then the Coupon is issued'),
  'coupon.feature': couponBase,
});
// bad-tag-namespace: a @requirement: tag on a scenario.
dir('bad-tag-namespace', {
  'order.feature': orderNo05.replace('  @invariant:INV-Order-1', '  @requirement:REQ-1'),
  'coupon.feature': couponBase,
});
// tag-target-unresolved: @invariant:INV-Order-9 (no such invariant).
dir('tag-target-unresolved', {
  'order.feature': orderNo05.replace('@invariant:INV-Order-1', '@invariant:INV-Order-9'),
  'coupon.feature': couponBase,
});
// two-source-tags: scenario with both @invariant and @transition.
dir('two-source-tags', {
  'order.feature': orderNo05.replace('  @invariant:INV-Order-1\n', '  @invariant:INV-Order-1\n  @transition:order\n'),
  'coupon.feature': couponBase,
});
// multi-when: two explicit When steps.
dir('multi-when', {
  'order.feature': orderNo05.replace(
    '    When the Order Paid event occurs\n    Then the order is paid',
    '    When the Order Paid event occurs\n    When the Order Shipped event occurs\n    Then the order is paid'),
  'coupon.feature': couponBase,
});
// action-in-then: a Then-block step with a blocklisted action verb.
dir('action-in-then', {
  'order.feature': orderNo05.replace('    Then the order is paid', '    Then the order is paid\n    And the customer ships the order'),
  'coupon.feature': couponBase,
});
// forbidden-synonym: a step uses forbidden 'purchase'.
dir('forbidden-synonym', {
  'order.feature': orderNo05.replace('Then the order is paid', 'Then the purchase is paid'),
  'coupon.feature': couponBase,
});
// invented-state: a Given names a state token not in the 02 enum. Injected into the
// policy scenario's Given (which is not transition-coverage-bearing) so M15 is the sole
// owner, no collateral X-COV-TRANS miss.
dir('invented-state', {
  'order.feature': orderNo05.replace(
    '  @policy:OrderShipsCoupon\n  Scenario: Shipping an order eventually issues a coupon\n    Given the order is paid',
    '  @policy:OrderShipsCoupon\n  Scenario: Shipping an order eventually issues a coupon\n    Given the order is the frozen state'),
  'coupon.feature': couponBase,
});
// invented-entity: a step names an event in no upstream.
dir('invented-entity', {
  'order.feature': orderNo05.replace('When the Order Paid event occurs\n    Then the order is paid', 'When the Order Teleported event occurs\n    Then the order is paid'),
  'coupon.feature': couponBase,
});
// restated-invariant: a step copies the 03 invariant Rule text verbatim.
dir('restated-invariant', {
  'order.feature': orderNo05.replace('Then the placement attempt is rejected', 'Then a cancelled order rejects further placement attempt is shown'),
  'coupon.feature': couponBase,
});
// enum-listing: an Examples table dumps the full OrderStatus value set.
dir('enum-listing', {
  'order.feature': orderNo05.replace(
    '  @transition:order\n  Scenario: Paying a placed order advances it to paid\n    Given the order is placed\n    When the Order Paid event occurs\n    Then the order is paid',
    `  @transition:order
  Scenario Outline: Paying a placed order advances it to paid
    Given the order is <s>
    When the Order Paid event occurs
    Then the order is paid
    Examples:
      | s |
      | placed |
      | paid |
      | shipped |
      | delivered |
      | cancelled |
      | refunded |`),
  'coupon.feature': couponBase,
});
// transition-dump: a comment restates the full 04 order table.
dir('transition-dump', {
  'order.feature': `# fingerprints:
#   01-event-storming.md@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
#   02-glossary.md@sha256:1111111111111111111111111111111111111111111111111111111111111111
#   03-aggregates.md@sha256:2222222222222222222222222222222222222222222222222222222222222222
#   04-erd.dbml@sha256:3333333333333333333333333333333333333333333333333333333333333333
#   04-transitions.md@sha256:4444444444444444444444444444444444444444444444444444444444444444
# placed | Order Paid | paid
# paid | Order Shipped | shipped
# shipped | Order Delivered | delivered
` + orderNo05.split('\n').slice(6).join('\n'),
  'coupon.feature': couponBase,
});
// missing-fingerprint: no leading # fingerprints: block.
dir('missing-fingerprint', {
  'order.feature': orderNo05.split('\n').slice(6).join('\n'),
  'coupon.feature': couponBase,
});
// placeholder-fingerprint: a digest is a placeholder.
dir('placeholder-fingerprint', {
  'order.feature': orderNo05.replace(/02-glossary\.md@sha256:1+/, '02-glossary.md@sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  'coupon.feature': couponBase,
});
// missing-event-string: a @transition When omits the exact 01 event string.
dir('missing-event-string', {
  'order.feature': orderNo05.replace('When the Order Paid event occurs\n    Then the order is paid', 'When the payment clears\n    Then the order is paid'),
  'coupon.feature': couponBase,
});
// wrong-feature-name: Feature: order (snake_case stem).
dir('wrong-feature-name', {
  'order.feature': orderNo05.replace('Feature: Order', 'Feature: order'),
  'coupon.feature': couponBase,
});
// bad-filename: order feature in a file named orders.feature.
dir('bad-filename', {
  'orders.feature': orderNo05,
  'coupon.feature': couponBase,
});
// extra-feature-file: a .feature for no 03 aggregate.
dir('extra-feature-file', {
  'order.feature': orderNo05,
  'coupon.feature': couponBase,
  'invoice.feature': `# fingerprints:
#   01-event-storming.md@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
#   02-glossary.md@sha256:1111111111111111111111111111111111111111111111111111111111111111
#   03-aggregates.md@sha256:2222222222222222222222222222222222222222222222222222222222222222
#   04-erd.dbml@sha256:3333333333333333333333333333333333333333333333333333333333333333
#   04-transitions.md@sha256:4444444444444444444444444444444444444444444444444444444444444444
Feature: Invoice
  @invariant:INV-Order-1
  Scenario: placeholder
    Given x
    When y
    Then z
`,
});
// missing-feature-file: a 03 aggregate (coupon) with no .feature.
dir('missing-feature-file', {
  'order.feature': orderNo05,
});
// vacuous: a Feature: with no scenario (zero pickles). coupon valid for bijection.
dir('vacuous', {
  'order.feature': `# fingerprints:
#   01-event-storming.md@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
#   02-glossary.md@sha256:1111111111111111111111111111111111111111111111111111111111111111
#   03-aggregates.md@sha256:2222222222222222222222222222222222222222222222222222222222222222
#   04-erd.dbml@sha256:3333333333333333333333333333333333333333333333333333333333333333
#   04-transitions.md@sha256:4444444444444444444444444444444444444444444444444444444444444444
Feature: Order
`,
  'coupon.feature': couponBase,
});
// --- B7 authorization illegals ---
// uncovered-authz: drop one @authz scenario (the Customer-may-not-ship negative) — its
// B7 obligation (Order Shipped, Dispatcher-bound) is then uncovered ⇒ X-COV-AUTHZ.
dir('uncovered-authz', {
  'order.feature': orderNo05.replace(/\n  @authz:order\n  Scenario: A Customer may not ship a paid order[\s\S]*?Then the shipping attempt is rejected\n/, '\n'),
  'coupon.feature': couponBase,
});
// authz-not-rejected: the @authz scenario's Then asserts no rejection ⇒ X-AUTHZ.
dir('authz-not-rejected', {
  'order.feature': orderNo05.replace('Then the shipping attempt is rejected', 'Then the shipping attempt is recorded'),
  'coupon.feature': couponBase,
});
// authz-not-implied: an @authz scenario targets the SYSTEM-bound event 'Order Paid'
// (Payment Gateway) — the domain implies no authorization rejection there ⇒ X-AUTHZ
// (never invent a rejection the domain doesn't imply).
dir('authz-not-implied', {
  'order.feature': orderNo05.replace(
    '  @authz:order\n  Scenario: A Customer may not ship a paid order\n    Given the order is paid\n    When the Customer attempts the Order Shipped event\n    Then the shipping attempt is rejected',
    '  @authz:order\n  Scenario: A Customer may not ship a paid order\n    Given the order is paid\n    When the Customer attempts the Order Shipped event\n    Then the shipping attempt is rejected\n\n  @authz:order\n  Scenario: A Dispatcher may not pay a placed order\n    Given the order is placed\n    When the Dispatcher attempts the Order Paid event\n    Then the payment attempt is rejected'),
  'coupon.feature': couponBase,
});

// wrong-reason-trap: TWO defects — uncovered invariant (B1) AND a forbidden synonym (D4).
// The pinned OWNER is X-COV-INV; M17 also fires but is not the named owner.
dir('wrong-reason-trap', {
  'order.feature': orderNo05
    .replace(/  @invariant:INV-Order-1[\s\S]*?Then the placement attempt is rejected\n\n/, '')
    .replace('Then the order is paid', 'Then the purchase is paid'),
  'coupon.feature': couponBase,
});

// --- 05-mode illegals ---
// uncovered-transition (05): the beyond-04 refunded transition uncovered. Uses the 05
// valid order feature minus the Refunding scenario; run WITH --upstream-05.
dir('uncovered-transition', {
  'order.feature': order05.replace(/  @transition:order\n  Scenario: Refunding[\s\S]*?Then the order is refunded\n\n/, ''),
  'coupon.feature': couponBase,
});
// contradicting-scenario (05): a scenario asserts a From→To NOT in the 05 authority —
// uses the superseded 04 edge placed→cancelled is valid; instead assert delivered→cancelled
// (absent from scxml). Run WITH --upstream-05.
dir('contradicting-scenario', {
  'order.feature': order05.replace(
    '  @transition:order\n  Scenario: Refunding a delivered order advances it to refunded\n    Given the order is delivered\n    When the Order Refunded event occurs\n    Then the order is refunded',
    '  @transition:order\n  Scenario: Refunding a delivered order advances it to refunded\n    Given the order is delivered\n    When the Order Refunded event occurs\n    Then the order is refunded\n\n  @transition:order\n  Scenario: A delivered order jumps to cancelled\n    Given the order is delivered\n    When the Order Cancelled event occurs\n    Then the order is cancelled'),
  'coupon.feature': couponBase,
});
// 05-claimed-but-absent: a feature fingerprints 05-statecharts/order.scxml while
// --upstream-05 is ABSENT. Uses the 05 valid order feature (which has the 05 fingerprint)
// but run WITHOUT --upstream-05; coupon valid. The order feature also references refunded
// (a 05-only state) but the no-05 authority is 04 — so to isolate N-05ABSENT we keep the
// fingerprint as the single defect by using the no05 order body + an added 05 fingerprint.
dir('05-claimed-but-absent', {
  'order.feature': orderNo05.replace(
    '#   04-transitions.md@sha256:4444444444444444444444444444444444444444444444444444444444444444\n',
    '#   04-transitions.md@sha256:4444444444444444444444444444444444444444444444444444444444444444\n#   05-statecharts/order.scxml@sha256:5555555555555555555555555555555555555555555555555555555555555555\n'),
  'coupon.feature': couponBase,
});

console.log('generated illegal fixtures into fixtures/illegal/');
