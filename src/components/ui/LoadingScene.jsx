import CharacterSprite from './CharacterSprite'

// Cozy pixel loading screen: sky-to-meadow backdrop, a white card, a character
// treading on the spot and a chunky leaf-green block bar. Used wherever the app waits
// (route boot, game boot, lazy chunks). `compact` drops the card for tiny fallbacks.
export default function LoadingScene({ label = 'Loading...', character = 'INFP', compact = false }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center px-6 px-sky-bg">
      {compact ? null : (
        <div className="px-card px-8 py-6 flex flex-col items-center gap-3 animate-pop">
          <div aria-hidden="true"><CharacterSprite code={character} scale={3} /></div>
          <span className="pixel-font text-[10px] text-ink">{label}</span>
          <div className="flex gap-1" role="progressbar" aria-label="กำลังโหลด" aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-6 h-3 border-2 border-line bg-leaf animate-block-fill"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
