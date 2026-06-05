Feature: Order

  @transition:order
  Scenario: An order moves into picking
    Given an order in the queue
    When the order starts picking
    Then the order is in picking

  @terminal:order
  Scenario: An order is dispatched
    Given an order in picking
    When the order is dispatched
    Then the order is dispatched to the customer shipping address today

  @transition:order_cancelled
  Scenario: An order is cancelled
    Given an order in the queue
    When the order is cancelled
    Then the order is cancelled
