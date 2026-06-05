# fingerprints:
#   01-event-storming.md@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
#   02-glossary.md@sha256:1111111111111111111111111111111111111111111111111111111111111111
#   03-aggregates.md@sha256:2222222222222222222222222222222222222222222222222222222222222222
#   04-erd.dbml@sha256:3333333333333333333333333333333333333333333333333333333333333333
#   04-transitions.md@sha256:4444444444444444444444444444444444444444444444444444444444444444
Feature: Coupon

  @invariant:INV-Coupon-1
  Scenario: A redeemed coupon refuses a further redemption attempt
    Given the coupon is redeemed
    When the Coupon Redeemed event occurs again
    Then the redemption attempt is rejected

  @transition:coupon
  Scenario: Redeeming an issued coupon advances it to redeemed
    Given the coupon is issued
    When the Coupon Redeemed event occurs
    Then the coupon is redeemed

  @transition:coupon
  Scenario: Expiring an issued coupon advances it to expired
    Given the coupon is issued
    When the Coupon Expired event occurs
    Then the coupon is expired

  @transition:coupon
  Scenario: Clearing an issued coupon advances it to cleared
    Given the coupon is issued
    When the Coupon Section Cleared event occurs
    Then the coupon is cleared

  @terminal:coupon
  Scenario: A redeemed coupon admits no further event
    Given the coupon is redeemed
    When the Coupon Expired event occurs again
    Then the coupon remains redeemed

  @terminal:coupon
  Scenario: An expired coupon admits no further event
    Given the coupon is expired
    When the Coupon Redeemed event occurs again
    Then the coupon remains expired

  @terminal:coupon
  Scenario: A cleared coupon admits no further event
    Given the coupon is cleared
    When the Coupon Redeemed event occurs again
    Then the coupon remains cleared
