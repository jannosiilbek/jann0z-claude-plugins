# fingerprints:
#   01-event-storming.md@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
#   02-glossary.md@sha256:1111111111111111111111111111111111111111111111111111111111111111
#   03-aggregates.md@sha256:2222222222222222222222222222222222222222222222222222222222222222
#   04-erd.dbml@sha256:3333333333333333333333333333333333333333333333333333333333333333
#   04-transitions.md@sha256:4444444444444444444444444444444444444444444444444444444444444444
Feature: Order

  @invariant:INV-Order-1
  Scenario: A cancelled order refuses a further placement attempt
    Given the order is cancelled
    When the Order Placed event occurs again
    Then the placement attempt is rejected

  @transition:order
  Scenario: Paying a placed order advances it to paid
    Given the order is placed
    When the Order Paid event occurs
    Then the order is paid

  @transition:order
  Scenario: Cancelling a placed order advances it to cancelled
    Given the order is placed
    When the Order Cancelled event occurs
    Then the order is cancelled

  @transition:order
  Scenario: Shipping a paid order advances it to shipped
    Given the order is paid
    When the Order Shipped event occurs
    Then the order is shipped

  @transition:order
  Scenario: Delivering a shipped order advances it to delivered
    Given the order is shipped
    When the Order Delivered event occurs
    Then the order is delivered

  @terminal:order
  Scenario: A cancelled order admits no further event
    Given the order is cancelled
    When the Order Paid event occurs again
    Then the order remains cancelled

  @policy:OrderShipsCoupon
  Scenario: Shipping an order eventually issues a coupon
    Given the order is paid
    When the Order Shipped event occurs
    Then eventually the Coupon is issued

  @authz:order
  Scenario: A Customer may not ship a paid order
    Given the order is paid
    When the Customer attempts the Order Shipped event
    Then the shipping attempt is rejected

  @authz:order
  Scenario: A Customer may not deliver a shipped order
    Given the order is shipped
    When the Customer attempts the Order Delivered event
    Then the delivery attempt is rejected

  @authz:order
  Scenario: A Dispatcher may not cancel a placed order
    Given the order is placed
    When the Dispatcher attempts the Order Cancelled event
    Then the cancellation attempt is rejected
