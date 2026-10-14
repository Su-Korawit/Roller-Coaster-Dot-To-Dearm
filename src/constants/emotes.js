// Preset emotes for School Server rooms (ADR 0018). Free-text chat is deliberately
// absent in rooms (minors, no moderation yet), so this is the whole vocabulary.
// Presence carries only the `id`; the glyph is resolved locally. Keep ids in step
// with the `emote` validation in database.rules.json (^[a-z]{1,12}$).
export const EMOTES = [
  { id: 'wave',   glyph: '👋', label: 'สวัสดี' },
  { id: 'fight',  glyph: '💪', label: 'สู้ ๆ' },
  { id: 'book',   glyph: '📚', label: 'อ่านหนังสือ' },
  { id: 'coffee', glyph: '☕', label: 'พักหน่อย' },
  { id: 'heart',  glyph: '💖', label: 'เป็นกำลังใจ' },
  { id: 'sleepy', glyph: '😴', label: 'ง่วง' },
  { id: 'party',  glyph: '🎉', label: 'ยินดีด้วย' },
  { id: 'think',  glyph: '🤔', label: 'งง' },
]

export const EMOTE_BY_ID = Object.fromEntries(EMOTES.map((e) => [e.id, e]))
export const EMOTE_DURATION_MS = 4000
