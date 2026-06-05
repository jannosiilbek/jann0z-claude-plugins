# fingerprints:
#   06-gherkin/order.feature@sha256:1111111111111111111111111111111111111111111111111111111111111111
#   09-ui-flows/dispatcher.xml@sha256:4444444444444444444444444444444444444444444444444444444444444444
#   08-task-models/dispatcher-cancel_order.xml@sha256:6666666666666666666666666666666666666666666666666666666666666666
@task-model:dispatcher-cancel_order
Feature: Cancel order

  The Dispatcher cancels an order from the detail screen, binding the
  cancellation outcome to the 06 scenario it realizes by tag.

  Scenario: The Dispatcher cancels an order
    Given the Dispatcher is on the "order_queue" screen
    When the Dispatcher triggers the "open_order" event
    Then the Dispatcher is taken to the "order_detail" screen
    When the Dispatcher cancels the order: "Order Cancelled"
    Then the outcome of "@transition:order_cancelled" holds
    And the Dispatcher is taken to the "order_queue" screen
