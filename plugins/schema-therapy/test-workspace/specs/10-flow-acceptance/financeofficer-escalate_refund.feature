# fingerprints:
#   06-gherkin/refund.feature@sha256:75c6e2e5bb5a46f8072636a328d398b7c426f2d5bf60a72c6b732cd7296f1f49
#   09-ui-flows/financeofficer.xml@sha256:591c2520cbd8e5a9130ee9292dc220ce9ca9f82b068daeadff36bb8ca20a803a
#   08-task-models/financeofficer-escalate_refund.xml@sha256:96c257de84120100e0268ae4ba565d755ce4963a0d5f994b300cf943006d3a04
@task-model:financeofficer-escalate_refund
Feature: Escalate refund

  The FinanceOfficer escalates a failed refund from the queue, screen by
  screen, with each domain outcome bound to the 06 scenario it realizes by tag.

  Scenario: The FinanceOfficer escalates a refund end to end
    Given the FinanceOfficer is on the "refund_queue" screen
    When the FinanceOfficer triggers the "open_escalation" event
    Then the FinanceOfficer is taken to the "refund_escalation" screen
    When the FinanceOfficer triggers the "diagnose_failure" event
    Then the outcome of "@invariant:INV-Refund-2" holds
    When the FinanceOfficer hands the refund to finance: "Refund Escalated"
    Then the outcome of "@transition:refund" holds
    And the outcome of "@terminal:refund" holds
