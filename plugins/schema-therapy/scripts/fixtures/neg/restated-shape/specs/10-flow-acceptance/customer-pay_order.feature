# fingerprints:
#   06-gherkin/order.feature@sha256:52e9d7ad7ef384504624927026eae55c182cc40ac75c7d49cf0644b290b1a359
#   09-ui-flows/customer.xml@sha256:4e30a591c552e376988677535188fa16f28b9d7beb16b25f287a666f2492e0b8
#   08-task-models/customer-pay_order.xml@sha256:a41def9a8d80bc7b2a027cc662ef01933f7ddd99ae6e5f90a900546cbaf15f7b
@task-model:customer-pay_order
Feature: Pay order

  The Customer walks the flow screen by screen, with each domain outcome bound
  to the 06 scenario it realizes by tag.

  Scenario: The Customer pay order end to end
    Given the Customer is on the "order_payment" screen
    When the Customer pays the order: "Order Paid"
    Then the outcome of "@transition:order" holds
