# fingerprints:
#   06-gherkin/ticket.feature@sha256:8a8fb5b2bf1240708b1561c4bacfaff1ed6e9681106914974cab002dd984ac44
#   09-ui-flows/customer.xml@sha256:6db976f512e9f664055c48b1b17bf6acee85e2030a2bcbfd471cd62547d47203
#   08-task-models/customer-cancel_ticket.xml@sha256:e2553719a65bd8dd8f2ae20caa60bf4b29a1434d1283abf1b0d821afb8b18252
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
