// Thai user-facing reasons for a failed slip verification, keyed by the codes the
// verifyPayment Cloud Function returns.
export const SLIP_FAIL_MESSAGES = {
  WRONG_AMOUNT: 'ยอดเงินไม่ตรงกับที่ต้องชำระ กรุณาตรวจสอบแล้วลองใหม่',
  WRONG_RECEIVER: 'สลิปโอนไปยังผู้รับรายอื่น',
  DUPLICATE_SLIP: 'สลิปนี้ถูกใช้ไปแล้ว',
  INVALID_SLIP: 'อ่านสลิปไม่ได้ กรุณาอัปโหลดรูปที่ชัดเจน',
  EXPIRED: 'QR หมดอายุแล้ว กรุณาเริ่มรายการใหม่',
}

// Generic Thai fallback for unknown / unmapped codes (e.g. raw HttpsError codes)
// so the UI never surfaces an English server message.
const SLIP_FALLBACK_MESSAGE = 'ไม่สามารถยืนยันสลิปได้ กรุณาลองใหม่'

export function slipErrorMessage(reason) {
  return SLIP_FAIL_MESSAGES[reason] ?? SLIP_FALLBACK_MESSAGE
}
