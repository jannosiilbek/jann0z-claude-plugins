# fingerprints:
#   02-glossary.md@sha256:2c472777ffccf7a0275c19adec734cd7f050329d2f6c8197fc48c5a3bb6cab37
#   03-aggregates.md@sha256:a3966e66c0fe18e86756d918a98a0c62238db6742ac7477125d8a8da94755221
#   04-erd.dbml@sha256:1888517e6784c5dac865caa27e3708581c690651d7f8873895fef50835f8d255
#   04-transitions.md@sha256:b3b491ac88780cba10c83df5f5f799f6bd339dba46a1124433fab1115169165d
#   05-statecharts/ticket.scxml@sha256:befc87daa120f5631c8bfaa5d8ca158c2613cf68f7bdcb31f7eb8d055ff2762e
Feature: Ticket

  @transition:ticket
  Scenario: A reserved Ticket whose Order settles moves to sold
    Given a Ticket in status reserved
    When the Ticket Sold event occurs
    Then the Ticket is in status sold

  @transition:ticket
  Scenario: A reserved Ticket whose hold lapses moves to released
    Given a Ticket in status reserved
    When the Ticket Released event occurs
    Then the Ticket is in status released

  @transition:ticket
  Scenario: A sold Ticket given up by its holder moves to cancelled
    Given a Ticket in status sold
    When the Ticket Cancelled event occurs
    Then the Ticket is in status cancelled

  @transition:ticket
  Scenario: A sold Ticket reissued to its holder moves to reissued
    Given a Ticket in status sold
    When the Ticket Reissued event occurs
    Then the Ticket is in status reissued

  @transition:ticket
  Scenario: A sold Ticket whose holder is alerted moves to holder_notified
    Given a Ticket in status sold
    When the Ticket Holder Notified event occurs
    Then the Ticket is in status holder_notified

  @transition:ticket
  Scenario: A sold Ticket presented at the door moves to admitted
    Given a Ticket in status sold
    When the Ticket Admitted event occurs
    Then the Ticket is in status admitted

  @terminal:ticket
  Scenario: A released Ticket admits no further lifecycle change
    Given a Ticket in status released
    When the Ticket Sold event occurs
    Then the Ticket remains in status released

  @terminal:ticket
  Scenario: A cancelled Ticket admits no further lifecycle change
    Given a Ticket in status cancelled
    When the Ticket Admitted event occurs
    Then the Ticket remains in status cancelled

  @terminal:ticket
  Scenario: A reissued Ticket admits no further lifecycle change
    Given a Ticket in status reissued
    When the Ticket Sold event occurs
    Then the Ticket remains in status reissued

  @terminal:ticket
  Scenario: A holder-alerted Ticket admits no further lifecycle change
    Given a Ticket in status holder_notified
    When the Ticket Admitted event occurs
    Then the Ticket remains in status holder_notified

  @terminal:ticket
  Scenario: An admitted Ticket admits no further lifecycle change
    Given a Ticket in status admitted
    When the Ticket Admitted event occurs
    Then the Ticket remains in status admitted

  @invariant:INV-Ticket-1
  Scenario: Returning a sold Ticket to reserved is rejected
    Given a Ticket in status sold
    When the Ticket Reserved event occurs
    Then the request is rejected

  @invariant:INV-Ticket-2
  Scenario: Admitting a cancelled Ticket is rejected
    Given a Ticket in status cancelled
    When the Ticket Admitted event occurs
    Then the request is rejected

  @invariant:INV-Ticket-3
  Scenario: Reissuing a Ticket without minting a fresh QrCode is rejected
    Given a Ticket in status sold carrying its original QrCode
    When the Ticket Reissued event occurs leaving the prior QrCode valid
    Then the request is rejected

  @policy:POL-4
  Scenario: Giving up a Ticket drives money owed back to its holder
    Given a Ticket in status sold
    When the Ticket Cancelled event occurs
    Then eventually money owed against the cancelled Ticket reaches status requested

  @policy:POL-5
  Scenario: Releasing a Ticket drives a fresh offer of the freed capacity
    Given a Ticket in status sold holding capacity others await
    When the Ticket Released event occurs
    Then eventually a freed-capacity chance reaches status waitlist_offer_made
