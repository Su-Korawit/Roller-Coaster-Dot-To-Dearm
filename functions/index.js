// Cloud Functions backing the chat-shop. The browser may only *create intent*
// (createPurchase) and *upload a slip* (verifyPayment); price, coin amount, slip
// verification, dedup, and the revenue ledger are all decided here with the Admin
// SDK so a client can never forge them. SlipOK is called server-side so its key
// stays secret and there is no browser CORS wall.
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret, defineString } = require('firebase-functions/params')
const admin = require('firebase-admin')
const crypto = require('crypto')

admin.initializeApp()
const db = admin.firestore()

const SLIPOK_API_KEY = defineSecret('SLIPOK_API_KEY')
const SLIPOK_BRANCH_ID = defineString('SLIPOK_BRANCH_ID', { default: '68822' })
const EXPIRE_MINUTES = defineString('PAYMENT_EXPIRE_MINUTES', { default: '15' })
// 'true' (default) skips the live SlipOK call so the full flow is testable
// without a real merchant account. Set to 'false' for production verification.
const DEMO_MODE = defineString('SLIPOK_DEMO_MODE', { default: 'true' })

const SLIP_FAIL_CODES = { 1012: 'DUPLICATE_SLIP', 1013: 'WRONG_AMOUNT' }
function mapSlipOkError(code) {
  return SLIP_FAIL_CODES[code] ?? 'INVALID_SLIP'
}

// Verifies the uploaded slip against the expected THB amount and returns a
// transRef used for cross-purchase dedup. Demo mode trusts the amount and
// fabricates a per-purchase ref (so each purchase stays distinct).
async function verifySlip(uid, purchaseId, expectedAmount) {
  const demo = (DEMO_MODE.value() || 'true').toLowerCase() !== 'false'
  const filePath = `slips/${uid}/${purchaseId}`
  const [buf] = await admin.storage().bucket().file(filePath).download()

  if (demo) {
    // Derive transRef from the slip image content so the SAME image yields the
    // SAME transRef → usedSlips dedup fires. Demo now mirrors real-mode dedup.
    const hash = crypto.createHash('sha256').update(buf).digest('hex')
    return { ok: true, transRef: `DEMO-${hash}` }
  }

  const form = new FormData()
  form.append('files', new Blob([buf]), 'slip.jpg')
  form.append('amount', String(expectedAmount))

  const endpoint = `https://api.slipok.com/api/line/apikey/${SLIPOK_BRANCH_ID.value()}`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'x-authorization': SLIPOK_API_KEY.value() },
    body: form,
  })
  const data = await res.json().catch(() => null)

  // SlipOK returns { success, data: { amount, receiver: { displayName }, transRef } }
  if (!res.ok || !data?.success) {
    return { ok: false, reason: mapSlipOkError(data?.code) }
  }
  if (Number(data.data?.amount) !== expectedAmount) {
    return { ok: false, reason: 'WRONG_AMOUNT' }
  }
  // Fail closed: no transRef means we can't dedup → reject rather than credit.
  const transRef = data.data?.transRef
  if (!transRef) return { ok: false, reason: 'INVALID_SLIP' }
  return { ok: true, transRef }
}

// Creates a purchase intent. amount + coins are read from the catalogue, never
// from the client, so a forged cheap-price/large-coins purchase is impossible.
exports.createPurchase = onCall(async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')
  const productId = req.data?.productId
  if (!productId) throw new HttpsError('invalid-argument', 'productId is required.')

  const prodSnap = await db.collection('shopProducts').doc(productId).get()
  if (!prodSnap.exists || prodSnap.data().active !== true) {
    throw new HttpsError('not-found', 'Product is not available.')
  }
  const product = prodSnap.data()
  const expireMin = Number(EXPIRE_MINUTES.value()) || 15
  const expiresAt = Date.now() + expireMin * 60_000

  const ref = db.collection('purchases').doc()
  await ref.set({
    id: ref.id,
    uid,
    productId,
    productName: product.name ?? '',
    amount: product.price,
    coins: product.coins,
    status: 'WAITING_PAYMENT',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
  })
  return { purchaseId: ref.id, amount: product.price, coins: product.coins, expiresAt }
})

// Verifies a slip for a purchase and, on success, atomically marks it SUCCESS,
// records the slip ref (one-time-use), and credits coins. Idempotent.
exports.verifyPayment = onCall({ secrets: [SLIPOK_API_KEY] }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')
  const purchaseId = req.data?.purchaseId
  if (!purchaseId) throw new HttpsError('invalid-argument', 'purchaseId is required.')

  const ref = db.collection('purchases').doc(purchaseId)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Purchase not found.')
  const purchase = snap.data()
  if (purchase.uid !== uid) throw new HttpsError('permission-denied', 'Not your purchase.')
  if (purchase.status === 'SUCCESS') return { ok: true, coins: purchase.coins } // idempotent
  if (purchase.status !== 'WAITING_PAYMENT') {
    throw new HttpsError('failed-precondition', 'Purchase is not awaiting payment.')
  }
  if (Date.now() > purchase.expiresAt) {
    await ref.update({ status: 'EXPIRED' })
    return { ok: false, reason: 'EXPIRED' }
  }

  await ref.update({ status: 'VERIFYING' })

  const result = await verifySlip(uid, purchaseId, purchase.amount)
  if (!result.ok) {
    await ref.update({ status: 'FAILED', failReason: result.reason })
    return { ok: false, reason: result.reason }
  }

  const transRef = result.transRef
  try {
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref)
      if (fresh.data().status === 'SUCCESS') return // already credited
      // One-time-use slip guard: creating usedSlips/{transRef} fails if it
      // already exists, giving atomic cross-purchase dedup (survives reloads).
      if (transRef) {
        const slipRef = db.collection('usedSlips').doc(transRef)
        const used = await tx.get(slipRef)
        if (used.exists) {
          const err = new Error('DUPLICATE_SLIP')
          err.duplicate = true
          throw err
        }
        tx.set(slipRef, { purchaseId, uid, usedAt: admin.firestore.FieldValue.serverTimestamp() })
      }
      tx.update(ref, {
        status: 'SUCCESS',
        slipFingerprint: transRef ?? null,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        failReason: admin.firestore.FieldValue.delete(),
      })
      // Audit ledger of coins ever purchased (not the client display balance).
      tx.set(
        db.collection('users').doc(uid),
        { coins: admin.firestore.FieldValue.increment(purchase.coins) },
        { merge: true },
      )
    })
  } catch (err) {
    if (err.duplicate) {
      await ref.update({ status: 'FAILED', failReason: 'DUPLICATE_SLIP' })
      return { ok: false, reason: 'DUPLICATE_SLIP' }
    }
    throw err
  }

  return { ok: true, coins: purchase.coins }
})

// Exported for unit testing the pure SlipOK error mapping.
exports._mapSlipOkError = mapSlipOkError
