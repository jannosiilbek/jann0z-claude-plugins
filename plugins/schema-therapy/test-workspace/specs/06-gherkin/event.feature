# fingerprints:
#   02-glossary.md@sha256:2c472777ffccf7a0275c19adec734cd7f050329d2f6c8197fc48c5a3bb6cab37
#   03-aggregates.md@sha256:a3966e66c0fe18e86756d918a98a0c62238db6742ac7477125d8a8da94755221
#   04-erd.dbml@sha256:1888517e6784c5dac865caa27e3708581c690651d7f8873895fef50835f8d255
#   04-transitions.md@sha256:b3b491ac88780cba10c83df5f5f799f6bd339dba46a1124433fab1115169165d
#   05-statecharts/event.scxml@sha256:d6b12fdec744135f6355c75199038257074d1a2d7da94b88a41dc900309f4fe3
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
