# fingerprints:
#   06-gherkin/venue.feature@sha256:1ebde44d9d10a50acf967e37a2de75db019d5ce7bb003e82637406505f5e21ff
#   09-ui-flows/organizer.xml@sha256:b0233ce55bbc111717f1cc476ec17307fb54c2999f31268c0e909a938a69f659
#   08-task-models/organizer-define_seating.xml@sha256:58fa68ead38d82b5bdaf9b3c047e5783eb08958d8cc2e53ff02b26cdb61b51fb
@task-model:organizer-define_seating
Feature: Define seating

  The Organizer defines a seating section from the dashboard, screen by screen,
  with each domain outcome bound to the 06 scenario it realizes by tag.

  Scenario: The Organizer defines seating end to end
    Given the Organizer is on the "organizer_dashboard" screen
    When the Organizer triggers the "open_seating" event
    Then the Organizer is taken to the "seating_layout" screen
    When the Organizer triggers the "set_capacity" event
    Then the outcome of "@invariant:INV-Venue-2" holds
    When the Organizer confirms the section: "Seating Section Defined"
    Then the outcome of "@transition:venue" holds
    And the outcome of "@terminal:venue" holds
