# fingerprints:
#   06-gherkin/order.feature@sha256:e656728752b2cd3189c1188bebe5e70ccaf318e6d9b6f45f63028a8602f129e9
#   09-ui-flows/customer.xml@sha256:f218a74ceddd1273d3679ce6ea83890bb304dee9ad41e7558423cc5f0c73a983
#   08-task-models/customer-buy_ticket.xml@sha256:da02f76e64e8fe885555d49d5f911cffdd1830f1d002bbd1338a912886310b23
@task-model:customer-buy_ticket
Feature: Buy ticket

  The Customer pays for an order from the home screen, screen by screen, with
  the domain outcome bound to the 06 scenario it realizes by tag.

  Scenario: The Customer buys a ticket end to end
    Given the Customer is on the "customer_home" screen
    When the Customer triggers the "open_payment" event
    Then the Customer is taken to the "order_payment" screen
    When the Customer pays for the order: "Order Paid"
    Then the outcome of "@transition:order" holds
