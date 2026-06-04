# fingerprints:
#   02-glossary.md@sha256:2c472777ffccf7a0275c19adec734cd7f050329d2f6c8197fc48c5a3bb6cab37
#   03-aggregates.md@sha256:a3966e66c0fe18e86756d918a98a0c62238db6742ac7477125d8a8da94755221
#   04-erd.dbml@sha256:1888517e6784c5dac865caa27e3708581c690651d7f8873895fef50835f8d255
#   04-transitions.md@sha256:b3b491ac88780cba10c83df5f5f799f6bd339dba46a1124433fab1115169165d
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
