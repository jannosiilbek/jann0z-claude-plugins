# fingerprints:
#   06-gherkin/order.feature@sha256:5d39d5142f5ded8a71a5bf6f9f6f90059bbe0e64dd3a2421a042ffe7c7e07502
#   09-ui-flows/customer.xml@sha256:cc9b50b8f07662d2a1715e051c6f5b280a9d722f9c00ec0272b65160177311e1
#   08-task-models/customer-place_order.xml@sha256:75b638d45fe12de946d1337373c154f72e0202fc5f2618a074476d0d1b2afe76
@task-model:customer-place_order
Feature: Place order

  The Customer walks the flow screen by screen, with each domain outcome bound
  to the 06 scenario it realizes by tag.

  Scenario: The Customer place order end to end
    Given the Customer is on the "order_compose" screen
    When the Customer triggers the "pick_tickets" event
    Then the outcome of "@invariant:INV-Order-1" holds
    When the Customer submits the order: "Order Placed"
    Then the outcome of "@transition:ghost" holds
