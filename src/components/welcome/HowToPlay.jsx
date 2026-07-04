const STEPS = [
  { icon: '🧬', th: 'เลือก MBTI คณะ และมหาวิทยาลัยที่สนใจ', desc: 'ตอบคำถามสั้นๆ เพื่อสร้างโปรไฟล์ของคุณ' },
  { icon: '🧭', th: 'ให้ AI สร้าง Roadmap ให้อัตโนมัติ', desc: 'ปรับแต่งเส้นทางเองได้บนผังโหนดแบบลากวาง' },
  { icon: '✅', th: 'ทำภารกิจรายวันที่ AI สร้างให้', desc: 'เก็บ Coins และสร้าง Streak ทุกวันที่เข้าเล่น' },
  { icon: '🌱', th: 'ปลูกผักและตกแต่ง Personal Map', desc: 'สร้างโลกเกมในสไตล์ pixel เป็นของคุณเอง' },
  { icon: '🤝', th: 'แชทและจับคู่เพื่อนที่เข้ากับคุณ', desc: 'ไปเยี่ยม Personal Map ของเพื่อนแบบเรียลไทม์' },
]

export default function HowToPlay() {
  return (
    <section className="px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-10">HOW TO PLAY</h2>
      <ol className="mx-auto max-w-2xl">
        {STEPS.map((s, i) => (
          <li key={s.th} className="relative flex gap-5 pb-10 last:pb-0">
            {i < STEPS.length - 1 && (
              <span className="absolute left-6 top-14 h-full w-0.5 bg-brand/30" aria-hidden="true" />
            )}
            <div className="pixel-font relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-strong text-sm text-white">
              {i + 1}
            </div>
            <div className="neo-card flex-1 p-5">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">{s.icon}</span>
                <p className="thai-font font-bold text-ink">{s.th}</p>
              </div>
              <p className="thai-font text-sm text-ink/70">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
