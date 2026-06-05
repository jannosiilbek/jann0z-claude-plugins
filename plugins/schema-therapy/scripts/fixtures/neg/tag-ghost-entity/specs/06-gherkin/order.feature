# fingerprints:
#   02-glossary.md@sha256:db52ea9cbf8ccbee0004da7ef25d88ac6d56b8f066b7a117a35fdf23c143bf8c
#   03-aggregates.md@sha256:3038ab45feee67bc0738f447d3b2da059bf6a731c6127d4f0417e5dab519f2cb
#   04-erd.dbml@sha256:046d99720e2bf7d62b6402f4b55f6cc1ea9f6b6f7e1a8deeea9e0e875251fcff
#   04-transitions.md@sha256:3a85ee85f4893a836892614bb810161d2a82ee7202c8fab1ae7672e0289d8535
Feature: Order

  @transition:ghost
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
