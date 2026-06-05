@task-model:dispatcher-fulfil_order
Feature: Fulfil order

  The Dispatcher works an order from the queue through to dispatch.

  Scenario: The Dispatcher fulfils an order end to end
    Given the Dispatcher is on the "order_queue" screen
    When the Dispatcher triggers the "open_order" event
    Then the Dispatcher is taken to the "order_detail" screen
    When the Dispatcher starts picking the order: "Picking Started"
    Then the outcome of "@transition:order" holds
    And the Dispatcher is taken to the "pick_confirm" screen
    When the Dispatcher dispatches the order: "Order Dispatched"
    Then the outcome of "@terminal:order" holds
    And the Dispatcher is taken to the "order_queue" screen
