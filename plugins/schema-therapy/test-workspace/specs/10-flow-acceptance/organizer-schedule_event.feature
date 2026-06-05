# fingerprints:
#   06-gherkin/event.feature@sha256:5e4e77c98b1eb4b675e71e42b41b43381780c2f06d91c48f7933b0164a764574
#   09-ui-flows/organizer.xml@sha256:766030af6729a6b04e9645a9bfc78de756df3e070357fdae6f978da48bf82b2a
#   08-task-models/organizer-schedule_event.xml@sha256:a4e00f617aa2e62478bb597d53c583c4bdb4fb77d00497000ec88569470c917f
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
