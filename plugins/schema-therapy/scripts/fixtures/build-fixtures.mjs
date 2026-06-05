#!/usr/bin/env node
// build-fixtures.mjs — DETERMINISTICALLY (re)generate the selftest fixture suite.
// Produces a tiny, fully self-consistent "good" suite under good/specs spanning the
// FULL 0-10 artifact suite, whose fingerprint blocks are correctly chained (sha256
// of exact bytes of each input), then stamps the per-check-class NEGATIVE fixtures
// by mutating copies.
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
// aggregate (Customer). Persona: Customer with two jobs (place order, pay order).
// ===========================================================================
const ROOT = join(__dirname, 'good');
const SPECS = join(ROOT, 'specs');
fresh(SPECS);
for (const d of ['05-statecharts', '06-gherkin', '08-task-models', '09-ui-flows', '10-flow-acceptance'])
  mkdirSync(join(SPECS, d), { recursive: true });

const domain = readFileSync(join(ROOT, 'domain.md'), 'utf8');
const hDomain = sha(domain);
const intent = readFileSync(join(ROOT, 'product-intent.md'), 'utf8');
const hIntent = sha(intent);

// ---- 00 impact-map (fingerprints product-intent) ----
const a00 = `<!-- fingerprints:
product-intent.md@sha256:${hIntent}
-->

## Goal

Let customers place and pay for orders without back-office help.

## Business Actors

| Actor | Description |
|-------|-------------|
| Customer | Places and pays for orders directly |

## Impacts

| Impact | Business Actor (exact string) |
|--------|-------------------------------|
| Customer self-serves orders end to end | Customer |

## Deliverables

| Deliverable | Impact (exact string) |
|-------------|-----------------------|
| Online order placement | Customer self-serves orders end to end |
| Self-service card payment | Customer self-serves orders end to end |
`;
writeFileSync(join(SPECS, '00-impact-map.md'), a00);
const h00 = sha(a00);

// ---- 01 event-storming (dual fingerprint 00 + domain; 5-column events) ----
const a01 = `<!-- fingerprints:
00-impact-map.md@sha256:${h00}
domain.md@sha256:${hDomain}
-->

## Domain Events

| Event | Actor | Trigger | Notes | Deliverable |
|-------|-------|---------|-------|-------------|
| Order Placed | Customer | Place Order command | a customer opens an order | Online order placement |
| Order Paid | Customer | Order Placed | payment succeeded | Self-service card payment |
| Order Cancelled | Customer | Cancel Order command | order called off | — |
| Customer Registered | Customer | Register command | a customer account opens | — |

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
const h05order = sha(a05);

// ---- 06 order.feature ----
const a06 = `# fingerprints:
#   01-event-storming.md@sha256:${h01}
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

  @authz:order
  Scenario: A non-owning actor may not cancel a placed Order
    Given an Order in status placed
    When the Customer attempts the Order Cancelled event
    Then the request is rejected
`;
writeFileSync(join(SPECS, '06-gherkin', 'order.feature'), a06);
const h06order = sha(a06);

// ---- 07 personas (prose fingerprints; Customer persona, two jobs) ----
const a07 = `## Upstream Fingerprints

- 00-impact-map.md@sha256:${h00}
- 01-event-storming.md@sha256:${h01}

## Personas

### Customer

**Business actor:** Customer

**Goals:**

- Place and pay for an order entirely alone [impact: Customer self-serves orders end to end]

**Jobs-to-be-done:**

| Job | Trigger | Outcome |
|-----|---------|---------|
| place order | Place Order command | Order Placed |
| pay order | Order Placed | Order Paid |
`;
writeFileSync(join(SPECS, '07-personas.md'), a07);
const h07 = sha(a07);

// ---- 08 task-models (whitespace fingerprint dialect; specs/ prefix) ----
function task08(stem, persona, job, budget, leaves) {
  const fp = `<?xml version="1.0" encoding="UTF-8"?>
<!-- fingerprints:
       specs/06-gherkin/order.feature        sha256:${h06order}
       specs/07-personas.md                     sha256:${h07}
-->`;
  const leafXml = leaves.map((l) =>
    `    <Task id="${l.id}" category="${l.category}"\n          scenario-tags="${l.tags}"\n          klm="${l.klm}"/>`,
  ).join('\n');
  return `${fp}
<TaskModel id="${stem}"
           persona="${persona}" job="${job}">
  <Budget klm="${budget}"/>
  <Task id="${stem}-root" category="abstract" operator="enabling">
${leafXml}
  </Task>
</TaskModel>
`;
}
const a08place = task08('customer-place_order', 'Customer', 'place order', 4, [
  { id: 'select-tickets', category: 'interaction', tags: '@invariant:INV-Order-1', klm: 'MPBB' },
  { id: 'submit-order', category: 'interaction', tags: '@transition:order', klm: 'MBB' },
]);
writeFileSync(join(SPECS, '08-task-models', 'customer-place_order.xml'), a08place);
const h08place = sha(a08place);
const a08pay = task08('customer-pay_order', 'Customer', 'pay order', 4, [
  { id: 'pay-order', category: 'interaction', tags: '@transition:order', klm: 'MBB' },
]);
writeFileSync(join(SPECS, '08-task-models', 'customer-pay_order.xml'), a08pay);
const h08pay = sha(a08pay);

// ---- 09 ui-flows (whitespace fingerprint dialect; no specs/ prefix) ----
const a09 = `<?xml version="1.0" encoding="UTF-8"?>
<!-- fingerprints:
       02-glossary.md          sha256:${h02}
       04-erd.dbml             sha256:${h04dbml}
       04-transitions.md       sha256:${h04t}
       05-statecharts/order.scxml sha256:${h05order}
       07-personas.md          sha256:${h07}
       08-task-models/customer-place_order.xml sha256:${h08place}
       08-task-models/customer-pay_order.xml sha256:${h08pay}
-->
<IFMLModel id="customer" persona="Customer">

  <Realizes taskModel="customer-place_order"/>
  <Realizes taskModel="customer-pay_order"/>

  <ViewContainer id="order_compose" name="New Order" home="true">
    <ViewComponent id="order_form" type="form" binding="order"/>
    <Event id="pick_tickets" type="select" task="select-tickets" klm="MPBB"/>
    <Event id="place_order" type="submit" task="submit-order" klm="MBB">
      <!-- 01-event: Order Placed -->
    </Event>
    <Event id="open_payment" type="navigate"/>
  </ViewContainer>

  <ViewContainer id="order_payment" name="Pay Order">
    <ViewComponent id="payment_view" type="details" binding="order"/>
    <Event id="pay_order" type="submit" task="pay-order" klm="MBB">
      <!-- 01-event: Order Paid -->
    </Event>
    <Event id="back_from_payment" type="navigate"/>
  </ViewContainer>

  <NavigationFlow from="open_payment"      to="order_payment"/>
  <NavigationFlow from="back_from_payment" to="order_compose"/>

</IFMLModel>
`;
writeFileSync(join(SPECS, '09-ui-flows', 'customer.xml'), a09);
const h09customer = sha(a09);

// ---- 10 flow-acceptance (one feature per 08 model) ----
function feature10(stem, persona, jobNatural, screenSteps) {
  return `# fingerprints:
#   06-gherkin/order.feature@sha256:${h06order}
#   09-ui-flows/customer.xml@sha256:${h09customer}
#   08-task-models/${stem}.xml@sha256:${stem === 'customer-place_order' ? h08place : h08pay}
@task-model:${stem}
Feature: ${jobNatural}

  The ${persona} walks the flow screen by screen, with each domain outcome bound
  to the 06 scenario it realizes by tag.

  Scenario: The ${persona} ${jobNatural.toLowerCase()} end to end
${screenSteps}
`;
}
const a10place = feature10('customer-place_order', 'Customer', 'Place order',
  `    Given the Customer is on the "order_compose" screen
    When the Customer triggers the "pick_tickets" event
    Then the outcome of "@invariant:INV-Order-1" holds
    When the Customer submits the order: "Order Placed"
    Then the outcome of "@transition:order" holds`);
writeFileSync(join(SPECS, '10-flow-acceptance', 'customer-place_order.feature'), a10place);
const a10pay = feature10('customer-pay_order', 'Customer', 'Pay order',
  `    Given the Customer is on the "order_payment" screen
    When the Customer pays the order: "Order Paid"
    Then the outcome of "@transition:order" holds`);
writeFileSync(join(SPECS, '10-flow-acceptance', 'customer-pay_order.feature'), a10pay);

// ===========================================================================
// NEGATIVE FIXTURES — each is a full copy of good/specs with ONE mutation that
// MUST trip exactly one check class for the stated reason (co-present cascades
// allowed; the manifest asserts the PRIMARY finding).
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

// --------------------------- 01-06 negatives (unchanged families) -----------

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
  write(p, read(p).replace(/^<!-- fingerprints:[\s\S]*?-->\n/, ''));
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
  write(p, `// fingerprints:\n// 02-glossary.md@sha256:${h02}\n// 03-aggregates.md@sha256:${h03}\nEnum order_status {\n  placed\n`);
}

// 7. wrong-reason trap: a 06 tag points at a GHOST invariant (INV-Order-9) AND a
//    genuinely co-present SECOND defect (a restated 01 Actors shape in 02). The
//    R-06-tag finding MUST name INV-Order-9 and MUST NOT conflate the restated-
//    shape defect; both fire independently.
{
  const s = clone('wrong-reason-trap');
  const p = f(s, '06-gherkin', 'order.feature');
  write(p, read(p).replace('@invariant:INV-Order-1', '@invariant:INV-Order-9'));
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

// 9. tag-ghost-entity: a 06 transition tag to a non-existent 04 table.
{
  const s = clone('tag-ghost-entity');
  const p = f(s, '06-gherkin', 'order.feature');
  write(p, read(p).replace('@transition:order', '@transition:ghost'));
}

// 10. when-no-event: a 06 When with NO authoritative event string.
{
  const s = clone('when-no-event');
  const p = f(s, '06-gherkin', 'order.feature');
  write(p, read(p).replace('When the Order Paid event occurs\n    Then the Order is in status paid', 'When something unrelated happens\n    Then the Order is in status paid'));
}

// --------------------------- 00 / 07-10 negatives (new families) ------------

// 11. ghost-business-actor: a 01 human actor not in 00 Business Actors.
{
  const s = clone('ghost-business-actor');
  const p = f(s, '01-event-storming.md');
  // add a new role actor with no 00 backing
  write(p, read(p).replace(
    '| Customer | person | Places, pays, and cancels orders |',
    '| Customer | person | Places, pays, and cancels orders |\n| Manager | role | Approves orders |',
  ));
}

// 12. uncovered-deliverable: a 00 deliverable realized by no 01 event.
{
  const s = clone('uncovered-deliverable');
  const p = f(s, '00-impact-map.md');
  write(p, read(p).replace(
    '| Self-service card payment | Customer self-serves orders end to end |\n',
    '| Self-service card payment | Customer self-serves orders end to end |\n| Loyalty rewards | Customer self-serves orders end to end |\n',
  ));
}

// 13. ghost-impact-token: a 07 goal [impact: …] not a 00 Impact.
{
  const s = clone('ghost-impact-token');
  const p = f(s, '07-personas.md');
  write(p, read(p).replace(
    '[impact: Customer self-serves orders end to end]',
    '[impact: Customer enjoys a delightful unicorn experience]',
  ));
}

// 14. ghost-scenario-tag: an 08 leaf scenario-tag not in 06 tag vocabulary.
{
  const s = clone('ghost-scenario-tag');
  const p = f(s, '08-task-models', 'customer-pay_order.xml');
  write(p, read(p).replace('scenario-tags="@transition:order"', 'scenario-tags="@invariant:INV-Order-99"'));
}

// 15. broken-bijection-08: an 08 file with no matching 07 persona-job.
{
  const s = clone('broken-bijection-08');
  cpSync(f(s, '08-task-models', 'customer-pay_order.xml'), f(s, '08-task-models', 'customer-ghost_job.xml'));
  let t = read(f(s, '08-task-models', 'customer-ghost_job.xml'));
  t = t.replace('id="customer-pay_order"', 'id="customer-ghost_job"').replace('job="pay order"', 'job="ghost job"');
  write(f(s, '08-task-models', 'customer-ghost_job.xml'), t);
}

// 16. ghost-event-task: a 09 Event task= not a leaf of any realized 08 model.
{
  const s = clone('ghost-event-task');
  const p = f(s, '09-ui-flows', 'customer.xml');
  write(p, read(p).replace('task="select-tickets"', 'task="ghost-leaf"'));
}

// 17. bad-authority-event: a 09 01-event not in the entity's authority.
{
  const s = clone('bad-authority-event');
  const p = f(s, '09-ui-flows', 'customer.xml');
  write(p, read(p).replace('<!-- 01-event: Order Paid -->', '<!-- 01-event: Order Teleported -->'));
}

// 18. ghost-screen: a 10 screen ref absent from the persona's 09 containers.
{
  const s = clone('ghost-screen');
  const p = f(s, '10-flow-acceptance', 'customer-place_order.feature');
  write(p, read(p).replace('on the "order_compose" screen', 'on the "ghost_screen" screen'));
}

// 19. ghost-outcome-tag: a 10 outcome tag not in 06 tag vocabulary.
{
  const s = clone('ghost-outcome-tag');
  const p = f(s, '10-flow-acceptance', 'customer-place_order.feature');
  write(p, read(p).replace('outcome of "@transition:order"', 'outcome of "@transition:ghost"'));
}

// 20. stale-00-fingerprint: corrupt the product-intent hash inside 00.
{
  const s = clone('stale-00-fingerprint');
  const p = f(s, '00-impact-map.md');
  write(p, read(p).replace(`product-intent.md@sha256:${hIntent}`, `product-intent.md@sha256:${'0'.repeat(64)}`));
}

// 21. stale-07-fingerprint: corrupt the 00 hash inside 07 (prose dialect).
{
  const s = clone('stale-07-fingerprint');
  const p = f(s, '07-personas.md');
  write(p, read(p).replace(`00-impact-map.md@sha256:${h00}`, `00-impact-map.md@sha256:${'0'.repeat(64)}`));
}

// 22. stale-08-fingerprint: corrupt the 07 hash inside 08 (whitespace dialect).
{
  const s = clone('stale-08-fingerprint');
  const p = f(s, '08-task-models', 'customer-pay_order.xml');
  write(p, read(p).replace(`specs/07-personas.md                     sha256:${h07}`, `specs/07-personas.md                     sha256:${'0'.repeat(64)}`));
}

// 23. stale-09-fingerprint: corrupt the 04-erd hash inside 09 (whitespace dialect).
{
  const s = clone('stale-09-fingerprint');
  const p = f(s, '09-ui-flows', 'customer.xml');
  write(p, read(p).replace(`04-erd.dbml             sha256:${h04dbml}`, `04-erd.dbml             sha256:${'0'.repeat(64)}`));
}

// 24. stale-10-fingerprint: corrupt the 09 hash inside a 10 feature.
{
  const s = clone('stale-10-fingerprint');
  const p = f(s, '10-flow-acceptance', 'customer-place_order.feature');
  write(p, read(p).replace(`09-ui-flows/customer.xml@sha256:${h09customer}`, `09-ui-flows/customer.xml@sha256:${'0'.repeat(64)}`));
}

// 25. malformed-08-xml: an 08 file with a broken <TaskModel> element.
{
  const s = clone('malformed-08-xml');
  const p = f(s, '08-task-models', 'customer-pay_order.xml');
  // strip the TaskModel attributes so persona/job/id are absent => ParseError
  write(p, read(p).replace(/<TaskModel id="[^"]*"\s+persona="[^"]*" job="[^"]*">/, '<TaskModel>'));
}

// 26. malformed-09-xml: a 09 file with no <IFMLModel> persona attr.
{
  const s = clone('malformed-09-xml');
  const p = f(s, '09-ui-flows', 'customer.xml');
  write(p, read(p).replace(/<IFMLModel id="customer" persona="Customer">/, '<IFMLModel id="customer">'));
}

// 27. vacuous: an EMPTY specs dir (zero artifacts) => broken-test.
{
  const d = join(NEG, 'vacuous', 'specs');
  fresh(d);
}

process.stdout.write('fixtures rebuilt: good/specs (0-10) + neg/*\n');
