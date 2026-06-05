# fingerprints:
#   02-glossary.md@sha256:5f13227739cd2a3444b73a7c531d1d4de611054b81ba40bda62c1e6966ed4fca
#   03-aggregates.md@sha256:ac07c8635123654f57f21235d857ab809782c2e0b9f3fbf0938fb8a51fb398d4
#   04-erd.dbml@sha256:3e8dfce8ca142390d7b5efcc820ef5bf4dcb1605be000834df1178d830cde622
#   04-transitions.md@sha256:b3953d456bbc9d5d5615d1110ac5fd2d052826a33a444fae2250ea1b78ee2759
Feature: Venue

  @transition:venue
  Scenario: Partitioning a registered Venue records its seating layout
    Given a Venue in status registered
    When the Seating Section Defined event occurs
    Then the Venue is in status seating_section_defined

  @terminal:venue
  Scenario: A fully partitioned Venue admits no further lifecycle change
    Given a Venue in status seating_section_defined
    When the Seating Section Defined event occurs
    Then the Venue remains in status seating_section_defined

  @invariant:INV-Venue-1
  Scenario: Registering a Venue carrying no SeatingSection is rejected
    Given a Venue in status registered carrying no SeatingSection
    When the layout is confirmed
    Then the request is rejected

  @invariant:INV-Venue-2
  Scenario: Defining a SeatingSection whose Capacity is below one is rejected
    Given a Venue in status registered
    When the Seating Section Defined event occurs with a Capacity of zero
    Then the request is rejected
