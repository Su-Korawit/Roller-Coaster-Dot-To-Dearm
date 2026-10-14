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

// Atomically spends Coins on a catalog entitlement. Price and payload come
// from entitlementCatalog (never the client); coins and entitlements are
// Functions-owned fields, so this transaction is the only spend path.
exports.purchaseEntitlement = onCall(async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')
  const itemId = req.data?.itemId
  if (!itemId) throw new HttpsError('invalid-argument', 'itemId is required.')

  const itemRef = db.collection('entitlementCatalog').doc(itemId)
  const userRef = db.collection('users').doc(uid)

  return db.runTransaction(async (tx) => {
    const [itemSnap, userSnap] = await Promise.all([tx.get(itemRef), tx.get(userRef)])
    if (!itemSnap.exists || itemSnap.data().active !== true) {
      throw new HttpsError('not-found', 'Item is not available.')
    }
    if (!userSnap.exists) throw new HttpsError('not-found', 'User not found.')

    const item = itemSnap.data()
    const user = userSnap.data()
    if (user.entitlements?.[itemId]) {
      throw new HttpsError('already-exists', 'Already owned.')
    }
    const price = Number(item.priceCoins)
    const balance = Number(user.coins ?? 0)
    if (!Number.isFinite(price) || price < 0) {
      throw new HttpsError('failed-precondition', 'Item is misconfigured.')
    }
    if (balance < price) throw new HttpsError('failed-precondition', 'INSUFFICIENT_COINS')

    const newBalance = balance - price
    tx.update(userRef, {
      coins: newBalance,
      [`entitlements.${itemId}`]: {
        kind: item.kind ?? null,
        payload: item.payload ?? null,
        pricePaid: price,
        purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    })
    return { ok: true, newBalance, itemId }
  })
})

// ── File Bag quota (ADR-0016) ─────────────────────────────────────────────────
const FREE_BAG_BYTES = 1 * 1024 * 1024 * 1024 // 1 GB
const ADMIN_BAG_BYTES = 1024 * 1024 * 1024 * 1024 // 1 TB
const ADMIN_EMAILS = new Set([
  'o.korawitt@gmail.com',
  'takadaoni07@gmail.com',
  'play198725@gmail.com',
  'itcity9476@gmail.com',
])

function computeBagQuotaBytes(user) {
  const email = (user?.email ?? '').toLowerCase()
  if (ADMIN_EMAILS.has(email)) return ADMIN_BAG_BYTES
  const entitlements = user?.entitlements ?? {}
  let extra = 0
  for (const e of Object.values(entitlements)) {
    if (e?.kind === 'storage-quota') extra += Number(e.payload?.extraBytes ?? 0)
  }
  return FREE_BAG_BYTES + extra
}

// Reserve quota before a Bag-native upload. Increments fileBagUsageBytes
// transactionally if under quota; client then uploads to Storage.
exports.reserveBagUpload = onCall(async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')
  const sizeBytes = Number(req.data?.sizeBytes)
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new HttpsError('invalid-argument', 'sizeBytes must be a positive number.')
  }

  const userRef = db.collection('users').doc(uid)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef)
    if (!snap.exists) throw new HttpsError('not-found', 'User not found.')
    const user = snap.data()
    const used = Number(user.fileBagUsageBytes ?? 0)
    const quota = computeBagQuotaBytes(user)
    if (used + sizeBytes > quota) {
      throw new HttpsError('resource-exhausted', 'BAG_QUOTA_EXCEEDED')
    }
    tx.update(userRef, {
      fileBagUsageBytes: used + sizeBytes,
    })
    return { ok: true, used: used + sizeBytes, quota }
  })
})

// Storage delete on bag-native objects releases reserved quota and best-effort
// cleans orphaned fileBagItems docs that still point at the path.
const { onObjectDeleted } = require('firebase-functions/v2/storage')
exports.onBagObjectDeleted = onObjectDeleted(async (event) => {
  const name = event.data?.name // users/{uid}/bag/{fileId}
  if (!name || !name.startsWith('users/')) return
  const parts = name.split('/')
  if (parts.length < 4 || parts[2] !== 'bag') return
  const uid = parts[1]
  const sizeBytes = Number(event.data?.size ?? 0)

  const userRef = db.collection('users').doc(uid)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef)
    if (!snap.exists) return
    const used = Number(snap.data().fileBagUsageBytes ?? 0)
    tx.update(userRef, {
      fileBagUsageBytes: Math.max(0, used - (Number.isFinite(sizeBytes) ? sizeBytes : 0)),
    })
  })

  const orphans = await db.collection('fileBagItems')
    .where('ownerUid', '==', uid)
    .where('storagePath', '==', name)
    .get()
  const batch = db.batch()
  orphans.docs.forEach((d) => batch.delete(d.ref))
  if (!orphans.empty) await batch.commit()
})

// ── School membership mirror (ADR 0018) ──────────────────────────────────────
// Keeps two Functions-owned derived values in step with users/{uid}.schoolId:
//   Firestore schools/{schoolId}.memberCount — drives the 30-member room threshold
//   RTDB      userSchool/{uid}               — lets database.rules.json gate school rooms
// Fires on every users/{uid} write but exits immediately unless schoolId changed.
// Not idempotent under retries (increment); retries are off by default. A periodic
// reconcile from a count query is a known follow-up.
const { onDocumentWritten } = require('firebase-functions/v2/firestore')
const { schoolMemberDeltas, normalizeSchoolId } = require('./schoolMembers')

exports.syncUserSchool = onDocumentWritten('users/{uid}', async (event) => {
  const before = event.data?.before?.exists ? event.data.before.data() : undefined
  const after = event.data?.after?.exists ? event.data.after.data() : undefined
  const deltas = schoolMemberDeltas(before, after)
  if (!deltas.length) return

  const uid = event.params.uid
  const newSchoolId = normalizeSchoolId(after)
  const rtdbRef = admin.database().ref(`userSchool/${uid}`)
  if (newSchoolId) await rtdbRef.set(newSchoolId)
  else await rtdbRef.remove()

  const batch = db.batch()
  for (const { schoolId, delta } of deltas) {
    const patch = { memberCount: admin.firestore.FieldValue.increment(delta) }
    if (delta > 0 && typeof after?.schoolName === 'string') patch.name = after.schoolName
    batch.set(db.collection('schools').doc(schoolId), patch, { merge: true })
  }
  await batch.commit()
})
