# fingerprints:
#   06-gherkin/refund.feature@sha256:75c6e2e5bb5a46f8072636a328d398b7c426f2d5bf60a72c6b732cd7296f1f49
#   06-gherkin/ticket.feature@sha256:3fcf82c1527f843f5c0018422c8263b4709029184db2513c8b235561c13c3099
#   09-ui-flows/financeofficer.xml@sha256:591c2520cbd8e5a9130ee9292dc220ce9ca9f82b068daeadff36bb8ca20a803a
#   08-task-models/financeofficer-request_refund.xml@sha256:0c6d62573474445e4fc4b859773ff17bc4cbdb432bc6afce725bc7c82f7d62ef
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
