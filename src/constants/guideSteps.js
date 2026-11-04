// The Guide's steps, in order. A step finishes only when the student does the thing (`doneOn`
// is the event they cause). `available(ctx)` says whether the step can happen at all for this
// student right now; unavailable steps are skipped, so nobody is ever stuck on one they cannot do.
//   ctx = { signedIn, practiceDone, hasPurchased, canAffordSomething, hasUnplacedItem,
//           hasCustomRoom, places, hasCampus }
export const GUIDE_STEPS = [
  {
    id: 'practice',
    target: null, // no spotlight: the bubble's own button starts the practice (the clock slot opens the normal setup)
    action: 'practice',
    doneOn: 'practiced',
    textTh: 'ลองโฟกัส 1 นาทีกับเรา แล้วรับของขวัญ 10 ใบไม้',
    available: (c) => c.signedIn && !c.practiceDone,
  },
  {
    id: 'buy',
    target: '[data-guide="slot-shop"]',
    doneOn: 'bought',
    textTh: 'เปิดร้านค้า แล้วซื้อของชิ้นแรกของคุณ',
    available: (c) => c.signedIn && !c.hasPurchased && c.canAffordSomething,
  },
  {
    id: 'decorate',
    target: '[data-guide="decorate"]',
    fallbackTarget: '[data-guide="slot-shop"]', // the decorate button lives inside the shop sheet
    doneOn: 'placed',
    textTh: 'กด “แต่งห้อง” เลือกของที่ซื้อ แล้วแตะที่ห้องเพื่อวาง',
    available: (c) => c.signedIn && !c.hasCustomRoom && c.hasUnplacedItem,
  },
  {
    id: 'warp',
    target: '[data-guide="slot-warp"]',
    doneOn: 'warped',
    textTh: 'ลองวาร์ปไปที่อื่นดู แล้วกลับมาที่ห้องได้ทุกเมื่อ',
    available: (c) => c.places > 1,
  },
  {
    // Plans are filled from the Open House campus, so the step exists only where the campus does.
    id: 'plan',
    target: '[data-guide="slot-plan"]',
    doneOn: 'planned',
    textTh: 'เพิ่มคณะที่สนใจลงในแผนของคุณ',
    available: (c) => !!c.hasCampus,
  },
]

// Index of the first available step at or after `from`, or GUIDE_STEPS.length when none is left.
export function nextAvailable(from, ctx) {
  for (let i = Math.max(0, from); i < GUIDE_STEPS.length; i += 1) {
    if (GUIDE_STEPS[i].available(ctx)) return i
  }
  return GUIDE_STEPS.length
}
