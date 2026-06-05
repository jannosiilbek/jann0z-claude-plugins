# fingerprints:
#   06-gherkin/order.feature@sha256:5d39d5142f5ded8a71a5bf6f9f6f90059bbe0e64dd3a2421a042ffe7c7e07502
#   09-ui-flows/customer.xml@sha256:cc9b50b8f07662d2a1715e051c6f5b280a9d722f9c00ec0272b65160177311e1
#   08-task-models/customer-pay_order.xml@sha256:7e4ae1cc5a6db95bc819c37dee364f2c349cda5fa3726dbd282906fe2a25dd0c
@task-model:customer-pay_order
Feature: Pay order

  The Customer walks the flow screen by screen, with each domain outcome bound
  to the 06 scenario it realizes by tag.

  Scenario: The Customer pay order end to end
    Given the Customer is on the "order_payment" screen
    When the Customer pays the order: "Order Paid"
    Then the outcome of "@transition:order" holds
