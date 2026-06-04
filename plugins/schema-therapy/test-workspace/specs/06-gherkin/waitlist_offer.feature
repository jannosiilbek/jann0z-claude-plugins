# fingerprints:
#   02-glossary.md@sha256:2c472777ffccf7a0275c19adec734cd7f050329d2f6c8197fc48c5a3bb6cab37
#   03-aggregates.md@sha256:a3966e66c0fe18e86756d918a98a0c62238db6742ac7477125d8a8da94755221
#   04-erd.dbml@sha256:1888517e6784c5dac865caa27e3708581c690651d7f8873895fef50835f8d255
#   04-transitions.md@sha256:b3b491ac88780cba10c83df5f5f799f6bd339dba46a1124433fab1115169165d
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
