# fingerprints:
#   06-gherkin/order.feature@sha256:e12871b7f61aa0375b3df07c24572709183fb55b864fca19856ea0fcb6dc3b2b
#   09-ui-flows/customer.xml@sha256:6db976f512e9f664055c48b1b17bf6acee85e2030a2bcbfd471cd62547d47203
#   08-task-models/customer-place_order.xml@sha256:6dd4d2bc9723865355b0ab151ece4488b6a0ca231e8bb6c10a53f16fe9f13d93
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
