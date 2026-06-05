# fingerprints:
#   06-gherkin/venue.feature@sha256:1ebde44d9d10a50acf967e37a2de75db019d5ce7bb003e82637406505f5e21ff
#   09-ui-flows/organizer.xml@sha256:b0233ce55bbc111717f1cc476ec17307fb54c2999f31268c0e909a938a69f659
#   08-task-models/organizer-register_venue.xml@sha256:a44aa5b1fe9ac3d3da58998e57dbbaa42ef81548941e4e47462238c8cf10931a
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
