<!-- fingerprints:
00-impact-map.md@sha256:1111111111111111111111111111111111111111111111111111111111111111
01-event-storming.md@sha256:2222222222222222222222222222222222222222222222222222222222222222
-->

## Personas

### AccountHolder

**Business actor:** AccountHolder

**Goals:**

- Move money without friction [impact: Reduce transfer time]

**Jobs-to-be-done:**

| Job | Trigger | Outcome |
|-----|---------|---------|
| transfer_funds | wants to move money | Transfer Posted |
| view_balance | opens the app | Balance Shown |

### Teller

**Business actor:** Teller

**Goals:**

- Onboard a customer at the branch [impact: Faster onboarding]

**Jobs-to-be-done:**

| Job | Trigger | Outcome |
|-----|---------|---------|
| open_account | a customer requests an account | Account Opened |
