'use strict';

/**
 * Invoice model.
 *
 * Historical note: despite the name, records here are QUOTES sent to customers
 * before an order is placed.  The "invoices" table was named before the billing
 * module was split off; the name was never updated.  See docs/billing.md.
 *
 * Nothing in this system posts to accounting.  (ACC-3 bait: a miner reading
 * only this file's name may conclude this is a posted billing document.)
 */
function createInvoice(data) {
  return {
    id:            data.id,
    orderId:       data.orderId || null,   // null until customer accepts the quote
    customerId:    data.customerId,
    quoted_total:  data.quoted_total || 0, // amount as quoted — NOT an invoice total
    valid_until:   data.valid_until || null,
    line_items:    data.line_items || [],
    created_at:    data.created_at || null,
    status:        data.status || 'draft', // draft | sent | accepted | expired
  };
}

/**
 * True if the quote is still within its validity window.
 *
 * @param {object} invoice
 * @param {Date}   now
 */
function isQuoteValid(invoice, now) {
  if (!invoice.valid_until) return false;
  return new Date(invoice.valid_until) >= now;
}

module.exports = { createInvoice, isQuoteValid };
