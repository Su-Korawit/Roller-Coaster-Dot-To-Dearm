export default function GamePreview({ gamePreview }) {
  if (!gamePreview?.mediaUrl) return null
  const { mediaUrl, mediaType } = gamePreview

  return (
    <section className="px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">GAME PREVIEW</h2>
      <div className="mx-auto max-w-3xl neo-card overflow-hidden p-2">
        {mediaType === 'video' ? (
          <video
            src={mediaUrl}
            className="w-full rounded-xl"
            autoPlay loop muted playsInline
          />
        ) : (
          <img src={mediaUrl} alt="ตัวอย่างเกมในแอป" className="w-full rounded-xl" />
        )}
      </div>
    </section>
  )
}
