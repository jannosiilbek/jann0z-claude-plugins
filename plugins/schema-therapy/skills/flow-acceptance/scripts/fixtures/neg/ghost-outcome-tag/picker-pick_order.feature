# fingerprints:
#   06-gherkin/shipment.feature@sha256:3333333333333333333333333333333333333333333333333333333333333333
#   09-ui-flows/picker.xml@sha256:7777777777777777777777777777777777777777777777777777777777777777
#   08-task-models/picker-pick_order.xml@sha256:8888888888888888888888888888888888888888888888888888888888888888
@task-model:picker-pick_order
Feature: Pick order

  The Picker works a shipment from the pick queue through to completion, screen
  by screen, binding each outcome to the 06 scenario it realizes by tag.

  Scenario: The Picker picks a shipment end to end
    Given the Picker is on the "pick_queue" screen
    When the Picker triggers the "open_shipment" event
    Then the Picker is taken to the "shipment_detail" screen
    When the Picker picks the shipment: "Shipment Picked"
    Then the outcome of "@transition:shipment" holds
    And the Picker is taken to the "shipment_complete" screen
    When the Picker completes the shipment: "Shipment Completed"
    Then the outcome of "@terminal:shipment" holds
    And the Picker is taken to the "pick_queue" screen
