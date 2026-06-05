# fingerprints:
#   06-gherkin/refund.feature@sha256:b25938e46714240ac9d3f41663a55167785ed8b13124ecf79e80a3406b1f45d3
#   06-gherkin/ticket.feature@sha256:8a8fb5b2bf1240708b1561c4bacfaff1ed6e9681106914974cab002dd984ac44
#   09-ui-flows/financeofficer.xml@sha256:9c9542ca3c661d66d27a3fbc479aefa1914b9cee0f93489de4e873b268fab0ac
#   08-task-models/financeofficer-request_refund.xml@sha256:5d8be6f8b2d9c369739e1c3e00fd4176a9b5e699b08d6841457c46a7e237a194
@task-model:financeofficer-request_refund
Feature: Request refund

  The FinanceOfficer raises a refund request from the queue, screen by screen,
  with each domain outcome bound to the 06 scenario it realizes by tag.

  Scenario: The FinanceOfficer requests a refund end to end
    Given the FinanceOfficer is on the "refund_queue" screen
    When the FinanceOfficer triggers the "open_request" event
    Then the FinanceOfficer is taken to the "refund_request" screen
    When the FinanceOfficer triggers the "review_cancellation" event
    Then the outcome of "@policy:POL-4" holds
    When the FinanceOfficer raises the refund request: "Refund Requested"
    Then the outcome of "@transition:refund" holds
