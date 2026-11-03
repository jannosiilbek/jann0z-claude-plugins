# Design: Move product search from Elasticsearch 7 to OpenSearch 2

Reader: backend engineers and the on-call team. Purpose: approve the migration approach.

## Why

ES 7 is out of vendor support in Q1 and our managed provider is removing it. OpenSearch 2 is the supported path on the same provider and keeps the query DSL we use, except for two features (below).

## Approach

1. Create the OpenSearch cluster with the current mappings.
2. Dual-write: the indexer writes every product change to both clusters. Reads stay on ES.
3. Backfill OpenSearch from the products database snapshot, then replay changes since the snapshot from the change log.
4. Shadow-read: 5% of search queries also run against OpenSearch; we compare top-10 results offline.
5. Cut reads over to OpenSearch behind the `search_backend` flag once the new index is caught up.
6. Keep ES running, still dual-written, as the rollback target. Decommission after two weeks with no rollback.

## Incompatibilities

- `_type`-based filters in the legacy admin search: rewrite to a `doc_kind` field before cutover.
- The ES `ltr` plugin for learning-to-rank is not available. We drop LTR re-ranking; the A/B test from August showed no measurable gain from it.

## Timeline

| Phase | Duration |
|---|---|
| Cluster setup + dual-write | 1 week |
| Backfill + shadow reads | 1 week |
| Cutover + rollback window | 1 week |

## Risks

- Relevance drift without LTR: mitigated by shadow-read comparison; cut over only if top-10 overlap is at least 90%.
- Double indexing load on the indexer: current peak is 40% CPU, so doubling fits.

We will monitor the migration closely.

## Open questions

- Who owns the shadow-read comparison report?
