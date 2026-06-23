export default function StatsSection({ stats }) {
  if (!stats?.length) return null
  return (
    <section className="px-6 py-12">
      <div className="mx-auto grid max-w-4xl gap-4 grid-cols-2 md:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="neo-card p-5 text-center">
            <p className="pixel-font text-base md:text-xl text-accent-pink">{s.value}</p>
            <p className="thai-font mt-1 text-xs text-ink/60">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
