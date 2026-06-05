# fingerprints:
#   01-event-storming.md@sha256:8808edde01f35a1a3d5d6a4aba10133d725920d68c42d432c6d5bbc5d872ddd4
#   02-glossary.md@sha256:5f13227739cd2a3444b73a7c531d1d4de611054b81ba40bda62c1e6966ed4fca
#   03-aggregates.md@sha256:ac07c8635123654f57f21235d857ab809782c2e0b9f3fbf0938fb8a51fb398d4
#   04-erd.dbml@sha256:3e8dfce8ca142390d7b5efcc820ef5bf4dcb1605be000834df1178d830cde622
#   04-transitions.md@sha256:b3953d456bbc9d5d5615d1110ac5fd2d052826a33a444fae2250ea1b78ee2759
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

  @authz:refund
  Scenario: A Customer may not issue a requested Refund
    Given a Refund in status requested
    When the Customer attempts the Refund Issued event
    Then the request is rejected

  @authz:refund
  Scenario: An Organizer may not escalate a failed Refund
    Given a Refund in status failed
    When the Organizer attempts the Refund Escalated event
    Then the request is rejected
