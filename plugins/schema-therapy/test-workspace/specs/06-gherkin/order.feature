# fingerprints:
#   02-glossary.md@sha256:2c472777ffccf7a0275c19adec734cd7f050329d2f6c8197fc48c5a3bb6cab37
#   03-aggregates.md@sha256:a3966e66c0fe18e86756d918a98a0c62238db6742ac7477125d8a8da94755221
#   04-erd.dbml@sha256:1888517e6784c5dac865caa27e3708581c690651d7f8873895fef50835f8d255
#   04-transitions.md@sha256:b3b491ac88780cba10c83df5f5f799f6bd339dba46a1124433fab1115169165d
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
