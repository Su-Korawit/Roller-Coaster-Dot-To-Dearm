const STEPS = [
  { icon: '🧬', th: 'เลือก MBTI คณะ และมหาวิทยาลัยที่สนใจ', desc: 'ตอบคำถามสั้นๆ เพื่อสร้างโปรไฟล์ของคุณ' },
  { icon: '🧭', th: 'ให้ AI ช่วยร่าง Roadmap ก่อน', desc: 'แล้วค่อยลากวางโหนดแก้เองบนผัง' },
  { icon: '✅', th: 'ทำภารกิจรายวันที่ได้จากแผน', desc: 'เก็บ Coins และต่อ Streak ทุกวันที่เข้าเล่น' },
  { icon: '🌱', th: 'ปลูกผักและแต่ง Personal Map', desc: 'สร้างมุมเกม pixel เป็นของคุณเอง' },
  { icon: '🤝', th: 'แชทและจับคู่เพื่อนที่เป้าใกล้กัน', desc: 'แวะ Personal Map ของเพื่อนได้แบบเรียลไทม์' },
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
