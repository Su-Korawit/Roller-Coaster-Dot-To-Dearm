import { useEffect } from 'react'
import Button from '../components/ui/Button'
import PanelHeader from '../components/ui/PanelHeader'
import LevelBadge from '../components/hud/LevelBadge'
import EmoteWheel from '../components/school/world/EmoteWheel'
import FocusPanel from '../components/school/world/FocusPanel'
import SceneBackdrop from '../components/landing/SceneBackdrop'
import CharacterSprite from '../components/ui/CharacterSprite'
import TemperamentCard from '../components/profile/TemperamentCard'
import LoadingScene from '../components/ui/LoadingScene'
import { useSchoolWorldStore } from '../stores/useSchoolWorldStore'
import { useUserStore } from '../stores/useUserStore'

// DEV-ONLY living style guide for the cozy pixel RPG theme (route /dev/ui, not
// registered in production builds). One screen to eyeball every shared surface,
// so a theme change can be judged without logging in and walking to each panel.

const SWATCHES = [
  ['brand', '#8a4a70'], ['brand-strong', '#713970'], ['accent-pink', '#bd757e'], ['ink', '#4b3340'],
  ['paper', '#f3e5c2'], ['surface', '#f8efd6'], ['hud', '#e8cfa6'], ['wood', '#dcb98a'],
  ['wood-dark', '#c49a6c'], ['edge', '#90625d'], ['lime', '#c0d470'], ['good', '#7ea04a'],
  ['warn', '#d99b3b'], ['danger', '#b4533f'],
]

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="pixel-font text-[10px] text-ink mb-3">{title}</h2>
      {children}
    </section>
  )
}

export default function DevUiKit() {
  useEffect(() => {
    useUserStore.setState({ focusXp: 400 })
    useSchoolWorldStore.getState().setFocus({
      status: 'active', startedAt: Date.now(), lastCheckInAt: Date.now() - 9 * 60000,
      verifiedMs: 95 * 60000, xpThisSession: 95, temperament: 'NF', lastResult: { multiplier: 1.1 },
    })
  }, [])

  return (
    <div className="bg-paper text-ink thai-font overflow-y-auto" style={{ height: '100dvh' }}>
      <div className="mx-auto max-w-3xl p-5">
        <h1 className="pixel-font pixel-title text-lg mb-6">UI KIT · Cozy Pixel RPG</h1>

        <Section title="PALETTE">
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {SWATCHES.map(([name, hex]) => (
              <div key={name} className="text-center">
                <div className="h-10 rounded border-2 border-edge" style={{ background: hex }} />
                <div className="text-[10px] mt-1">{name}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="BUTTONS">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="w-44"><Button>เริ่มเล่น (primary)</Button></div>
            <div className="w-44"><Button variant="secondary">ยกเลิก (secondary)</Button></div>
            <button className="neo-btn rpg-btn-danger px-4 h-11 rounded-xl font-bold">ลบบัญชี</button>
            <button className="neo-btn bg-hud w-12 h-12 rounded-lg" aria-label="icon">🎒</button>
            <button className="neo-btn bg-hud w-12 h-12 rounded-full" aria-label="icon">⭐</button>
          </div>
        </Section>

        <Section title="PANELS">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="neo-card p-4"><b>neo-card</b><p className="text-xs mt-1">กระดาษพาร์ชเมนต์ กรอบพลัมนูน</p></div>
            <div className="neo-slab p-4"><b>neo-slab</b><p className="text-xs mt-1">แผ่นไม้สำหรับ HUD</p></div>
            <div className="neo-card p-4">
              <b>neo-input</b>
              <input className="neo-input w-full mt-2 px-3 h-10 text-sm" placeholder="พิมพ์ที่นี่" />
            </div>
          </div>
        </Section>

        <Section title="BARS · LEVEL COIN">
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <span className="rpg-coin pixel-font text-[10px]">7</span>
              <div className="rpg-bar flex-1" style={{ '--pct': 62 }}><i /></div>
            </div>
            <div className="rpg-bar rpg-bar--heart" style={{ '--pct': 35 }}><i /></div>
            <div className="relative w-12 h-12">
              <div className="neo-btn w-12 h-12 rounded-full bg-hud flex items-center justify-center">🙂</div>
              <LevelBadge xp={400} />
            </div>
          </div>
        </Section>

        <Section title="HUD">
          <div className="relative h-24 overflow-hidden rounded-lg border-2 border-edge">
            <SceneBackdrop clouds={false} />
            <div className="relative z-10 flex items-center justify-between p-3">
              <div className="relative">
                <div className="neo-btn w-10 h-10 rounded-full bg-hud flex items-center justify-center">🙂</div>
                <LevelBadge xp={400} />
              </div>
              <div className="neo-slab flex items-center gap-3 px-4 py-1.5 pixel-font text-[11px]">
                <span>🔥 12</span><span>🪙 340</span><span>🌾 85g</span>
              </div>
            </div>
          </div>
        </Section>

        <Section title="PANEL HEADER · FOCUS PANEL (live component)">
          <div className="relative h-[34rem] overflow-hidden rounded-lg border-2 border-edge bg-black/20">
            <FocusPanel seatId="lib-3" onClose={() => {}} />
          </div>
        </Section>

        <Section title="LEADERBOARD ROWS">
          <ol className="space-y-1.5 max-w-md">
            {[['🥇', 'โรงเรียนตัวอย่าง A', 5.2], ['🥈', 'โรงเรียนตัวอย่าง B', 4.1], ['🥉', 'โรงเรียนตัวอย่าง C', 3.3], [4, 'โรงเรียนของฉัน', 2.0]].map(([r, n, h], i) => (
              <li key={n} className={`neo-slab flex items-center gap-3 px-3 py-2 ${i === 3 ? 'ring-2 ring-lime' : ''}`}>
                <span className="rpg-coin pixel-font text-[11px]">{r}</span>
                <span className="text-sm flex-1 truncate">{n}</span>
                <span className="pixel-font text-[10px] text-brand-strong">{h} ชม.</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="TEMPERAMENT CARD · EMOTES · CAST">
          <div className="grid sm:grid-cols-2 gap-4 items-start">
            <TemperamentCard mbti="INFP" focusXp={400} />
            <div className="relative h-28"><EmoteWheel onPick={() => {}} onClose={() => {}} /></div>
          </div>
          <div className="flex gap-2 mt-3">
            {['INTJ', 'ENFP', 'ISTP', 'ESFJ'].map((c) => <CharacterSprite key={c} code={c} scale={2} />)}
          </div>
        </Section>

        <Section title="LOADING SCENE">
          <div className="h-56 overflow-hidden rounded-lg border-2 border-edge"><LoadingScene /></div>
        </Section>

        <Section title="SHEET HEADER">
          <div className="neo-sheet overflow-hidden max-w-md">
            <PanelHeader title="ตัวอย่างหัวข้อแผง" onClose={() => {}} />
            <div className="p-4 text-sm">เนื้อหาในแผง</div>
          </div>
        </Section>
      </div>
    </div>
  )
}
