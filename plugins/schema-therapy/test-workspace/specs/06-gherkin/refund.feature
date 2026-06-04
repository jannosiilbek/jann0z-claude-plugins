# fingerprints:
#   02-glossary.md@sha256:2c472777ffccf7a0275c19adec734cd7f050329d2f6c8197fc48c5a3bb6cab37
#   03-aggregates.md@sha256:a3966e66c0fe18e86756d918a98a0c62238db6742ac7477125d8a8da94755221
#   04-erd.dbml@sha256:1888517e6784c5dac865caa27e3708581c690651d7f8873895fef50835f8d255
#   04-transitions.md@sha256:b3b491ac88780cba10c83df5f5f799f6bd339dba46a1124433fab1115169165d
Feature: Refund

  @transition:refund
  Scenario: A requested Refund that the gateway honors moves to issued
    Given a Refund in status requested
    When the Refund Issued event occurs
    Then the record is in status issued

  @transition:refund
  Scenario: An issued Refund the gateway bounces moves to failed
    Given a Refund in status issued
    When the Refund Failed event occurs
    Then the record is in status failed

  @transition:refund
  Scenario: A failed Refund handed to finance moves to escalated
    Given a Refund in status failed
    When the Refund Escalated event occurs
    Then the record is in status escalated

  @terminal:refund
  Scenario: An escalated Refund admits no further lifecycle change
    Given a Refund in status escalated
    When the Refund Issued event occurs
    Then the record remains in status escalated

  @invariant:INV-Refund-1
  Scenario: Reaching issued from failed is rejected
    Given a Refund in status failed
    When the Refund Issued event occurs
    Then the request is rejected

  @invariant:INV-Refund-2
  Scenario: Silently returning a failed Refund to issued is rejected
    Given a Refund in status failed
    When the Refund Issued event occurs without escalation
    Then the request is rejected
