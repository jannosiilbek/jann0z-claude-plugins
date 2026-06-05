# fingerprints:
#   06-gherkin/ticket.feature@sha256:8a8fb5b2bf1240708b1561c4bacfaff1ed6e9681106914974cab002dd984ac44
#   09-ui-flows/gateagent.xml@sha256:6fe8bcaad186c658d4fda82143bb2b6d4baa450a56748699b3aa82eaa71b6a72
#   08-task-models/gateagent-admit_ticket.xml@sha256:c3d8258b807beaefe6f3450584155af8d95ccbece8378209531aeab89bfe4a7a
@task-model:gateagent-admit_ticket
Feature: Admit ticket

  The GateAgent admits a ticket at the gate scanner, with the domain outcome
  bound to the 06 scenario it realizes by tag.

  Scenario: The GateAgent admits a ticket end to end
    Given the GateAgent is on the "gate_scanner" screen
    When the GateAgent triggers the "scan_ticket" event
    Then the outcome of "@invariant:INV-Ticket-2" holds
