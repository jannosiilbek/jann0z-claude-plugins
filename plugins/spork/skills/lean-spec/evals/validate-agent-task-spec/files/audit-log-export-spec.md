# Audit log export

Reader: coding agent implementing this in the admin service.

## Goal

Workspace admins can download their workspace's audit log as CSV from the admin console, so they can hand it to auditors without asking support.

## Behaviour

- New endpoint `GET /admin/audit-log/export?from=YYYY-MM-DD&to=YYYY-MM-DD` returns `text/csv`.
- Columns, in order: `timestamp` (ISO 8601, UTC), `actor_email`, `action`, `target`, `ip`.
- Only workspace admins may call it; others get `403`.
- The range may span at most 90 days; a longer range gets `400` with code `range_too_long`.
- Rows are sorted by `timestamp`, oldest first.
- Reuse the existing audit log query in `src/audit/query.ts`; refactor it as needed.

## Notes

- Follow best practices and write clean, well-tested code.
- Make sure the export is secure.

## Open questions

- Should events by deleted users show their email or "deleted user"? TBD.
