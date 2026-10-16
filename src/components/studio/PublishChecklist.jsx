// Thai explanations for the publish checks, keyed by `${field}:${code}`.
const MESSAGES = {
  'title:required': 'ใส่ชื่อบทความก่อนเผยแพร่',
  'title:too_long': 'ชื่อบทความยาวเกิน 120 ตัวอักษร',
  'slug:invalid_slug': 'ลิงก์บทความต้องเป็นตัวอักษรอังกฤษ ตัวเลข หรือ - อย่างน้อย 3 ตัว',
  'category:invalid_category': 'เลือกหมวดหมู่ก่อนเผยแพร่',
  'excerpt:required': 'ใส่คำโปรยก่อนเผยแพร่',
  'excerpt:too_long': 'คำโปรยยาวเกิน 160 ตัวอักษร',
  'coverUrl:required': 'เพิ่มรูปปกก่อนเผยแพร่',
  'coverUrl:invalid_url': 'รูปปกต้องเป็นลิงก์ https',
  'coverAlt:required': 'ใส่คำอธิบายรูปปก',
  'tags:too_many': 'ใช้แท็กได้ไม่เกิน 8 แท็ก',
  'body:body_too_large': 'เนื้อหายาวเกินกำหนด ลองลดรูปหรือแบ่งเป็นหลายบทความ',
  'body:empty_body': 'เขียนเนื้อหาก่อนเผยแพร่',
  'body:image_alt_missing': 'มีรูปในเนื้อหาที่ยังไม่ใส่คำอธิบายรูป',
}

export default function PublishChecklist({ errors }) {
  if (!errors?.length) return null
  return (
    <div role="alert" className="px-card bg-warn p-4">
      <p className="font-bold text-ink mb-2">ยังเผยแพร่ไม่ได้ เหลืออีก {errors.length} เรื่อง</p>
      <ul className="list-disc pl-5 text-sm text-ink flex flex-col gap-1">
        {errors.map((e) => {
          const key = `${e.field}:${e.code}`
          return <li key={key}>{MESSAGES[key] ?? key}</li>
        })}
      </ul>
    </div>
  )
}
