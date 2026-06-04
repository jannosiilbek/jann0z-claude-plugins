<!-- fingerprints:
00-impact-map.md@sha256:19cb3b0df3509d11459f875d98cc66c03512bf87f42ecd568e8f5cb0e181053f
01-event-storming.md@sha256:b05ab2b431fff12277e5a0b98fb6784b60de80b4630745ac2efb5f55b7fa2576
-->

## Upstream Fingerprints

- 00-impact-map.md@sha256:19cb3b0df3509d11459f875d98cc66c03512bf87f42ecd568e8f5cb0e181053f (captured 2026-06-04)
- 01-event-storming.md@sha256:b05ab2b431fff12277e5a0b98fb6784b60de80b4630745ac2efb5f55b7fa2576 (captured 2026-06-04)

### Dispatcher

**Business actor:** Dispatcher

**Goals:**

- Keep every job moving so nothing stalls in the queue [impact: Dispatch jobs faster]

**Jobs-to-be-done:**

| Job | Trigger | Outcome |
|-----|---------|---------|
| dispatch job | Allocate Job command | Job Dispatched |
