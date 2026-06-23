export default function Testimonials({ testimonials }) {
  if (!testimonials?.length) return null
  return (
    <section className="onboarding-bg px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">TESTIMONIALS</h2>
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t) => (
          <figure key={t.id} className="neo-card p-6">
            <div className="flex items-center gap-3">
              {t.avatarUrl ? (
                <img src={t.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white font-bold">
                  {(t.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <figcaption className="thai-font">
                <p className="font-bold text-ink">{t.name}</p>
                <p className="text-xs text-ink/50">{t.role}</p>
              </figcaption>
            </div>
            <blockquote className="thai-font mt-3 text-sm leading-relaxed text-ink/75">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
          </figure>
        ))}
      </div>
    </section>
  )
}
