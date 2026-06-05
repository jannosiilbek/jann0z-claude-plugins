# fingerprints:
#   06-gherkin/refund.feature@sha256:b25938e46714240ac9d3f41663a55167785ed8b13124ecf79e80a3406b1f45d3
#   09-ui-flows/financeofficer.xml@sha256:9c9542ca3c661d66d27a3fbc479aefa1914b9cee0f93489de4e873b268fab0ac
#   08-task-models/financeofficer-escalate_refund.xml@sha256:bce9721b79b849ae372075ef12715db9365d1b3f4d90278c5ab3324eddf5cdd7
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
