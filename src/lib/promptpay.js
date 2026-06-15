import generatePayload from 'promptpay-qr'
import QRCode from 'qrcode'

// Build a scannable PromptPay QR as a PNG data-URL, encoding the exact amount so
// the banking app prefills it. Needs only the public number — no secret.
export async function buildPromptPayQR(target, amount) {
  const payload = generatePayload(target, { amount })
  return QRCode.toDataURL(payload, {
    margin: 1,
    width: 256,
    color: { dark: '#1a1035', light: '#ffffff' },
  })
}
