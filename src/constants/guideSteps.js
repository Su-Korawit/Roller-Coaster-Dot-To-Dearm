// The Guide's steps, in order. A step finishes only when the student does the thing (`doneOn`
// is the event they cause). `available(ctx)` says whether the step can happen at all for this
// student right now; unavailable steps are skipped, so nobody is ever stuck on one they cannot do.
//   ctx = { signedIn, practiceDone, hasPurchased, canAffordSomething, hasUnplacedItem,
//           hasCustomRoom, places }
export const GUIDE_STEPS = [
  {
    id: 'practice',
    target: '[data-guide="slot-focus"]',
    action: 'practice', // the bubble offers a button that starts the practice session
    doneOn: 'practiced',
    textTh: 'แตะนาฬิกา แล้วลองโฟกัส 1 นาที รับของขวัญ 10 ใบไม้',
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
    // Owned by the TCAS Plan sub-project; never available until that ships.
    id: 'plan',
    target: '[data-guide="slot-plan"]',
    doneOn: 'planned',
    textTh: 'เพิ่มคณะที่สนใจลงในแผนของคุณ',
    available: () => false,
  },
]

// Index of the first available step at or after `from`, or GUIDE_STEPS.length when none is left.
export function nextAvailable(from, ctx) {
  for (let i = Math.max(0, from); i < GUIDE_STEPS.length; i += 1) {
    if (GUIDE_STEPS[i].available(ctx)) return i
  }
  return GUIDE_STEPS.length
}
