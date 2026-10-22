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

// ── Focus sessions (ADR 0018) ────────────────────────────────────────────────
// The client may only say "start", "I'm here", "stop". Every timestamp, every
// credited millisecond and every XP point is decided here from server time
// (see focusMath.js). Data (all Functions-owned; clients may only read their own):
//   focusActive/{uid}          the one running session
//   focusDaily/{uid}_{day}     verified ms per Bangkok day (leaderboard source, Task 4)
//   focusSessions/{autoId}     finished-session history
//   users/{uid}.focusXp        running XP total
//   users/{uid}.leaves         Study Room currency, credited once at session end
const {
  CHECKIN_WINDOW_MS, DAILY_CAP_MS, bangkokDay, settleSegment, xpDelta,
} = require('./focusMath')
const { normalizeSchoolId: normalizeFocusSchoolId } = require('./schoolMembers')
const { temperamentOf, xpMultiplier, YESTERDAY_MIN_MS } = require('./temperaments')
const { validateFocusParams, treeFor, leavesFor } = require('./leavesMath')

function requireUid(req) {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')
  return uid
}

// Shared body of checkIn/end. Reads first, writes last (Firestore transaction rule).
async function settleActive(uid, { end, forceWither = false }) {
  const nowMs = Date.now()
  const activeRef = db.collection('focusActive').doc(uid)
  const userRef = db.collection('users').doc(uid)
  const day = bangkokDay(nowMs)
  const dailyRef = db.collection('focusDaily').doc(`${uid}_${day}`)

  return db.runTransaction(async (tx) => {
    let endExtras = {}
    const [activeSnap, dailySnap] = await Promise.all([tx.get(activeRef), tx.get(dailyRef)])
    if (!activeSnap.exists) throw new HttpsError('failed-precondition', 'NO_ACTIVE_SESSION')
    const active = activeSnap.data()
    const dailyUsed = Number(dailySnap.data()?.verifiedMs ?? 0)

    const seg = settleSegment({ lastCheckInAt: active.lastCheckInAt, nowMs, dailyUsedMs: dailyUsed })
    // Study Room: a Strict session whose check-in lapsed has withered (server-decided);
    // sessions started before modes existed behave as Flexible 25 min.
    const mode = active.mode ?? 'flexible'
    const plannedMin = active.plannedMin ?? 25
    const withered = active.withered === true || forceWither || (mode === 'strict' && seg.lapsed)
    const before = Number(active.verifiedMs ?? 0)
    const after = before + seg.creditedMs
    // Temperament perk (ADR 0018) scales XP only, never the verified time behind the
    // leaderboard. XP is floor-of-weighted-total so no fraction is lost between calls;
    // sessions started before perks existed fall back to their verified total.
    const multiplier = xpMultiplier({
      temperament: active.temperament ?? null,
      sessionVerifiedMs: before,
      dailyBeforeMs: dailyUsed,
      nowMs,
      studiedYesterday: active.studiedYesterday === true,
    })
    const weightedBefore = Number(active.weightedMs ?? before)
    const weightedAfter = weightedBefore + seg.creditedMs * multiplier
    const xpGained = xpDelta(weightedBefore, weightedAfter)

    if (seg.creditedMs > 0) {
      tx.set(dailyRef, {
        uid, day, schoolId: active.schoolId ?? null,
        verifiedMs: dailyUsed + seg.creditedMs,
      }, { merge: true })
    }
    if (xpGained > 0) {
      tx.set(userRef, { focusXp: admin.firestore.FieldValue.increment(xpGained) }, { merge: true })
    }

    if (end) {
      const leaves = leavesFor({ mode, verifiedMs: after, plannedMin, withered })
      const tree = treeFor({ plannedMin, withered })
      if (leaves > 0) {
        tx.set(userRef, { leaves: admin.firestore.FieldValue.increment(leaves) }, { merge: true })
      }
      tx.delete(activeRef)
      tx.set(db.collection('focusSessions').doc(), {
        uid, schoolId: active.schoolId ?? null,
        startedAt: active.startedAt, endedAt: nowMs, verifiedMs: after,
        day, reason: forceWither ? 'abandoned' : 'ended',
        mode, plannedMin, subjectKey: null, tree, leaves, withered,
      })
      endExtras = { leaves, tree, mode, plannedMin, withered }
    } else if (!seg.tooSoon) {
      tx.update(activeRef, {
        lastCheckInAt: nowMs, verifiedMs: after, weightedMs: weightedAfter,
        ...(withered ? { withered: true } : {}),
      })
    }

    return {
      ok: true,
      verifiedMs: after,
      lastCheckInAt: seg.tooSoon || end ? active.lastCheckInAt : nowMs,
      creditedMs: seg.creditedMs,
      xpGained,
      multiplier,
      lapsed: seg.lapsed,
      capped: seg.capped,
      tooSoon: seg.tooSoon,
      dailyMs: dailyUsed + seg.creditedMs,
      dailyCapMs: DAILY_CAP_MS,
      withered,
      ...endExtras,
    }
  })
}

exports.startFocus = onCall(async (req) => {
  const uid = requireUid(req)
  const params = validateFocusParams({ mode: req.data?.mode, plannedMin: req.data?.plannedMin })
  if (!params.ok) throw new HttpsError('invalid-argument', 'Invalid focus parameters.', { code: params.code })
  const nowMs = Date.now()
  const activeRef = db.collection('focusActive').doc(uid)
  const userRef = db.collection('users').doc(uid)

  return db.runTransaction(async (tx) => {
    const yesterdayRef = db.collection('focusDaily').doc(`${uid}_${bangkokDay(nowMs - 24 * 60 * 60 * 1000)}`)
    const [activeSnap, userSnap, yesterdaySnap] = await Promise.all([tx.get(activeRef), tx.get(userRef), tx.get(yesterdayRef)])
    if (!userSnap.exists) throw new HttpsError('not-found', 'User not found.')

    if (activeSnap.exists) {
      const a = activeSnap.data()
      if (nowMs - a.lastCheckInAt <= CHECKIN_WINDOW_MS) {
        // Idempotent: a second tab / a reload resumes the running session. A Strict session
        // cannot survive that (the page was left, and closing the tab never reports it), so
        // it withers here — otherwise closing the tab and coming back would keep the reward.
        if (a.mode === 'strict' && !a.withered) tx.update(activeRef, { withered: true })
        return { ok: true, resumed: true, withered: a.mode === 'strict' ? true : (a.withered ?? false), startedAt: a.startedAt, lastCheckInAt: a.lastCheckInAt, verifiedMs: a.verifiedMs ?? 0, temperament: a.temperament ?? null, mode: a.mode ?? 'flexible', plannedMin: a.plannedMin ?? 25 }
      }
      // Stale: close it with nothing extra credited, then start fresh.
      tx.set(db.collection('focusSessions').doc(), {
        uid, schoolId: a.schoolId ?? null, startedAt: a.startedAt, endedAt: nowMs,
        verifiedMs: a.verifiedMs ?? 0, day: bangkokDay(nowMs), reason: 'lapsed',
      })
    }

    const schoolId = normalizeFocusSchoolId(userSnap.data())
    const u = userSnap.data()
    const temperament = temperamentOf(u.profile?.mbti ?? u.mbti)
    const studiedYesterday = Number(yesterdaySnap.data()?.verifiedMs ?? 0) >= YESTERDAY_MIN_MS
    tx.set(activeRef, {
      uid, schoolId, startedAt: nowMs, lastCheckInAt: nowMs, verifiedMs: 0,
      weightedMs: 0, temperament, studiedYesterday,
      mode: params.mode, plannedMin: params.plannedMin, withered: false,
    })
    return { ok: true, resumed: false, startedAt: nowMs, lastCheckInAt: nowMs, verifiedMs: 0, temperament, mode: params.mode, plannedMin: params.plannedMin }
  })
})

exports.checkInFocus = onCall(async (req) => settleActive(requireUid(req), { end: false }))
exports.endFocus = onCall(async (req) => settleActive(requireUid(req), { end: true }))
// Strict: client reports it left the page (>10 s) — the tree withers and earns nothing.
// Flexible: client reports it was away > 2 min — verified minutes still count, no bonus.
exports.abandonFocus = onCall(async (req) => settleActive(requireUid(req), { end: true, forceWither: true }))

// ── Study Room economy ───────────────────────────────────────────────────────
// Leaves, room inventory and the welcome pack are Functions-owned (rules deny client
// writes). Every callable reads first and writes last inside one transaction, so parallel
// calls cannot double-spend or double-grant.
const roomLogic = require('./roomLogic')

function toRoomError(err) {
  if (err instanceof HttpsError) return err
  if (err && err.code && err.extra !== undefined) return new HttpsError(err.code, err.message, err.extra)
  if (err && err.code) return new HttpsError(err.code, err.message)
  console.error('[room] unexpected error:', err)
  return new HttpsError('internal', 'Something went wrong.')
}

exports.buyRoomItem = onCall(async (req) => {
  const uid = requireUid(req)
  const itemId = req.data?.itemId
  if (typeof itemId !== 'string' || !itemId) throw new HttpsError('invalid-argument', 'itemId is required.')
  const userRef = db.collection('users').doc(uid)
  const itemRef = db.collection('roomCatalog').doc(itemId)
  const roomRef = db.collection('rooms').doc(uid)
  try {
    return await db.runTransaction(async (tx) => {
      const [userSnap, itemSnap, roomSnap] = await Promise.all([tx.get(userRef), tx.get(itemRef), tx.get(roomRef)])
      if (!userSnap.exists) throw new HttpsError('not-found', 'User not found.')
      const u = userSnap.data()
      const inventory = u.roomInventory ?? {}
      const plan = roomLogic.planPurchase({
        item: itemSnap.exists ? itemSnap.data() : null,
        itemId,
        leaves: u.leaves ?? 0,
        inventory,
        currentTier: roomSnap.exists ? roomSnap.data().tier ?? 0 : 0,
      })
      const leaves = Number(u.leaves ?? 0) - plan.price
      const owned = Number(inventory[itemId] ?? 0) + 1
      tx.set(userRef, { leaves, roomInventory: { [itemId]: owned } }, { merge: true })
      return { ok: true, leaves, owned }
    })
  } catch (err) {
    throw toRoomError(err)
  }
})

exports.claimWelcomePack = onCall(async (req) => {
  const uid = requireUid(req)
  const userRef = db.collection('users').doc(uid)
  const roomRef = db.collection('rooms').doc(uid)
  const starterIds = Object.keys(roomLogic.STARTER_ITEMS)
  try {
    return await db.runTransaction(async (tx) => {
      const [userSnap, roomSnap, ...itemSnaps] = await Promise.all([
        tx.get(userRef),
        tx.get(roomRef),
        ...starterIds.map((id) => tx.get(db.collection('roomCatalog').doc(id))),
      ])
      if (!userSnap.exists) throw new HttpsError('not-found', 'User not found.')
      const u = userSnap.data()
      if (!roomLogic.planWelcomePack({ welcomePack: u.welcomePack }).grant) return { ok: true, already: true }

      const granted = {}
      starterIds.forEach((id, i) => {
        if (itemSnaps[i].exists) granted[id] = roomLogic.STARTER_ITEMS[id]
      })
      const inventory = { ...(u.roomInventory ?? {}) }
      for (const [id, n] of Object.entries(granted)) inventory[id] = Number(inventory[id] ?? 0) + n
      tx.set(userRef, {
        leaves: Number(u.leaves ?? 0) + roomLogic.WELCOME_LEAVES,
        roomInventory: inventory,
        welcomePack: 'v2',
      }, { merge: true })
      if (!roomSnap.exists) {
        const layout = roomLogic.STARTER_LAYOUT
        tx.set(roomRef, {
          tier: layout.tier, theme: layout.theme, petId: layout.petId,
          placed: layout.placed.filter((p) => granted[p.itemId] > 0),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      }
      return { ok: true, already: false }
    })
  } catch (err) {
    throw toRoomError(err)
  }
})

// Saves the caller's room layout. Firestore rules cannot count copies per item, so the
// layout is validated here against the caller's inventory and the catalog (placement.js,
// shared with the editor), and rooms/{uid} is client-read-only.
const placement = require('./placement')

exports.saveRoomLayout = onCall(async (req) => {
  const uid = requireUid(req)
  const input = req.data?.layout
  if (!input || typeof input !== 'object' || !Array.isArray(input.placed)) {
    throw new HttpsError('invalid-argument', 'layout is required.')
  }
  const layout = {
    tier: input.tier,
    theme: input.theme,
    petId: input.petId ?? null,
    placed: input.placed.map((p) => (p && typeof p === 'object'
      ? { itemId: p.itemId, x: p.x, y: p.y, ...(p.slot !== undefined ? { slot: p.slot } : {}) }
      : p)),
  }
  const userRef = db.collection('users').doc(uid)
  try {
    return await db.runTransaction(async (tx) => {
      const [userSnap, catalogSnap] = await Promise.all([tx.get(userRef), tx.get(db.collection('roomCatalog'))])
      if (!userSnap.exists) throw new HttpsError('not-found', 'User not found.')
      const catalog = Object.fromEntries(catalogSnap.docs.map((d) => [d.id, d.data()]))
      const result = placement.validateLayout({ layout, catalog, inventory: userSnap.data().roomInventory ?? {} })
      if (!result.ok) throw new HttpsError('invalid-argument', 'Invalid layout.', { errors: result.errors })
      tx.set(db.collection('rooms').doc(uid), { ...layout, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
      return { ok: true }
    })
  } catch (err) {
    throw toRoomError(err)
  }
})

// ── Weekly school leaderboard (ADR 0018) ─────────────────────────────────────
// Recomputes the current ISO week (Asia/Bangkok) from focusDaily and writes
//   schoolWeeks/{schoolId}_{week}   per-school totals + `ranked` flag
//   leaderboardMeta/current         { week, endsAtMs, updatedAt } for the UI countdown
// Full recompute each run (idempotent, self-healing, no counters to drift). Cost
// is one read per user-day this week; switch to incremental aggregation if that
// outgrows the pilot.
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { weekInfo, aggregateSchools } = require('./leaderboardMath')

async function rollupWeek(nowMs = Date.now()) {
  const info = weekInfo(nowMs)
  const first = info.days[0]
  const last = info.days[6]

  const snap = await db.collection('focusDaily')
    .where('day', '>=', first).where('day', '<=', last).get()
  const rows = snap.docs.map((d) => d.data())

  const schoolIds = [...new Set(rows.map((r) => r.schoolId).filter(Boolean))]
  const schools = {}
  for (let i = 0; i < schoolIds.length; i += 300) {
    const docs = await db.getAll(...schoolIds.slice(i, i + 300).map((id) => db.collection('schools').doc(id)))
    docs.forEach((d) => { if (d.exists) schools[d.id] = d.data() })
  }

  const results = aggregateSchools(rows, schools)
  for (let i = 0; i < results.length; i += 400) {
    const batch = db.batch()
    for (const r of results.slice(i, i + 400)) {
      batch.set(db.collection('schoolWeeks').doc(`${r.schoolId}_${info.week}`), {
        ...r, week: info.week, updatedAt: nowMs,
      })
    }
    await batch.commit()
  }
  await db.collection('leaderboardMeta').doc('current').set({
    week: info.week, endsAtMs: info.endsAtMs, updatedAt: nowMs,
  })
  return { week: info.week, schools: results.length, ranked: results.filter((r) => r.ranked).length }
}

exports._rollupWeek = rollupWeek
exports.rollupSchoolWeek = onSchedule(
  { schedule: 'every 60 minutes', timeZone: 'Asia/Bangkok' },
  async () => { await rollupWeek() },
)

// ── Teacher badge (ADR 0018) ─────────────────────────────────────────────────
// Super-admin only. Sets { teacher, teacherSchoolId } custom claims (what the
// rules trust) and mirrors teacherSchoolId onto users/{uid} for the admin list.
// The teacher must refresh their ID token (getIdToken(true)) to see the change.
const { nextClaims } = require('./teacherClaims')
const SUPER_ADMIN_UID = 'IaltEhO0mPVfK3ng8npr4CdqnEE3'   // keep in step with src/constants/admin.js ADMIN_UID

exports.grantTeacherBadge = onCall(async (req) => {
  if (req.auth?.uid !== SUPER_ADMIN_UID) {
    throw new HttpsError('permission-denied', 'Only the super-admin can manage teacher badges.')
  }
  const uid = req.data?.uid
  if (typeof uid !== 'string' || !uid) throw new HttpsError('invalid-argument', 'uid is required.')
  const revoke = req.data?.revoke === true

  let user
  try {
    user = await admin.auth().getUser(uid)
  } catch {
    throw new HttpsError('not-found', 'User not found.')
  }

  let claims
  try {
    claims = nextClaims(user.customClaims, { schoolId: req.data?.schoolId, revoke })
  } catch (e) {
    throw new HttpsError('invalid-argument', e.message)
  }

  await admin.auth().setCustomUserClaims(uid, claims)
  await db.collection('users').doc(uid).set({
    teacherSchoolId: revoke ? admin.firestore.FieldValue.delete() : claims.teacherSchoolId,
  }, { merge: true })
  return { ok: true, teacherSchoolId: revoke ? null : claims.teacherSchoolId }
})

// ── Content site: creator role + article publishing ──────────────────────────
// Spec: docs/superpowers/specs/2026-10-16-content-site-design.md. Creators write
// only `articleDrafts`; `articles` (public) is written exclusively here, so a
// half-edited draft can never go live and slugs are claimed atomically.
const { nextCreatorClaims } = require('./creatorClaims')
const articleLogic = require('./articleLogic')

const PLAIN_SLUG = /^[A-Za-z0-9_-]+$/
const PLAN_ERROR_CODES = new Set(['permission-denied', 'failed-precondition', 'already-exists', 'invalid-argument'])

function requireCreator(req) {
  const uid = requireUid(req)
  const isSuperAdmin = uid === SUPER_ADMIN_UID
  if (!isSuperAdmin && req.auth?.token?.creator !== true) {
    throw new HttpsError('permission-denied', 'Creator access is required.')
  }
  return { uid, isSuperAdmin }
}

// planPublish/planUnpublish throw plain Errors tagged with a code; surface them as HttpsErrors.
function toHttpsError(err) {
  if (err instanceof HttpsError) return err
  if (PLAN_ERROR_CODES.has(err?.code)) {
    return new HttpsError(err.code, err.message, err.errors ? { errors: err.errors } : undefined)
  }
  return err
}

exports.grantCreatorRole = onCall(async (req) => {
  if (req.auth?.uid !== SUPER_ADMIN_UID) {
    throw new HttpsError('permission-denied', 'Only the super-admin can manage creators.')
  }
  const { uid, email } = req.data ?? {}
  const hasUid = typeof uid === 'string' && uid !== ''
  const hasEmail = typeof email === 'string' && email.trim() !== ''
  if (!hasUid && !hasEmail) throw new HttpsError('invalid-argument', 'uid or email is required.')

  let user
  try {
    user = hasUid ? await admin.auth().getUser(uid) : await admin.auth().getUserByEmail(email.trim().toLowerCase())
  } catch {
    throw new HttpsError('not-found', 'User not found.')
  }

  const revoke = req.data?.revoke === true
  await admin.auth().setCustomUserClaims(user.uid, nextCreatorClaims(user.customClaims, { revoke }))
  return { ok: true, uid: user.uid, creator: !revoke }
})

exports.publishArticle = onCall(async (req) => {
  const { uid, isSuperAdmin } = requireCreator(req)
  const draftId = req.data?.draftId
  if (typeof draftId !== 'string' || draftId === '' || draftId.includes('/')) {
    throw new HttpsError('invalid-argument', 'draftId is required.')
  }

  try {
    return await db.runTransaction(async (tx) => {
      const draftRef = db.collection('articleDrafts').doc(draftId)
      const draftSnap = await tx.get(draftRef)
      const draft = draftSnap.exists ? draftSnap.data() : null

      // Reads first: the live doc for the slug this draft would publish to.
      const slug = articleLogic.resolveSlug(draft)
      const liveSnap = PLAIN_SLUG.test(slug) ? await tx.get(db.collection('articles').doc(slug)) : null

      const plan = articleLogic.planPublish({
        draft,
        draftId,
        uid,
        isSuperAdmin,
        existingLive: liveSnap?.exists ? liveSnap.data() : null,
        now: admin.firestore.Timestamp.now(),
      })
      tx.set(db.collection('articles').doc(plan.slug), plan.liveDoc)
      tx.update(draftRef, plan.draftPatch)
      return { ok: true, slug: plan.slug }
    })
  } catch (err) {
    throw toHttpsError(err)
  }
})

exports.unpublishArticle = onCall(async (req) => {
  const { uid, isSuperAdmin } = requireCreator(req)
  const slug = req.data?.slug
  if (typeof slug !== 'string' || !PLAIN_SLUG.test(slug)) throw new HttpsError('invalid-argument', 'slug is required.')

  try {
    await db.runTransaction(async (tx) => {
      const ref = db.collection('articles').doc(slug)
      const snap = await tx.get(ref)
      const live = snap.exists ? snap.data() : null
      articleLogic.planUnpublish({ live, uid, isSuperAdmin })
      const draftRef = live.draftId ? db.collection('articleDrafts').doc(live.draftId) : null
      const draftSnap = draftRef ? await tx.get(draftRef) : null
      tx.delete(ref)
      if (draftSnap?.exists) tx.update(draftRef, { isLive: false })
    })
  } catch (err) {
    throw toHttpsError(err)
  }
  return { ok: true }
})

// ── Account erasure (PDPA) ───────────────────────────────────────────────────
// The signed-in user deletes their OWN account and data. Guards: must have
// signed in within the last 5 minutes (the client re-authenticates first), must
// send confirm:true, and the super-admin account is protected. Auth deletion is
// the last step, so if anything fails the user can sign in and retry.
const { eraseUser } = require('./accountDeletion')
const REAUTH_WINDOW_MS = 5 * 60 * 1000

exports.deleteMyAccount = onCall({ timeoutSeconds: 300 }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')
  if (uid === 'IaltEhO0mPVfK3ng8npr4CdqnEE3') {
    throw new HttpsError('failed-precondition', 'ADMIN_PROTECTED')
  }
  if (req.data?.confirm !== true) throw new HttpsError('invalid-argument', 'CONFIRM_REQUIRED')
  const authTimeMs = Number(req.auth.token?.auth_time) * 1000
  if (!(authTimeMs > 0) || Date.now() - authTimeMs > REAUTH_WINDOW_MS) {
    throw new HttpsError('failed-precondition', 'REAUTH_REQUIRED')
  }
  const counts = await eraseUser({ admin, db, uid })
  return { ok: true, counts }
})
