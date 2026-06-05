# fingerprints:
#   06-gherkin/order.feature@sha256:e656728752b2cd3189c1188bebe5e70ccaf318e6d9b6f45f63028a8602f129e9
#   09-ui-flows/customer.xml@sha256:f218a74ceddd1273d3679ce6ea83890bb304dee9ad41e7558423cc5f0c73a983
#   08-task-models/customer-place_order.xml@sha256:37eb9a1cd98c28707c085f8d287b0378e02d8ff631aee3a162161eb5041bb576
@task-model:customer-place_order
Feature: Place order

  The Customer composes an order from the home screen through to placement,
  screen by screen, with each domain outcome bound to the 06 scenario it
  realizes by tag.

  Scenario: The Customer places an order end to end
    Given the Customer is on the "customer_home" screen
    When the Customer triggers the "start_order" event
    Then the Customer is taken to the "order_compose" screen
    When the Customer triggers the "pick_tickets" event
    Then the outcome of "@invariant:INV-Order-1" holds
    When the Customer submits the order: "Order Placed"
    Then the outcome of "@transition:order" holds
