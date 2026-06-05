# fingerprints:
#   06-gherkin/order.feature@sha256:e12871b7f61aa0375b3df07c24572709183fb55b864fca19856ea0fcb6dc3b2b
#   09-ui-flows/customer.xml@sha256:6db976f512e9f664055c48b1b17bf6acee85e2030a2bcbfd471cd62547d47203
#   08-task-models/customer-buy_ticket.xml@sha256:9357116330d12bf0740d1d1e80b21a5f6d6bbc5581cb309caea1bc29d9c23550
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
