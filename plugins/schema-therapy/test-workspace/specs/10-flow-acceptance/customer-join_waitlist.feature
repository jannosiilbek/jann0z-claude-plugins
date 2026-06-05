# fingerprints:
#   06-gherkin/waitlist_offer.feature@sha256:fa04143f36a9fe01c0cd0a71dbf4e35243dd802bae9ea517a144fa1bba76a99e
#   09-ui-flows/customer.xml@sha256:6db976f512e9f664055c48b1b17bf6acee85e2030a2bcbfd471cd62547d47203
#   08-task-models/customer-join_waitlist.xml@sha256:9814f76cb29f4c8caaef6d4ffd8b0a10ccdf1448600b88ccd0494ccbd653868d
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
