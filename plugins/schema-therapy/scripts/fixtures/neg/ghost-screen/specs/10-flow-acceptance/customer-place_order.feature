# fingerprints:
#   06-gherkin/order.feature@sha256:52e9d7ad7ef384504624927026eae55c182cc40ac75c7d49cf0644b290b1a359
#   09-ui-flows/customer.xml@sha256:4e30a591c552e376988677535188fa16f28b9d7beb16b25f287a666f2492e0b8
#   08-task-models/customer-place_order.xml@sha256:f1fdc7866bef8584f2ded1c75ae32b92c6e951c2b079885065a44d15741a1d26
@task-model:customer-place_order
Feature: Place order

  The Customer walks the flow screen by screen, with each domain outcome bound
  to the 06 scenario it realizes by tag.

  Scenario: The Customer place order end to end
    Given the Customer is on the "ghost_screen" screen
    When the Customer triggers the "pick_tickets" event
    Then the outcome of "@invariant:INV-Order-1" holds
    When the Customer submits the order: "Order Placed"
    Then the outcome of "@transition:order" holds
