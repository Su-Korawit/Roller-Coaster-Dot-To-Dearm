const FEATURES = [
  { icon: '🧭', en: 'AI ROADMAP', th: 'วางแผนเส้นทางอนาคตด้วย AI ตั้งแต่สายอาชีพถึงมหาวิทยาลัย' },
  { icon: '🤝', en: 'SOCIAL MATCH', th: 'เชื่อมต่อกับเพื่อนและคู่เรียนที่เข้ากับคุณ' },
  { icon: '🎮', en: 'GAME WORLD', th: 'เรียนรู้และทำภารกิจผ่านโลกเกมแบบ pixel' },
]

export default function FeatureHighlights() {
  return (
    <section className="px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">FEATURES</h2>
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.en} className="neo-card p-6 text-center">
            <div className="text-4xl mb-3" aria-hidden="true">{f.icon}</div>
            <h3 className="pixel-font text-[10px] text-brand-strong mb-2">{f.en}</h3>
            <p className="thai-font text-sm text-ink/70 leading-relaxed">{f.th}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
