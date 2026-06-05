# fingerprints:
#   06-gherkin/refund.feature@sha256:b25938e46714240ac9d3f41663a55167785ed8b13124ecf79e80a3406b1f45d3
#   09-ui-flows/financeofficer.xml@sha256:9c9542ca3c661d66d27a3fbc479aefa1914b9cee0f93489de4e873b268fab0ac
#   08-task-models/financeofficer-issue_refund.xml@sha256:ce06e3f8c9630ce11ca01241788076a77e672ac9b5fe1f8a8c6901bd1da0360b
@task-model:financeofficer-issue_refund
Feature: Issue refund

  The FinanceOfficer authorizes a refund payout from the queue, screen by
  screen, with the domain outcome bound to the 06 scenario it realizes by tag.

  Scenario: The FinanceOfficer issues a refund end to end
    Given the FinanceOfficer is on the "refund_queue" screen
    When the FinanceOfficer triggers the "open_issue" event
    Then the FinanceOfficer is taken to the "refund_issue" screen
    When the FinanceOfficer authorizes the payout: "Refund Issued"
    Then the outcome of "@invariant:INV-Refund-1" holds
