# Public REST API: Rate Limiting

## Limits

Each API key may make a fixed number of requests per one-minute window, set by its plan.

| Plan | Limit |
|---|---|
| Free | 100 requests/min |
| Pro | 1000 requests/min |
| Enterprise | Custom, configured by support |

## Response headers

Every response MUST include these headers, including `429` responses:

| Header | Value |
|---|---|
| `X-RateLimit-Limit` | The key's limit for the current window (requests/min) |
| `X-RateLimit-Remaining` | Requests left in the current window |
| `X-RateLimit-Reset` | Time the current window resets, as Unix time in seconds |

For Enterprise keys, `X-RateLimit-Limit` reports the custom limit.

## Exceeding the limit

When a key has no requests left in the current window, the API MUST reject the request with `429 Too Many Requests` and a `Retry-After` header giving the number of seconds until the window resets.

Example:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 17
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1793750460
```

## Open questions

1. Window type: fixed calendar minute or sliding 60-second window? This determines how `X-RateLimit-Reset` and `Retry-After` are computed.
2. Do rejected (`429`) requests count against the limit?
3. Requests without an API key: are they rate limited (e.g. per IP), and what do the headers report for them?
4. Does a `429` response have a body, and in what error format?
5. When support changes an Enterprise limit or a key changes plan, does the new limit apply immediately or from the next window?
