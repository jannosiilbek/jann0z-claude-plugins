# fingerprints:
#   06-gherkin/ticket.feature@sha256:3fcf82c1527f843f5c0018422c8263b4709029184db2513c8b235561c13c3099
#   09-ui-flows/gateagent.xml@sha256:a658d778c3c5e884a248a8d7ac178dd6481d77375e12ab177289d269c81adaa4
#   08-task-models/gateagent-admit_ticket.xml@sha256:487975cb4d915b9e0af80263663eb0ddc0117a230469da3faf8679e909346076
@task-model:gateagent-admit_ticket
Feature: Admit ticket

  The GateAgent admits a ticket at the gate scanner, with the domain outcome
  bound to the 06 scenario it realizes by tag.

  Scenario: The GateAgent admits a ticket end to end
    Given the GateAgent is on the "gate_scanner" screen
    When the GateAgent triggers the "scan_ticket" event
    Then the outcome of "@invariant:INV-Ticket-2" holds
