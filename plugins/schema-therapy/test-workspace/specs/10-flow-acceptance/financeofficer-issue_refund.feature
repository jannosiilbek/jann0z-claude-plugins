# fingerprints:
#   06-gherkin/refund.feature@sha256:75c6e2e5bb5a46f8072636a328d398b7c426f2d5bf60a72c6b732cd7296f1f49
#   09-ui-flows/financeofficer.xml@sha256:591c2520cbd8e5a9130ee9292dc220ce9ca9f82b068daeadff36bb8ca20a803a
#   08-task-models/financeofficer-issue_refund.xml@sha256:4dd15a5ac404821147239a766c254da16e8ab9f884c3416b813c7d605828775c
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
