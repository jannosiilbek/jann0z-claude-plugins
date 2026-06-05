Feature: Account money movement

  @transition:select_source_account
  Scenario: Choose the source account
    Given an account holder
    When they pick a source account
    Then the account is selected

  @transition:enter_amount @invariant:INV-Amount-1
  Scenario: Enter the transfer amount
    Given a selected account
    When they enter an amount
    Then the amount is captured

  @transition:confirm_transfer @terminal:transfer_posted
  Scenario: Confirm the transfer
    Given a captured amount
    When they confirm
    Then the transfer is posted

  @policy:double-entry-ledger
  Scenario: Post the ledger entry
    Given a posted transfer
    When the system records it
    Then a double-entry ledger row exists

  @transition:open_dashboard @terminal:balance_shown
  Scenario: View the account balance
    Given an account holder
    When they open the dashboard
    Then the balance is shown

  @authz:account
  Scenario: A teller may not confirm another holder's transfer
    Given a captured amount
    When a teller attempts to confirm
    Then the confirmation attempt is rejected
