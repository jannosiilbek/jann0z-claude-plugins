# fingerprints:
#   06-gherkin/event.feature@sha256:5e4e77c98b1eb4b675e71e42b41b43381780c2f06d91c48f7933b0164a764574
#   09-ui-flows/organizer.xml@sha256:766030af6729a6b04e9645a9bfc78de756df3e070357fdae6f978da48bf82b2a
#   08-task-models/organizer-open_event.xml@sha256:d328f56016c28e51c210d0d72f5c09dea8868a7b08e8c55973e2591adfdd660d
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
