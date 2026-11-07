// Story intros shown the first time Goal / Habit / Community are opened in a session.
// `steps` are the captions; the scene gets pose = step + 1 (pose 0 is the starting frame).

export const STEP_MS = 2200
export const FIRST_FRAME_MS = 80    // starting frame is shown this long, so the first move animates
export const END_HOLD_MS = 1400     // last caption stays this long before the app opens

export const INTROS = {
  goal: {
    title: 'Goal',
    steps: ['ทุกคนเริ่มจากกล่องที่ตัวเองยืนอยู่', 'แล้วก้าวออกมาทีละก้าว', 'จนมองเห็นเป้าหมายของเรา'],
  },
  habit: {
    title: 'Habit',
    steps: ['ก้าวไปทีละวัน', 'บางวันก็สะดุดล้มบ้าง', 'แต่ลุกขึ้นมาใหม่ได้เสมอ', 'จนข้ามผ่านไปได้'],
  },
  community: {
    title: 'Community',
    steps: ['บางทีเราก็ติดอยู่คนเดียว', 'แล้วเพื่อนก็เดินเข้ามา', 'ช่วยกันดึงขึ้นมา', 'แล้วไปต่อด้วยกัน'],
  },
  reading: {
    title: 'Reading',
    steps: ['เริ่มจากนั่งลงที่โต๊ะ', 'เปิดหนังสือ แล้วจับเวลา', 'อ่านไปเรื่อยๆ จนครบเวลา'],
  },
  secretary: {
    title: 'Secretary',
    steps: ['พี่ใจดีรออยู่ตรงนี้แล้ว', 'พี่ตามงานที่ยังไม่ได้ทำให้', 'จนทำเสร็จครบทุกข้อ'],
  },
  report: {
    title: 'Report',
    steps: ['มีไอเดียอยากได้แอปใหม่', 'ส่งเข้ากล่องคำขอ', 'เพื่อนๆ ช่วยกันโหวต', 'แล้วแอปใหม่ก็เกิดขึ้น'],
  },
}

const seen = new Set()
export const hasSeenIntro = (id) => seen.has(id)
export const markIntroSeen = (id) => { seen.add(id) }
export const resetIntrosForTest = () => seen.clear()

// Plays once per session, only for apps that define one, and never with reduced motion.
export function shouldPlayIntro(app, reducedMotion = false) {
  return !!app?.intro && !!INTROS[app.intro] && !reducedMotion && !hasSeenIntro(app.intro)
}

// Total time of an intro in ms (for tests and the progress bar).
export const introDuration = (id) => FIRST_FRAME_MS + (INTROS[id]?.steps.length ?? 0) * STEP_MS + END_HOLD_MS
