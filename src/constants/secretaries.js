// The secretaries a student can pick from (all women, one older-sister voice each). The picture lives at
// /assets/os/secretary/<id>.webp; the server (api/_voice/persona.js) uses the same ids and names, so the
// phone/web call introduces herself with the name the student chose.
export const SECRETARIES = [
  { id: 'jaidee',  name: 'พี่ใจดี',   blurb: 'อบอุ่น ใจเย็น ให้กำลังใจเก่ง (คนเดิมที่คุ้นกัน)' },
  { id: 'fasai',   name: 'พี่ฟ้าใส',  blurb: 'เป๊ะ เรียบร้อย ชอบวางแผนเป็นขั้นตอน' },
  { id: 'mali',    name: 'พี่มะลิ',   blurb: 'อ่อนโยน ฟังเก่ง เหมาะตอนเครียดหรือท้อ' },
  { id: 'baitoey', name: 'พี่ใบเตย',  blurb: 'คล่องแคล่ว เก่งจัดตารางและเลื่อนนัด' },
  { id: 'dao',     name: 'พี่ดาว',    blurb: 'สดใส ชวนลุย ชอบตั้งเป้าเล็กๆ ทุกวัน' },
  { id: 'namfon',  name: 'พี่น้ำฝน',  blurb: 'สุภาพ สงบ ใจดี พูดช้าๆ ชัดๆ' },
]

export const DEFAULT_SECRETARY_ID = 'jaidee'

export const secretaryById = (id) => SECRETARIES.find((s) => s.id === id) ?? SECRETARIES[0]
