# fingerprints:
#   06-gherkin/venue.feature@sha256:6575b40b1e30af2a1d4100373d39f411ee8a4f815b24453a9cfdd8fd0ab2da87
#   09-ui-flows/organizer.xml@sha256:766030af6729a6b04e9645a9bfc78de756df3e070357fdae6f978da48bf82b2a
#   08-task-models/organizer-define_seating.xml@sha256:25abc9ddcccec7081b8956cca6f5d55df89984b60f6ab05654fccf5f8bd1912a
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
