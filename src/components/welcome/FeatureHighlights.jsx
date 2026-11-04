const FEATURES = [
  {
    icon: '🧭',
    en: 'AI ROADMAP',
    th: 'วางแผนเส้นทางด้วย AI',
    points: [
      'AI ช่วยร่างเส้นทางเข้าคณะและสายอาชีพให้ก่อน แล้วค่อยแก้เอง',
      'ลากวางโหนดบนผังได้ตามที่อยากได้',
      'มีภารกิจรายวันให้เดินตามแผนทีละก้าว',
    ],
  },
  {
    icon: '🤝',
    en: 'SOCIAL MATCH',
    th: 'หาเพื่อนที่เป้าใกล้กัน',
    points: [
      'Match Score จากคณะ MBTI และมหาวิทยาลัยที่เลือก',
      'แชทและสะสม Stack ทุกวัน ดูอันดับเพื่อนสนิท',
      'แวะ Personal Map ของเพื่อนได้แบบเรียลไทม์',
    ],
  },
  {
    icon: '🎮',
    en: 'GAME WORLD',
    th: 'โลกเกมเล็กๆ ของคุณ',
    points: [
      'ปลูกผักและแต่ง Personal Map สไตล์ pixel',
      'เก็บ Coins และต่อ Streak จากการเข้าเล่น',
      'เดินสำรวจแมพเพื่อนและร้านค้าในโลกเกม',
    ],
  },
]

export default function FeatureHighlights() {
  return (
    <section className="px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-3">FEATURES</h2>
      <p className="thai-font text-center text-sm text-ink/60 mb-10">
        สิ่งที่อยู่ในแอปเต็ม ใช้คู่กับการเตรียมสอบได้จริง
      </p>
      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div key={f.en} className={`px-card p-6 ${i === 1 ? 'sm:mt-6' : ''}`}>
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
              style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-accent-pink))' }}
              aria-hidden="true"
            >
              {f.icon}
            </div>
            <h3 className="pixel-font text-xs text-brand-strong mb-1">{f.en}</h3>
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
