#!/usr/bin/env node
// build-fixtures.mjs — DETERMINISTICALLY (re)generate the selftest fixture suite.
// Produces a tiny, fully self-consistent "good" suite under good/specs whose
// fingerprint blocks are correctly chained (sha256 of exact bytes of each input),
// then stamps the per-check-class NEGATIVE fixtures by mutating copies.
//
// Run: node fixtures/build-fixtures.mjs   (idempotent; byte-stable output)
//
// The selftest reads these directories; it does NOT run this builder. Re-run this
// builder only when the fixture suite's CONTENT changes (then commit the result).

import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync, cpSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sha = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');

function fresh(dir) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

// ===========================================================================
// THE GOOD SUITE — domain: Orders. One aggregate (Order), one referenced
// aggregate (Customer), states placed->paid / placed->cancelled.
// ===========================================================================
const ROOT = join(__dirname, 'good');
const SPECS = join(ROOT, 'specs');
fresh(SPECS);
mkdirSync(join(SPECS, '05-statecharts'), { recursive: true });
mkdirSync(join(SPECS, '06-gherkin'), { recursive: true });

const domain = readFileSync(join(ROOT, 'domain.md'), 'utf8');
const hDomain = sha(domain);

// ---- 01 ----
const a01 = `<!-- fingerprints:
domain.md@sha256:${hDomain}
-->

## Domain Events

| Event | Actor | Trigger | Notes |
|-------|-------|---------|-------|
| Order Placed | Customer | Place Order command | a customer opens an order |
| Order Paid | Customer | Order Placed | payment succeeded |
| Order Cancelled | Customer | Cancel Order command | order called off |
| Customer Registered | Customer | Register command | a customer account opens |

## Actors

| Actor | Kind | Responsibility |
|-------|------|----------------|
| Customer | person | Places, pays, and cancels orders |

## Hotspots

| Hotspot | Question | Blocks |
|---------|----------|--------|
| Cancellation window | How long may a placed order be cancelled? | Order Cancelled |

## Lifecycle Skeletons

### Order

1. Order Placed
2. Order Paid
3. Order Cancelled

### Customer

1. Customer Registered
`;
writeFileSync(join(SPECS, '01-event-storming.md'), a01);
const h01 = sha(a01);

// ---- 02 ----
const a02 = `<!-- fingerprints:
01-event-storming.md@sha256:${h01}
-->

## Terms

| Term | Definition | Owns 01 element? | 01 element (exact string) |
|------|------------|------------------|---------------------------|
| Customer | A party that opens and settles orders. | yes | Customer |
| Order | A patron's intent to acquire goods, tracked until settled. | yes | Order |

## Enums

### OrderStatus

| Value | Derived from event (exact 01 string) |
|-------|--------------------------------------|
| placed | Order Placed |
| paid | Order Paid |
| cancelled | Order Cancelled |

### CustomerStatus

| Value | Derived from event (exact 01 string) |
|-------|--------------------------------------|
| registered | Customer Registered |

## Forbidden Synonyms

| Forbidden term | Canonical term | Reason |
|----------------|----------------|--------|
| Buyer | Customer | One name per patron concept. |
`;
writeFileSync(join(SPECS, '02-glossary.md'), a02);
const h02 = sha(a02);

// ---- 03 ----
const a03 = `<!-- fingerprints:
01-event-storming.md@sha256:${h01}
02-glossary.md@sha256:${h02}
-->

## Aggregates

### Order

**Root:** Order · identity: OrderId

**Boundary contents:**

| Member | Kind | 02 Term |
|--------|------|---------|
| Order | entity | Order |
| OrderId | value object | — |

**Invariants:**

| ID | Rule | Scope |
|----|------|-------|
| INV-Order-1 | An Order in status paid may not return to status placed or status cancelled. | within-boundary |

**References (by identity only):**

| Target aggregate | Identity field held | Reason |
|------------------|---------------------|--------|
| Customer | CustomerId | An order is owned by one customer, held by identity only. |

### Customer

**Root:** Customer · identity: CustomerId

**Boundary contents:**

| Member | Kind | 02 Term |
|--------|------|---------|
| Customer | entity | Customer |
| CustomerId | value object | — |

**Invariants:**

| ID | Rule | Scope |
|----|------|-------|
| INV-Customer-1 | A registered Customer holds a unique CustomerId. | within-boundary |

**References (by identity only):**

none

## Cross-Aggregate Policies

| Policy | Source event | Target aggregate | Mode | Justification |
|--------|--------------|------------------|------|---------------|
| POL-1 | Order Paid | Customer | eventual | Crediting the customer happens outside the paying transaction. |
`;
writeFileSync(join(SPECS, '03-aggregates.md'), a03);
const h03 = sha(a03);

// ---- 04 dbml ----
const a04 = `// fingerprints:
// 02-glossary.md@sha256:${h02}
// 03-aggregates.md@sha256:${h03}

Enum order_status {
  placed
  paid
  cancelled
}

Enum customer_status {
  registered
}

Table customer {
  id int [pk, increment]
  status customer_status [not null]
}

Table order {
  id int [pk, increment]
  customer_id int [not null]
  status order_status [not null]
}

Ref: order.customer_id > customer.id
`;
writeFileSync(join(SPECS, '04-erd.dbml'), a04);
const h04dbml = sha(a04);

// ---- 04 transitions ----
const a04t = `<!-- fingerprints:
02-glossary.md@sha256:${h02}
03-aggregates.md@sha256:${h03}
-->

# Transition Tables

## Transition Tables

### order

| From | Event (exact 01 string) | To |
|------|-------------------------|-----|
| ∅ | Order Placed | placed |
| placed | Order Paid | paid |
| placed | Order Cancelled | cancelled |

### customer

| From | Event (exact 01 string) | To |
|------|-------------------------|-----|
| ∅ | Customer Registered | registered |
`;
writeFileSync(join(SPECS, '04-transitions.md'), a04t);
const h04t = sha(a04t);

// ---- 05 order.scxml (promoted; supersedes 04 order) ----
const a05 = `<?xml version="1.0" encoding="UTF-8"?>
<!-- fingerprints:
  01-event-storming.md@sha256:${h01}
  02-glossary.md@sha256:${h02}
  03-aggregates.md@sha256:${h03}
  04-erd.dbml@sha256:${h04dbml}
  04-transitions.md@sha256:${h04t}
-->
<!-- supersedes: 04-transitions.md#order -->
<scxml version="1.0" xmlns="http://www.w3.org/2005/07/scxml" datamodel="null" initial="placed">
  <!-- 01-event: Order Placed -->
  <state id="placed">
    <!-- 01-event: Order Paid -->
    <transition event="order_paid" target="paid"/>
    <!-- 01-event: Order Cancelled -->
    <transition event="order_cancelled" target="cancelled"/>
  </state>
  <final id="paid"/>
  <final id="cancelled"/>
</scxml>
`;
writeFileSync(join(SPECS, '05-statecharts', 'order.scxml'), a05);

// ---- 06 order.feature ----
const a06 = `# fingerprints:
#   02-glossary.md@sha256:${h02}
#   03-aggregates.md@sha256:${h03}
#   04-erd.dbml@sha256:${h04dbml}
#   04-transitions.md@sha256:${h04t}
Feature: Order

  @transition:order
  Scenario: A placed Order that settles moves to paid
    Given an Order in status placed
    When the Order Paid event occurs
    Then the Order is in status paid

  @terminal:order
  Scenario: A paid Order admits no further change
    Given an Order in status paid
    When the Order Cancelled event occurs
    Then the Order remains in status paid

  @invariant:INV-Order-1
  Scenario: Returning a paid Order to placed is rejected
    Given an Order in status paid
    When the Order Placed event occurs
    Then the request is rejected

  @policy:POL-1
  Scenario: Settling an Order credits the customer
    Given an Order in status placed
    When the Order Paid event occurs
    Then eventually the Customer is credited
`;
writeFileSync(join(SPECS, '06-gherkin', 'order.feature'), a06);

// ===========================================================================
// NEGATIVE FIXTURES — each is a full copy of good/specs with ONE mutation that
// MUST trip exactly one check class for the stated reason.
// ===========================================================================
const NEG = join(__dirname, 'neg');
fresh(NEG);

function clone(name) {
  const d = join(NEG, name);
  cpSync(SPECS, join(d, 'specs'), { recursive: true });
  return join(d, 'specs');
}
const f = (dir, ...rel) => join(dir, ...rel);
const read = (p) => readFileSync(p, 'utf8');
const write = (p, s) => writeFileSync(p, s);

// 1. dangling-resolution: 02 enum derivation string not in 01 events.
{
  const s = clone('dangling-resolution');
  const p = f(s, '02-glossary.md');
  write(p, read(p).replace('| paid | Order Paid |', '| paid | Order Settled |'));
}

// 2. restated-shape (DRY): paste a 01 Actors table shape into 02.
{
  const s = clone('restated-shape');
  const p = f(s, '02-glossary.md');
  const restated = `\n## Restated\n\n| Actor | Kind | Responsibility |\n|-------|------|----------------|\n| Customer | person | Places orders |\n`;
  write(p, read(p) + restated);
}

// 3. stale-fingerprint: corrupt the 02 hash recorded inside 03.
{
  const s = clone('stale-fingerprint');
  const p = f(s, '03-aggregates.md');
  write(p, read(p).replace(`02-glossary.md@sha256:${h02}`, `02-glossary.md@sha256:${'0'.repeat(64)}`));
}

// 4. missing-fingerprint (malformed): strip 03's whole fingerprint block.
{
  const s = clone('missing-fingerprint');
  const p = f(s, '03-aggregates.md');
  let t = read(p);
  t = t.replace(/^<!-- fingerprints:[\s\S]*?-->\n/, '');
  write(p, t);
}

// 5. malformed-fingerprint (malformed): break a fingerprint line's shape.
{
  const s = clone('malformed-fingerprint');
  const p = f(s, '03-aggregates.md');
  write(p, read(p).replace(`02-glossary.md@sha256:${h02}`, `02-glossary.md@sha256:NOT-HEX-AT-ALL`));
}

// 6. unparseable-artifact (malformed): destroy 04 dbml structure.
{
  const s = clone('unparseable-artifact');
  const p = f(s, '04-erd.dbml');
  write(p, `// fingerprints:\n// 02-glossary.md@sha256:${h02}\n// 03-aggregates.md@sha256:${h03}\nEnum order_status {\n  placed\n`); // unterminated enum block
}

// 7. wrong-reason trap: a 06 tag points at a GHOST invariant (INV-Order-9) AND a
//    genuinely co-present SECOND defect lives in the same suite (a restated 01
//    Actors shape pasted into 02). The R-06-tag finding MUST name INV-Order-9 and
//    MUST NOT conflate the restated-shape defect into its own detail — proving
//    the checks do not leak into one another. Both findings fire independently.
{
  const s = clone('wrong-reason-trap');
  const p = f(s, '06-gherkin', 'order.feature');
  write(p, read(p).replace('@invariant:INV-Order-1', '@invariant:INV-Order-9'));
  // co-present, independent DRY defect
  const p2 = f(s, '02-glossary.md');
  const restated = `\n## Restated\n\n| Actor | Kind | Responsibility |\n|-------|------|----------------|\n| Customer | person | Places orders |\n`;
  write(p2, read(p2) + restated);
}

// 8. missing-05-supersedes-target: 05 supersedes an entity with no 04 table.
{
  const s = clone('missing-05-supersedes-target');
  const p = f(s, '05-statecharts', 'order.scxml');
  write(p, read(p).replace('<!-- supersedes: 04-transitions.md#order -->', '<!-- supersedes: 04-transitions.md#ghost -->'));
}

// 9. 06-tag-to-ghost-invariant: a transition tag to a non-existent 04 table.
{
  const s = clone('tag-ghost-entity');
  const p = f(s, '06-gherkin', 'order.feature');
  write(p, read(p).replace('@transition:order', '@transition:ghost'));
}

// 10. conflated-counter trap: a 06 When with NO authoritative event string.
{
  const s = clone('when-no-event');
  const p = f(s, '06-gherkin', 'order.feature');
  write(p, read(p).replace('When the Order Paid event occurs\n    Then the Order is in status paid', 'When something unrelated happens\n    Then the Order is in status paid'));
}

// 11. vacuous: an EMPTY specs dir (zero artifacts) => broken-test.
{
  const d = join(NEG, 'vacuous', 'specs');
  fresh(d);
}

process.stdout.write('fixtures rebuilt: good/specs + neg/*\n');
