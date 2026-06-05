# fingerprints:
#   01-event-storming.md@sha256:8808edde01f35a1a3d5d6a4aba10133d725920d68c42d432c6d5bbc5d872ddd4
#   02-glossary.md@sha256:5f13227739cd2a3444b73a7c531d1d4de611054b81ba40bda62c1e6966ed4fca
#   03-aggregates.md@sha256:ac07c8635123654f57f21235d857ab809782c2e0b9f3fbf0938fb8a51fb398d4
#   04-erd.dbml@sha256:3e8dfce8ca142390d7b5efcc820ef5bf4dcb1605be000834df1178d830cde622
#   04-transitions.md@sha256:b3953d456bbc9d5d5615d1110ac5fd2d052826a33a444fae2250ea1b78ee2759
#   05-statecharts/ticket.scxml@sha256:04261089844499a10976ad65b7c44cf5fb1d4a645f73f8ed7db4ea831427fb1a
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

  @authz:ticket
  Scenario: A Gate Agent may not sell a reserved Ticket
    Given a Ticket in status reserved
    When the Gate Agent attempts the Ticket Sold event
    Then the request is rejected

  @authz:ticket
  Scenario: An Organizer may not cancel a sold Ticket
    Given a Ticket in status sold
    When the Organizer attempts the Ticket Cancelled event
    Then the request is rejected

  @authz:ticket
  Scenario: A Customer may not admit a sold Ticket
    Given a Ticket in status sold
    When the Customer attempts the Ticket Admitted event
    Then the request is rejected
