# fingerprints:
#   06-gherkin/ticket.feature@sha256:3fcf82c1527f843f5c0018422c8263b4709029184db2513c8b235561c13c3099
#   09-ui-flows/customer.xml@sha256:f218a74ceddd1273d3679ce6ea83890bb304dee9ad41e7558423cc5f0c73a983
#   08-task-models/customer-cancel_ticket.xml@sha256:2d6fbfa239c14478563d877779a53c6a5872c3b94d8a7ecd320f53bb14cbf640
@task-model:customer-cancel_ticket
Feature: Cancel ticket

  The Customer cancels a ticket from the home screen, screen by screen, with
  each domain outcome bound to the 06 scenario it realizes by tag.

  Scenario: The Customer cancels a ticket end to end
    Given the Customer is on the "customer_home" screen
    When the Customer triggers the "start_cancel" event
    Then the Customer is taken to the "ticket_cancel" screen
    When the Customer triggers the "pick_ticket" event
    Then the outcome of "@invariant:INV-Ticket-1" holds
    When the Customer cancels the ticket: "Ticket Cancelled"
    Then the outcome of "@transition:ticket" holds
