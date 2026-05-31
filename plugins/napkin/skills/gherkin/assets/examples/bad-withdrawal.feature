Feature: test withdrawal stuff

  Background:
    Given the user opens the browser
    And the user navigates to https://bank.example.com/login
    And the user types "user@example.com" into the email field
    And the user clicks the login button

  Scenario: test 1
    When the user withdraws money and checks the balance and logs out
    Then it works
