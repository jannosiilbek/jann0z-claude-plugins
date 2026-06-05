# fingerprints:
#   06-gherkin/event.feature@sha256:f3276485fa4fe05bec1199e3e58d81d89cecb1abb17a0521d9a8cfea0d05663c
#   09-ui-flows/organizer.xml@sha256:b0233ce55bbc111717f1cc476ec17307fb54c2999f31268c0e909a938a69f659
#   08-task-models/organizer-open_event.xml@sha256:8d765354e4d0681cdf4ab4eebccb2adabb2f2039eedb1edc7f542a7b72dcfc72
@task-model:organizer-open_event
Feature: Open event

  The Organizer creates an event from the dashboard, screen by screen, with the
  domain outcome bound to the 06 scenario it realizes by tag.

  Scenario: The Organizer opens an event end to end
    Given the Organizer is on the "organizer_dashboard" screen
    When the Organizer triggers the "new_event" event
    Then the Organizer is taken to the "event_create" screen
    When the Organizer enters the event details: "Event Created"
    Then the outcome of "@invariant:INV-Event-1" holds
