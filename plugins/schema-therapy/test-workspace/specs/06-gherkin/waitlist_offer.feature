# fingerprints:
#   02-glossary.md@sha256:5f13227739cd2a3444b73a7c531d1d4de611054b81ba40bda62c1e6966ed4fca
#   03-aggregates.md@sha256:ac07c8635123654f57f21235d857ab809782c2e0b9f3fbf0938fb8a51fb398d4
#   04-erd.dbml@sha256:3e8dfce8ca142390d7b5efcc820ef5bf4dcb1605be000834df1178d830cde622
#   04-transitions.md@sha256:b3953d456bbc9d5d5615d1110ac5fd2d052826a33a444fae2250ea1b78ee2759
Feature: WaitlistOffer

  @transition:waitlist_offer
  Scenario: Extending a turn to a waiting patron moves the offer to waitlist_offer_made
    Given a WaitlistOffer in status waitlist_joined
    When the Waitlist Offer Made event occurs
    Then the WaitlistOffer is in status waitlist_offer_made

  @transition:waitlist_offer
  Scenario: A standing offer past its window moves to waitlist_offer_expired
    Given a WaitlistOffer in status waitlist_offer_made
    When the Waitlist Offer Expired event occurs
    Then the WaitlistOffer is in status waitlist_offer_expired

  @terminal:waitlist_offer
  Scenario: A lapsed offer admits no further lifecycle change
    Given a WaitlistOffer in status waitlist_offer_expired
    When the Waitlist Offer Made event occurs
    Then the WaitlistOffer remains in status waitlist_offer_expired

  @invariant:INV-WaitlistOffer-1
  Scenario: A standing offer left past its window without lapsing is rejected
    Given a WaitlistOffer in status waitlist_offer_made past its 24-hour window
    When the window is reconciled
    Then the request is rejected

  @invariant:INV-WaitlistOffer-2
  Scenario: Extending an offer to a patron who never joined the queue is rejected
    Given a patron who never reached status waitlist_joined
    When the Waitlist Offer Made event occurs
    Then the request is rejected
