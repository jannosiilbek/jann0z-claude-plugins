# fingerprints:
#   01-event-storming.md@sha256:8808edde01f35a1a3d5d6a4aba10133d725920d68c42d432c6d5bbc5d872ddd4
#   02-glossary.md@sha256:5f13227739cd2a3444b73a7c531d1d4de611054b81ba40bda62c1e6966ed4fca
#   03-aggregates.md@sha256:ac07c8635123654f57f21235d857ab809782c2e0b9f3fbf0938fb8a51fb398d4
#   04-erd.dbml@sha256:3e8dfce8ca142390d7b5efcc820ef5bf4dcb1605be000834df1178d830cde622
#   04-transitions.md@sha256:b3953d456bbc9d5d5615d1110ac5fd2d052826a33a444fae2250ea1b78ee2759
Feature: Order

  @transition:order
  Scenario: A placed Order whose payment does not clear moves to payment_failed
    Given an Order in status placed
    When the Order Payment Failed event occurs
    Then the Order is in status payment_failed

  @transition:order
  Scenario: A placed Order whose payment settles moves to paid
    Given an Order in status placed
    When the Order Paid event occurs
    Then the Order is in status paid

  @transition:order
  Scenario: A placed Order left unsettled past its window moves to expired
    Given an Order in status placed
    When the Order Expired event occurs
    Then the Order is in status expired

  @transition:order
  Scenario: A retried Order whose payment settles moves to paid
    Given an Order in status payment_failed
    When the Order Paid event occurs
    Then the Order is in status paid

  @terminal:order
  Scenario: A paid Order admits no further lifecycle change
    Given an Order in status paid
    When the Order Expired event occurs
    Then the Order remains in status paid

  @terminal:order
  Scenario: An expired Order admits no further lifecycle change
    Given an Order in status expired
    When the Order Paid event occurs
    Then the Order remains in status expired

  @invariant:INV-Order-1
  Scenario: Returning a paid Order to placed is rejected
    Given an Order in status paid
    When the Order Placed event occurs
    Then the request is rejected

  @invariant:INV-Order-2
  Scenario: Settling payment on an expired Order is rejected
    Given an Order in status expired
    When the Order Paid event occurs
    Then the request is rejected

  @policy:POL-1
  Scenario: Settling an Order drives its held allocation to be sold
    Given an Order in status placed holding a reserved Ticket allocation
    When the Order Paid event occurs
    Then eventually each held Ticket is in status sold

  @policy:POL-2
  Scenario: Letting an Order lapse drives its held allocation back to the pool
    Given an Order in status placed holding a reserved Ticket allocation
    When the Order Expired event occurs
    Then eventually each held Ticket is in status released
