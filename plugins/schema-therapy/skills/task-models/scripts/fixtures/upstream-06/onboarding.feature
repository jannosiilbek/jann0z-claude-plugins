Feature: Customer onboarding

  @transition:capture_kyc
  Scenario: Capture KYC details
    Given a prospective customer
    When the teller captures KYC details
    Then the details are recorded

  @terminal:account_opened
  Scenario: Open the account
    Given recorded KYC details
    When the teller opens the account
    Then the account is opened
