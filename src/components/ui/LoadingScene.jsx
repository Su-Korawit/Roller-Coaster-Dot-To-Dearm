import { useState } from 'react'
import CharacterSprite from './CharacterSprite'
import { LOADING_AD_ENABLED, backdropFor, backdropUrl, tipFor } from './loadingBackdrops'

// Reserved space for a future sponsor banner. Renders nothing until LOADING_AD_ENABLED is true.
function LoadingAdSlot() {
  if (!LOADING_AD_ENABLED) return null
  return <div data-ad-slot="loading" className="w-full max-w-[320px] h-[100px] px-card bg-paper/80 flex items-center justify-center thai-font text-xs text-ink-soft">โฆษณา</div>
}

// Cozy pixel loading screen: a random OS wallpaper as backdrop, a white card, a character
// treading on the spot, a chunky leaf-green block bar and a tip. Used wherever the app waits
// (route boot, game boot, lazy chunks). `compact` drops the card for tiny fallbacks.
export default function LoadingScene({ label = 'Loading...', character = 'INFP', compact = false }) {
  const [seed] = useState(() => Math.floor(Math.random() * 1000))
  const portrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth
  const bg = backdropUrl(backdropFor(seed), portrait)
  return (
    <div
      className="h-full w-full flex flex-col items-center justify-center gap-4 px-6 px-sky-bg bg-cover bg-center"
      style={{ backgroundImage: `url(${bg}), linear-gradient(180deg, #E1F3FB 0%, #F4F1FF 100%)`, imageRendering: 'pixelated' }}
    >
      {compact ? null : (
        <>
          <div className="px-card px-8 py-6 flex flex-col items-center gap-3 animate-pop bg-paper">
            <div aria-hidden="true"><CharacterSprite code={character} scale={3} /></div>
            <span className="pixel-font text-xs text-ink">{label}</span>
            <div className="flex gap-1" role="progressbar" aria-label="กำลังโหลด" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-6 h-3 border-2 border-line bg-leaf animate-block-fill"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
            <p className="thai-font text-xs text-ink-soft text-center max-w-[240px]">{tipFor(seed)}</p>
          </div>
          <LoadingAdSlot />
        </>
      )}
    </div>
  )
}
