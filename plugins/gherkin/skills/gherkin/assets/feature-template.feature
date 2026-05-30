# Outcome: <the capability/value this feature delivers, one line>
# In-scope: <what this feature covers>
# Out-of-scope: <what it deliberately does NOT cover — stops scope creep>
# Prior decisions: <architecture/UX choices already made — don't re-decide>
# Acceptance criteria: <what "done" means>
# Depends on: <../<capability>/<primary>.feature — the depended-on capability's Primary feature file from capability-map.md; omit if none>
@capability:<kebab>
Feature: <Capability name>

  In order to <value>
  As a <role>
  I want <capability>

  Scenario: <Outcome-focused title distinguishing this scenario from its siblings>
    Given <pre-existing state>
    When <the single triggering event>
    Then <an observable, checkable outcome>
