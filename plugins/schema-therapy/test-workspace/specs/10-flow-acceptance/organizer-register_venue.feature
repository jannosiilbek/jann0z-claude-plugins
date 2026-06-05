# fingerprints:
#   06-gherkin/venue.feature@sha256:6575b40b1e30af2a1d4100373d39f411ee8a4f815b24453a9cfdd8fd0ab2da87
#   09-ui-flows/organizer.xml@sha256:766030af6729a6b04e9645a9bfc78de756df3e070357fdae6f978da48bf82b2a
#   08-task-models/organizer-register_venue.xml@sha256:6ea0a3385d205c803ee735fdb24276343bc05f2226b539de8a6d995ba0eafd00
@task-model:organizer-register_venue
Feature: Register venue

  The Organizer registers a venue from the dashboard, screen by screen, with the
  domain outcome bound to the 06 scenario it realizes by tag.

  Scenario: The Organizer registers a venue end to end
    Given the Organizer is on the "organizer_dashboard" screen
    When the Organizer triggers the "new_venue" event
    Then the Organizer is taken to the "venue_create" screen
    When the Organizer enters the venue details: "Venue Registered"
    Then the outcome of "@invariant:INV-Venue-1" holds
