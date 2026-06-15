---
id: "01"
title: B2B feedback inbox (greenfield SaaS)
sizing: full
seed: none
---
We're building a small B2B SaaS called "Loop" — a shared feedback inbox for product teams.

Customers are organizations; each organization has members (owner, admin, agent roles). End
users of our customers' products submit feedback items (bug, idea, question), which land in the
organization's inbox. Agents triage a feedback item: assign it to a member, set a status
(new → triaged → planned → shipped → declined), and attach it to a "release" the team is
working toward. Members can comment on a feedback item. Each feedback item belongs to exactly
one organization and may be linked to at most one release. A release belongs to one
organization and has a target date and a status (planned, shipping, shipped).

We need to track who submitted each feedback item (an end user identified by email, not a
member), and the full status history of each item. Billing is out of scope (handled by Stripe
externally). The backend is Postgres. Build the full spec.
