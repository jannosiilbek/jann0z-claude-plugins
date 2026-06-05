# fingerprints:
#   01-event-storming.md@sha256:8808edde01f35a1a3d5d6a4aba10133d725920d68c42d432c6d5bbc5d872ddd4
#   02-glossary.md@sha256:5f13227739cd2a3444b73a7c531d1d4de611054b81ba40bda62c1e6966ed4fca
#   03-aggregates.md@sha256:ac07c8635123654f57f21235d857ab809782c2e0b9f3fbf0938fb8a51fb398d4
#   04-erd.dbml@sha256:3e8dfce8ca142390d7b5efcc820ef5bf4dcb1605be000834df1178d830cde622
#   04-transitions.md@sha256:b3953d456bbc9d5d5615d1110ac5fd2d052826a33a444fae2250ea1b78ee2759
#   05-statecharts/event.scxml@sha256:63e1a110e20cf1b45d8241ec7b5a2057cd68a0b452db061d581832808a1be8b6
Feature: Event

  @transition:event
  Scenario: Scheduling a created Event advances it to scheduled
    Given an Event in status created
    When the Event Scheduled event occurs
    Then the Event is in status scheduled

  @transition:event
  Scenario: Rescheduling a scheduled Event moves it to rescheduled
    Given an Event in status scheduled
    When the Event Rescheduled event occurs
    Then the Event is in status rescheduled

  @transition:event
  Scenario: A scheduled Event reaching its limit moves to sellout_reached
    Given an Event in status scheduled
    When the Event Sellout Reached event occurs
    Then the Event is in status sellout_reached

  @transition:event
  Scenario: Calling off a scheduled Event moves it to cancelled
    Given an Event in status scheduled
    When the Event Cancelled event occurs
    Then the Event is in status cancelled

  @transition:event
  Scenario: A rescheduled Event reaching its limit moves to sellout_reached
    Given an Event in status rescheduled
    When the Event Sellout Reached event occurs
    Then the Event is in status sellout_reached

  @transition:event
  Scenario: Calling off a rescheduled Event moves it to cancelled
    Given an Event in status rescheduled
    When the Event Cancelled event occurs
    Then the Event is in status cancelled

  @transition:event
  Scenario: Calling off a sold-out Event moves it to cancelled
    Given an Event in status sellout_reached
    When the Event Cancelled event occurs
    Then the Event is in status cancelled

  @terminal:event
  Scenario: A cancelled Event admits no further lifecycle change
    Given an Event in status cancelled
    When the Event Rescheduled event occurs
    Then the Event remains in status cancelled

  @invariant:INV-Event-1
  Scenario: Scheduling an Event without assigned EventDates is rejected
    Given an Event in status created without assigned EventDates
    When the Event Scheduled event occurs
    Then the request is rejected

  @invariant:INV-Event-2
  Scenario: Returning a cancelled Event to scheduled is rejected
    Given an Event in status cancelled
    When the Event Scheduled event occurs
    Then the request is rejected

  @invariant:INV-Event-3
  Scenario: Reaching sellout_reached from created is rejected
    Given an Event in status created
    When the Event Sellout Reached event occurs
    Then the request is rejected

  @policy:POL-3
  Scenario: Calling off an Event drives money owed back to each holder
    Given an Event in status scheduled holding sold Ticket admissions
    When the Event Cancelled event occurs
    Then eventually money owed against each sold Ticket reaches status requested

  @policy:POL-6
  Scenario: Moving an Event drives notification of each affected holder
    Given an Event in status scheduled holding sold Ticket admissions
    When the Event Rescheduled event occurs
    Then eventually each affected Ticket reaches status holder_notified

  @authz:event
  Scenario: A Customer may not schedule a created Event
    Given an Event in status created
    When the Customer attempts the Event Scheduled event
    Then the request is rejected

  @authz:event
  Scenario: A Gate Agent may not reschedule a scheduled Event
    Given an Event in status scheduled
    When the Gate Agent attempts the Event Rescheduled event
    Then the request is rejected

  @authz:event
  Scenario: A Finance Officer may not cancel a scheduled Event
    Given an Event in status scheduled
    When the Finance Officer attempts the Event Cancelled event
    Then the request is rejected
