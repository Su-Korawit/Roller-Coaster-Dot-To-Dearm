# เลขา AI "พี่ใจดี" (Retell) — วิธีรันและเปิดใช้งาน

## โครงสร้าง
- `api/voice.js` — Vercel entry เดียว: `status consent revoke stop resume phone schedule web-call webhook inbound tool dial-due`
- `api/_voice/` — logic (`logic.js` กฎความยินยอม/ทดลอง/โควตา/เพดาน), `store.js` (Firestore transaction), `retell.js`, `handler.js`, `payments.js` (ช่องว่างรอผู้ให้บริการจ่ายเงิน)
- Client: `src/services/voiceSecretary.js`, `voiceCall.js`, `src/components/voice/VoiceSecretaryPanel.jsx` (แท็บ "พี่ใจดี" ใน Settings)
- Firestore: `voiceSecretary/{uid}` (server เขียนเท่านั้น, client อ่านของตัวเอง), `voiceGlobal/{วัน}` (ปิดทั้งหมด)

## ตัวแปร .env (ฝั่งเซิร์ฟเวอร์เท่านั้น ห้ามขึ้นต้น VITE_)
| ตัวแปร | ความหมาย |
|---|---|
| `RETELL_API_KEY` | คีย์ Retell (ห้าม commit/ห้ามพิมพ์) |
| `RETELL_AGENT_ID` | เช่น `agent_10815e6801c2626ecef1cb22ae` |
| `RETELL_FROM_NUMBER` | เบอร์โทรออก `+13192641997` |
| `TEST_PHONE_OWN` | เบอร์ของเจ้าของเอง ใช้ทดสอบโทรออก |
| `DIALING_ENABLED` | `true` เท่านั้นถึงจะโทรจริง (ค่าเริ่มต้น false) |
| `DIAL_ONLY_TEST_PHONE` | ค่าเริ่มต้น true = โทรได้เฉพาะ `TEST_PHONE_OWN`; ตั้ง `false` เมื่อเปิดโทรจริงให้นักเรียน |
| `CRON_SECRET` | ใช้ยืนยัน `POST /api/voice/dial-due` |
| `FIREBASE_SERVICE_ACCOUNT` | JSON service account (ใน Vercel env) ให้ firebase-admin |
| `VOICE_*` | เพดาน: `VOICE_TRIAL_WEB_SECONDS` (600), `VOICE_TRIAL_WEB_SECONDS_PER_DAY` (300), `VOICE_PAID_WEB_SECONDS_PER_DAY` (900), `VOICE_WEB_CALL_SECONDS` (180), `VOICE_PHONE_CALLS_PER_DAY` (1), `VOICE_PHONE_CALL_SECONDS` (300), `VOICE_GLOBAL_DAILY_CALLS` (20), `VOICE_GLOBAL_DAILY_SECONDS` (3600) |

## รันในเครื่อง
```bash
npm run dev
```
ไม่มี `RETELL_API_KEY` = โหมดจำลอง (UI ขึ้นป้าย "โหมดทดลอง", ไม่มีเสียงจริง, ไม่หักโควตา) ใน production ที่ไม่มีคีย์ endpoint จะตอบ 503
`/api/*` ของ Vercel ต้องรันด้วย `vercel dev` (Vite dev ไม่เสิร์ฟ `/api`)

## Web Call (เปิดก่อน)
1. ใน Retell dashboard: ตั้งชื่อ agent "พี่ใจดี - เลขา AI", publish เวอร์ชันล่าสุด, ตั้ง **max call duration ≤ `VOICE_WEB_CALL_SECONDS`** (โควตาถูกจองเท่าค่านี้), ผูกเบอร์ +1 319 264-1997 ให้รับสาย/โทรออกกับ agent นี้
2. ตั้ง webhook ของ agent ไป `https://<โดเมน>/api/voice/webhook` (events: call_ended, call_analyzed)
3. (ไม่บังคับ) ให้ post-call analysis ดึง `callback_time` (HH:MM) เพื่ออัปเดตเวลาโทรกลับ
4. ตั้ง env ข้างบนใน Vercel แล้ว deploy (ต้อง HTTPS สำหรับไมค์)

## เปิดโหมดโทรจริง (ตามลำดับ ห้ามข้าม)
1. ทบทวนข้อความ PDPA/ผู้ปกครองกับผู้เชี่ยวชาญ (ดู DECISIONS.md: ผู้ใช้ <20 ปี, ช่องยินยอมแยกสำหรับเบอร์โทร)
2. ทดสอบกับเบอร์ตัวเอง: ตั้ง `TEST_PHONE_OWN`, `DIALING_ENABLED=true`; ใน Firestore ตั้ง `voiceSecretary/<uid ตัวเอง>.paid = true` (ยังไม่มีระบบจ่ายเงิน); ตั้งเวลาในแท็บ "พี่ใจดี" หรือยิง `POST /api/voice/dial-due` ด้วย `Authorization: Bearer $CRON_SECRET` และ body `{"uid":"<uid>"}` (ข้ามเวลานัด แต่ยังผ่านด่านยินยอม/โควตา/เพดาน/ช่วงเวลา 09-20)
3. ตั้งตัวเรียก `dial-due` ทุก ~15 นาที (Vercel Pro cron หรือ scheduler ภายนอก; Hobby ทำได้แค่วันละครั้ง จึงยังไม่ใส่ใน vercel.json)
4. ต่อระบบจ่ายเงินให้ตั้ง `paid` ผ่าน webhook ที่ตรวจแล้วเท่านั้น (`api/_voice/payments.js`) แล้วค่อยตั้ง `DIAL_ONLY_TEST_PHONE=false`

## โทรเบอร์ตรง (inbound) และฟังก์ชันระหว่างสาย
น้องโทร `RETELL_FROM_NUMBER` จากเบอร์ที่บันทึกไว้ในแท็บ "พี่ใจดี" แล้วพี่จะรู้ว่าเป็นใคร รู้แผน และทำงานให้ได้

- `POST /api/voice/inbound` (Retell inbound webhook, ตรวจลายเซ็น): หาบัญชีจากเบอร์ผู้โทร (ต้องมีบัญชีเดียวต่อเบอร์) → ผ่านด่านเดียวกับ Web Call (ยินยอม, หยุดรับสาย, โควตา/ทดลอง, เพดานรวม) → ตอบ `dynamic_variables` (ชื่อ แผน `student_context`) และ `metadata {uid, callKey}`. เบอร์ไม่รู้จักหรือถูกบล็อก → โหมด `inbound_unknown` พี่บอกวิธีผูกเบอร์แล้ววางสาย
- `POST /api/voice/tool` (Retell custom function, ตรวจลายเซ็น): uid มาจาก `call.metadata` เท่านั้น และสายต้องมีการจองโควตาที่ยังไม่ปิด (≤ 40 นาที) ฟังก์ชัน: `get_schedule` (ตารางงานวัน/พรุ่งนี้), `get_admission_news` (ปฏิทิน TCAS70 ที่ฝังในแอป ไม่ใช่ข้อมูลสด), `add_task`, `move_tasks`, `complete_task` ทำงานกับ `users/{uid}.os.tasks` ใน transaction แล้วเพิ่ม `osVoiceRev` ให้หน้า OS ที่เปิดอยู่โหลดแผนใหม่ทันที (`src/os/useVoiceSync.js`) ใช้ได้ทั้งสายโทรเข้า Web Call และสายที่พี่โทรออก
- logic ล้วน: `api/_voice/tools.js` (+ `TOOL_DEFS` ที่ใช้สร้างฟังก์ชันบน Retell)

ติดตั้งบน Retell (หลัง deploy โค้ดขึ้น Vercel แล้ว, ทำตามลำดับ, แต่ละคำสั่งรัน dry run ก่อน):
```bash
node scripts/setupRetellInbound.mjs            # ดู webhook ปัจจุบันของเบอร์
node scripts/setupRetellInbound.mjs --apply    # ตั้ง inbound_webhook_url = <VOICE_PUBLIC_BASE>/api/voice/inbound
node scripts/updateRetellPrompt.mjs            # ดู prompt + ฟังก์ชัน + function node ที่จะติดตั้ง
node scripts/updateRetellPrompt.mjs --apply    # ติดตั้งลง agent เป็นเวอร์ชันร่างแล้ว publish
```
ใน dashboard ต้องใช้ API key ที่มีป้าย webhook (Retell ตรวจลายเซ็นด้วยคีย์นั้น) และ Inbound Call Agent ของเบอร์ต้องเป็นพี่ใจดี (ตั้งไว้แล้ว) ข้อจำกัด: เบอร์ในแอปยังไม่ยืนยันด้วย SMS OTP และ caller ID ปลอมได้ ฟังก์ชันจึงจำกัดแค่อ่านแผนและแก้งาน ก่อนเปิดสาธารณะให้เพิ่มการยืนยันเบอร์

## ความปลอดภัยที่บังคับฝั่งเซิร์ฟเวอร์
uid มาจาก Firebase ID token เท่านั้น · ยินยอม/โควตา/เพดาน/เบอร์ ตรวจใน Firestore transaction (จองก่อน คืนส่วนเหลือตอน webhook) · webhook ตรวจลายเซ็น Retell · ไม่เก็บเสียง/ทรานสคริปต์ (เก็บเฉพาะสถานะสายและเวลานัด) · "ถอนความยินยอม" ลบเบอร์+เวลานัด · "หยุดรับสาย" มีผลทันที
