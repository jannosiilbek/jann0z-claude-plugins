Feature: Shipment

  @transition:shipment
  Scenario: A shipment is picked
    Given a shipment to pick
    When the shipment is picked
    Then the shipment is picked

  @terminal:shipment
  Scenario: A shipment is completed
    Given a picked shipment
    When the shipment is completed
    Then the shipment is completed
