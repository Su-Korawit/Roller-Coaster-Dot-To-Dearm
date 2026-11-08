// api/_voice/persona.js — what the secretary is for on each kind of call. Pure, no I/O.
//
// Two different calls, two different jobs:
//   outbound_reminder  SHE calls the student at the time they chose: remind, inform, check in, confirm the next call.
//   inbound_support    the STUDENT calls her: usually stressed, stuck or wanting to move things. Listen first.
//   inbound_unknown    someone dials the phone number but we cannot serve them (number not registered, no consent, quota): explain once, end politely.
// The Retell agent prompt (docs/voice-prompt.md) reads these as {{call_mode}}, {{call_goal}}, {{opening}},
// {{secretary_name}}, {{student_name}}, {{study_plan}} and {{student_context}}.
import { SECRETARIES } from '../../src/constants/secretaries.js'

export const CALL_MODES = ['outbound_reminder', 'inbound_support', 'inbound_unknown']

export const CALL_GOALS = {
  outbound_reminder:
    'พี่เป็นฝ่ายโทรหาน้องตามเวลาที่น้องนัดไว้ หน้าที่: (1) ทักทายสั้นๆ (2) เตือนและแจ้งสิ่งสำคัญของวันนี้ เช่น งานในแผนที่ยังค้าง วันสมัครหรือวันสอบที่ใกล้ถึง (3) ถามว่าติดตรงไหนไหม (4) ย้ำนัดโทรครั้งถัดไป ถ้าน้องบอกเวลาใหม่ให้ทวนเวลา HH:MM (5) จบสายภายใน 3 นาที ไม่ซักไซ้ ไม่กดดัน ถ้าน้องไม่สะดวกให้ขอบคุณแล้ววางสาย',
  inbound_support:
    'น้องเป็นฝ่ายโทรหาพี่เอง น่าจะมีเรื่องอยากปรึกษา หน้าที่: (1) ฟังก่อน อย่าเพิ่งแนะนำ (2) ถ้าน้องเครียดหรือท้อ ให้รับฟัง พูดให้เบาลง แล้วช่วยแบ่งงานให้เล็กลง (3) ถ้าอยากเลื่อนนัดหรือเลื่อนแผน ช่วยหาวันและเวลาใหม่ แล้วทวนให้ชัด (4) เก็บข้อมูลที่ยังขาดทีละข้อ เช่น เป้าหมาย วิชาที่กังวล เวลาที่ว่าง อย่าถามรัว (5) ถ้ามีสัญญาณวิกฤต เช่น พูดถึงการทำร้ายตัวเอง ให้ใจเย็น ชวนคุยกับผู้ใหญ่ที่ไว้ใจ และแนะนำสายด่วนสุขภาพจิต 1323 (โทรฟรี 24 ชั่วโมง)',
}

CALL_GOALS.inbound_unknown =
  'สายนี้ยังให้บริการไม่ได้ (ดูเหตุผลใน student_context) หน้าที่: (1) ทักทายสั้นๆ (2) บอกเหตุผลตามที่ระบุ และบอกวิธีแก้: เปิดแอป Secretary ที่ ilovetcas.com ไปที่ Settings แท็บ พี่ใจดี กดยินยอมและบันทึกเบอร์โทรนี้ แล้วโทรมาใหม่ (3) ไม่ถามข้อมูลส่วนตัว ไม่เรียกฟังก์ชันใดๆ (4) ขอบคุณและวางสายภายใน 1 นาที'

export const OPENINGS = {
  outbound_reminder: (secretary, student) => `สวัสดีค่ะ ${student} พี่${secretary.replace(/^พี่/, '')} เลขา AI โทรมาตามเวลาที่นัดกันไว้นะคะ ตอนนี้สะดวกคุยสั้นๆ ไหมคะ`,
  inbound_support: (secretary, student) => `สวัสดีค่ะ ${student} พี่${secretary.replace(/^พี่/, '')} เลขา AI เองค่ะ วันนี้มีอะไรอยากเล่าให้พี่ฟังไหมคะ`,
  inbound_unknown: (secretary) => `สวัสดีค่ะ พี่${secretary.replace(/^พี่/, '')} เลขา AI ของ I LOVE TCAS ค่ะ`,
}

export const DEFAULT_SECRETARY = SECRETARIES[0]

export function secretaryName(id) {
  return (SECRETARIES.find((s) => s.id === id) ?? DEFAULT_SECRETARY).name
}

export const validSecretaryId = (id) => (SECRETARIES.some((s) => s.id === id) ? id : DEFAULT_SECRETARY.id)
