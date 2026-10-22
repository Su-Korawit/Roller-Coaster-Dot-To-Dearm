export default function FaqSection({ faq, loading }) {
  if (loading) {
    return (
      <section className="px-6 py-14">
        <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">FAQ</h2>
        <div className="mx-auto max-w-3xl space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="mt-3 h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      </section>
    )
  }
  if (!faq?.length) return null
  return (
    <section className="px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">FAQ</h2>
      <div className="mx-auto max-w-3xl space-y-3">
        {faq.map((item) => (
          <details key={item.id} className="px-card p-4">
            <summary className="thai-font cursor-pointer font-bold text-ink">{item.q}</summary>
            <p className="thai-font mt-2 text-sm leading-relaxed text-ink/70">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
