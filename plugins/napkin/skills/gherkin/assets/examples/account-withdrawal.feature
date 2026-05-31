# Outcome: An account holder can withdraw cash from their account
# In-scope: Cash withdrawal against the available balance, including the boundary at exactly the balance and refusal when funds are insufficient
# Out-of-scope: Authentication, daily withdrawal limits, ATM cash-availability, currency conversion, overdraft facilities
# Prior decisions: Withdrawals settle synchronously in EUR; no overdraft is permitted; the balance is the sole eligibility check in this feature
# Acceptance criteria: A withdrawal within the balance dispenses cash and debits the account; a withdrawal exactly equal to the balance succeeds and leaves a zero balance; a withdrawal above the balance is refused and leaves the balance unchanged
@capability:account-withdrawal @REQ-1024
Feature: Account withdrawal

  In order to access my money
  As an account holder
  I want to withdraw cash from my account

  Scenario: Withdrawal within the balance dispenses cash and debits the account
    Given an account with a balance of 100 EUR
    When the account holder withdraws 40 EUR
    Then the withdrawal succeeds
    And 40 EUR is dispensed
    And the balance is 60 EUR

  Scenario: Withdrawal of exactly the balance succeeds and leaves a zero balance
    Given an account with a balance of 100 EUR
    When the account holder withdraws 100 EUR
    Then the withdrawal succeeds
    And 100 EUR is dispensed
    And the balance is 0 EUR

  Scenario: Withdrawal is refused when the balance is insufficient
    Given an account with a balance of 50 EUR
    When the account holder withdraws 100 EUR
    Then the withdrawal is refused
    And no cash is dispensed
    And the balance remains 50 EUR
