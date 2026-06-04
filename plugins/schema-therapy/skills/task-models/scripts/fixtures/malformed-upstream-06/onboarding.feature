Feature: Customer onboarding (unscannable — no Scenario keyword anywhere)

  This feature file carries NO `Scenario:` / `Scenario Outline:` keyword, so the
  tag-scanner cannot anchor a tag set from it. The harness must report broken-test
  (simulation.md §9 case 3 — 06 unscannable).

  @transition:capture_kyc
  Some narrative that is not a scenario.
