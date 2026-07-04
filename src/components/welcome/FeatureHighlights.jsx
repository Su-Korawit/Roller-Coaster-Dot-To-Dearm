const FEATURES = [
  {
    icon: '🧭',
    en: 'AI ROADMAP',
    th: 'วางแผนเส้นทางอนาคตด้วย AI',
    points: [
      'AI สร้างเส้นทางสายอาชีพและสายมหาวิทยาลัยให้อัตโนมัติ',
      'ปรับแต่งเส้นทางเองได้บนผังโหนดแบบลากวาง',
      'รับภารกิจรายวันจาก AI เพื่อเดินตามแผนทีละก้าว',
    ],
  },
  {
    icon: '🤝',
    en: 'SOCIAL MATCH',
    th: 'จับคู่เพื่อนที่เข้ากับคุณ',
    points: [
      'คำนวณ Match Score จากคณะ MBTI และมหาวิทยาลัยที่เลือก',
      'แชทและสะสม Stack ทุกวันเพื่อจัดอันดับเพื่อนสนิท',
      'ไปเยี่ยม Personal Map ของเพื่อนแบบเรียลไทม์',
    ],
  },
  {
    icon: '🎮',
    en: 'GAME WORLD',
    th: 'โลกเกมของคุณเอง',
    points: [
      'ปลูกผักและตกแต่ง Personal Map ในสไตล์ pixel',
      'เก็บ Coins และสร้าง Streak จากการเล่นทุกวัน',
      'สำรวจแมพเพื่อนและร้านค้าในโลกเกม',
    ],
  },
]

export default function FeatureHighlights() {
  return (
    <section className="px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-3">FEATURES</h2>
      <p className="thai-font text-center text-sm text-ink/60 mb-10">
        ทุกฟีเจอร์ที่ช่วยให้คุณวางแผนอนาคตไปพร้อมกับความสนุก
      </p>
      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div key={f.en} className={`neo-card p-6 ${i === 1 ? 'sm:mt-6' : ''}`}>
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
              style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-accent-pink))' }}
              aria-hidden="true"
            >
              {f.icon}
            </div>
            <h3 className="pixel-font text-[10px] text-brand-strong mb-1">{f.en}</h3>
            <p className="thai-font font-bold text-ink mb-3">{f.th}</p>
            <ul className="thai-font space-y-1.5 text-sm text-ink/70">
              {f.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-brand-strong" aria-hidden="true">▸</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
