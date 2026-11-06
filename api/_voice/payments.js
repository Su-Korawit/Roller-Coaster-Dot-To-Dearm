// api/_voice/payments.js — placeholder for the paid plan. NO payment provider is wired yet
// (decision pending, see ai-handoff/DECISIONS.md). The ONLY thing that may ever set
// `paid: true` on voiceSecretary/{uid} is a verified payment webhook calling markPaid().
// Until then paid stays false, so trials are Web Call only and outbound dialing never fires.

/** @typedef {{ createCheckout(uid:string, planId:string): Promise<{url:string}>, parseWebhook(req:any): Promise<{uid:string, planId:string, paidUntil:number}|null> }} PaymentProvider */

/** @type {PaymentProvider} */
export const noPaymentProvider = {
  async createCheckout() { throw Object.assign(new Error('payments_not_configured'), { code: 'payments_not_configured' }) },
  async parseWebhook() { return null },
}

/** Transaction body: flip the paid flag. Call from a verified provider webhook only. */
export function markPaid(state, { paidUntil }) {
  return { ...state, paid: true, paidUntil: paidUntil ?? null }
}
