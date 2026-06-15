// Public payment display config. Only the PromptPay number + merchant name are
// needed in the browser (to draw the QR); the SlipOK key and verification live
// server-side in Cloud Functions and are never shipped here.
export const shopConfig = {
  promptPayNumber: import.meta.env.VITE_PROMPTPAY_NUMBER ?? '0000000000',
  merchantName: import.meta.env.VITE_MERCHANT_NAME ?? 'ROLLER COASTER',
}
