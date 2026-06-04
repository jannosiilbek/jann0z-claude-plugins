# fingerprints:
#   02-glossary.md@sha256:2ed23f79e00dafff18f4c87584a8821b1609eb533b3692747e65c6932b788fc9
#   03-aggregates.md@sha256:0de902e4bf885e26f33fcee898d17287fb11c6770c3ce53867e30da5d79f8352
#   04-erd.dbml@sha256:4020b3126b6bc7cc63b9dc48c6f9d642075eb4ddf6d2da882af11f8419d5b344
#   04-transitions.md@sha256:9adacca86e78d02104fc7ef2f8bc4fd1145f244f259ecba7ba696832e4a433d9
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
