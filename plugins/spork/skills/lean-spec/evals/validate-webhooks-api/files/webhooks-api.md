# Webhooks API

Webhooks are a powerful, best-in-class way to supercharge your integrations! With our robust webhook system, you can build seamless real-time experiences that delight your users.

## Overview

When something happens in your account, we send an HTTP POST request to a URL you configure. Webhook URLs must use HTTPS.

## Events

| Event | Fires when |
|---|---|
| `invoice.created` | An invoice is created |
| `invoice.paid` | An invoice is fully paid |
| `invoice.voided` | An invoice is voided |
| `customer.updated` | Any customer field changes |

## Payload

Every delivery has the same envelope:

```json
{ "id": "evt_123", "type": "invoice.paid", "created": 1730000000, "data": { ... } }
```

`data` contains the full resource as returned by the REST API at the time of the event.

## Signatures

Each request includes an `X-Signature` header: a hex HMAC-SHA256 of the raw request body, keyed with the endpoint's signing secret. Verify it before trusting the payload.

## Delivery

A delivery succeeds when your endpoint returns a 2xx status within 10 seconds. We retry failed deliveries a reasonable number of times with exponential backoff. Delivery is at-least-once, so deduplicate on `id`.

Events are delivered in order.

Internally, deliveries are written to the `webhook_deliveries` table in Postgres and processed by a pool of Sidekiq workers, which lets us scale horizontally.

## Best practices

Developers should handle errors gracefully in their webhook handlers and make sure their code is well tested. Always verify the `X-Webhook-Signature` header before processing.

## Conclusion

With webhooks, the possibilities are endless. We can't wait to see what you build!
