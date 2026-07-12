const GROUPS = [
  { icon: '🎓', en: 'STUDENTS', th: 'นักเรียน / นักศึกษา', desc: 'หาทิศทางตัวเอง วางแผนเข้ามหาวิทยาลัย และดูสายอาชีพ' },
  { icon: '💼', en: 'WORKERS', th: 'คนทำงาน', desc: 'วางแผนอัปสกิลและเติบโตในสายงาน', soon: true },
  { icon: '🌱', en: 'DAILY LIFE', th: 'ชีวิตประจำวัน', desc: 'ตั้งเป้าหมายเล็กๆ ทำภารกิจ และสร้างนิสัยทีละวัน' },
]

export default function HowItWorks() {
  return (
    <section className="onboarding-bg px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">HOW IT WORKS</h2>
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-3">
        {GROUPS.map((g) => (
          <div key={g.en} className="neo-card relative p-6 text-center">
            {g.soon && (
              <span className="pixel-font absolute right-3 top-3 text-[7px] text-white bg-brand px-2 py-1 rounded-full">
                SOON
              </span>
            )}
            <div className="text-4xl mb-3" aria-hidden="true">{g.icon}</div>
            <h3 className="pixel-font text-[10px] text-accent-pink mb-1">{g.en}</h3>
            <p className="thai-font font-bold text-ink mb-1">{g.th}</p>
            <p className="thai-font text-sm text-ink/70 leading-relaxed">{g.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
