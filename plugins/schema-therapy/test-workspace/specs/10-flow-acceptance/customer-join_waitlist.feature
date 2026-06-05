# fingerprints:
#   06-gherkin/waitlist_offer.feature@sha256:30edef7d2de6705d03290804243c222f09316a43eed36ca99b5e34899b8f0323
#   09-ui-flows/customer.xml@sha256:f218a74ceddd1273d3679ce6ea83890bb304dee9ad41e7558423cc5f0c73a983
#   08-task-models/customer-join_waitlist.xml@sha256:f859a1e01858982e83e8af7c8f08e8fdd3804e6f1be9f0b6cc0fbd699b026c64
@task-model:customer-join_waitlist
Feature: Join waitlist

  The Customer joins a waitlist from the home screen, screen by screen, with
  the domain outcome bound to the 06 scenario it realizes by tag.

  Scenario: The Customer joins a waitlist end to end
    Given the Customer is on the "customer_home" screen
    When the Customer triggers the "open_waitlist" event
    Then the Customer is taken to the "waitlist_join" screen
    When the Customer joins the waitlist: "Waitlist Joined"
    Then the outcome of "@invariant:INV-WaitlistOffer-2" holds
