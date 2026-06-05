# fingerprints:
#   06-gherkin/event.feature@sha256:f3276485fa4fe05bec1199e3e58d81d89cecb1abb17a0521d9a8cfea0d05663c
#   09-ui-flows/organizer.xml@sha256:b0233ce55bbc111717f1cc476ec17307fb54c2999f31268c0e909a938a69f659
#   08-task-models/organizer-schedule_event.xml@sha256:9d0982a98122928dd343413d7fb1d0f08ff6c09df73a7eb70a01133e1ff78cb8
@task-model:organizer-schedule_event
Feature: Schedule event

  The Organizer schedules an event from the dashboard, screen by screen, with
  each domain outcome bound to the 06 scenario it realizes by tag.

  Scenario: The Organizer schedules an event end to end
    Given the Organizer is on the "organizer_dashboard" screen
    When the Organizer triggers the "open_schedule" event
    Then the Organizer is taken to the "event_schedule" screen
    When the Organizer triggers the "set_dates" event
    Then the outcome of "@invariant:INV-Event-1" holds
    When the Organizer confirms the schedule: "Event Scheduled"
    Then the outcome of "@transition:event" holds
