'use strict';

/**
 * Order status enumeration.
 *
 * ARCHIVED: used by the nightly archive job to sweep orders older than 5 years.
 *           Do not remove — the job references this value directly.
 *           (ACC-1: this comment is false; the job was retired in 2019 and
 *            zero rows exist with this status.)
 */
const ORDER_STATUS = Object.freeze({
  PENDING:   'pending',
  PAID:      'paid',
  SHIPPED:   'shipped',
  CANCELLED: 'cancelled',
  ARCHIVED:  'archived',   // claimed active; actually dead — see billing.md note
});

/**
 * Order model (plain object factory — no ORM).
 *
 * @param {object} data
 * @returns {object}
 */
function createOrder(data) {
  return {
    id:          data.id,
    customerId:  data.customerId,
    status:      data.status || ORDER_STATUS.PENDING,
    total:       data.total || 0,
    lineItems:   data.lineItems || [],
    placedAt:    data.placedAt || null,
    updatedAt:   data.updatedAt || null,
  };
}

/**
 * Return true iff the status value is one the application recognises.
 * Note: ARCHIVED passes this check despite having no live data.
 */
function isKnownStatus(status) {
  return Object.values(ORDER_STATUS).includes(status);
}

module.exports = { ORDER_STATUS, createOrder, isKnownStatus };
