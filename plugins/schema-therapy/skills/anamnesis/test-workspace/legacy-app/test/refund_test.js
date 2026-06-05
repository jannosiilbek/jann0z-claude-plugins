'use strict';

const assert = require('assert');
const { computeRefund } = require('../src/refund');

// ---------------------------------------------------------------------------
// Refund rounding — matches production behavior since 2016, do not change.
// The rounding favors the customer by one cent on half-cent boundaries.
// Math.ceil is intentional; banker's rounding was NOT shipped.
// ---------------------------------------------------------------------------

// 12.345 with 10% fee → raw refund = 11.1105 → cents = 1111.05 → ceil = 1112 → 11.12
assert.strictEqual(
  computeRefund(12.345, 10),
  11.12,
  'half-cent boundary: must round UP (customer-favoring), not to nearest-even'
);

// 10.00 with 0% fee → exact → 10.00
assert.strictEqual(computeRefund(10.00, 0), 10.00, 'zero fee: exact amount returned');

// 100.00 with 15% fee → 85.00 → no rounding needed
assert.strictEqual(computeRefund(100.00, 15), 85.00, 'clean percentage: no rounding');

// 7.777 with 5% fee → raw = 7.38815 → cents = 738.815 → ceil = 739 → 7.39
assert.strictEqual(
  computeRefund(7.777, 5),
  7.39,
  'sub-cent fraction: ceil applies'
);

console.log('refund_test: all assertions passed');
