import { useEffect, useState } from 'react'
import Button from '../components/ui/Button'
import PanelHeader from '../components/ui/PanelHeader'
import LevelBadge from '../components/hud/LevelBadge'
import EmoteWheel from '../components/school/world/EmoteWheel'
import FocusPanel from '../components/school/world/FocusPanel'
import SceneBackdrop from '../components/landing/SceneBackdrop'
import CharacterSprite from '../components/ui/CharacterSprite'
import TemperamentCard from '../components/profile/TemperamentCard'
import LoadingScene from '../components/ui/LoadingScene'
import OnboardingIntro from '../components/onboarding/OnboardingIntro'
import FxLayer from '../components/hud/FxLayer'
import { SOUNDS, playSound, startRain, stopRain, isRaining } from '../lib/sfx'
import { celebrateXp, fxToast } from '../services/fx'
import ProductCard from '../components/shop/ProductCard'
import PaymentStatusBadge from '../components/shop/PaymentStatusBadge'
import QRPaymentCard from '../components/shop/QRPaymentCard'
import { useSchoolWorldStore } from '../stores/useSchoolWorldStore'
import { useUserStore } from '../stores/useUserStore'

// DEV-ONLY living style guide for the cozy pixel RPG theme (route /dev/ui, not
// registered in production builds). One screen to eyeball every shared surface,
// so a theme change can be judged without logging in and walking to each panel.

const SWATCHES = [
  'brand', 'brand-strong', 'brand-soft', 'accent-pink', 'ink', 'ink-soft',
  'paper', 'mist', 'hairline', 'line', 'line-soft', 'lime',
  'good', 'leaf', 'warn', 'danger',
].map((name) => [name, `var(--color-${name})`])

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="pixel-font text-xs text-ink mb-3">{title}</h2>
      {children}
    </section>
  )
}

export default function DevUiKit() {
  const [qrExpires] = useState(() => Date.now() + 9 * 60000)
  useEffect(() => {
    useUserStore.setState({ focusXp: 400 })
    useSchoolWorldStore.getState().setFocus({
      status: 'active', startedAt: Date.now(), lastCheckInAt: Date.now() - 9 * 60000,
      verifiedMs: 95 * 60000, xpThisSession: 95, temperament: 'NF', lastResult: { multiplier: 1.1 },
    })
  }, [])

  return (
    <div className="bg-paper text-ink thai-font overflow-y-auto relative" style={{ height: '100dvh' }}>
      <FxLayer />
      <div className="mx-auto max-w-3xl p-5">
        <h1 className="pixel-font pixel-title text-lg mb-6">UI KIT · Cozy Pixel RPG</h1>

        <Section title="PALETTE">
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {SWATCHES.map(([name, hex]) => (
              <div key={name} className="text-center">
                <div className="h-10 rounded border-2 border-line" style={{ background: hex }} />
                <div className="text-xs mt-1">{name}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="BUTTONS">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="w-44"><Button>เริ่มเล่น (primary)</Button></div>
            <div className="w-44"><Button variant="secondary">ยกเลิก (secondary)</Button></div>
            <button className="px-btn rpg-btn-danger px-4 h-11 rounded-xl font-bold">ลบบัญชี</button>
            <button className="px-btn bg-paper w-12 h-12 rounded-lg" aria-label="icon">🎒</button>
            <button className="px-btn bg-paper w-12 h-12 rounded-full" aria-label="icon">⭐</button>
          </div>
        </Section>

        <Section title="PANELS">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="px-card p-4"><b>px-card</b><p className="text-xs mt-1">กระดาษพาร์ชเมนต์ กรอบพลัมนูน</p></div>
            <div className="px-slab p-4"><b>px-slab</b><p className="text-xs mt-1">แผ่นไม้สำหรับ HUD</p></div>
            <div className="px-card p-4">
              <b>px-input</b>
              <input className="px-input w-full mt-2 px-3 h-10 text-sm" placeholder="พิมพ์ที่นี่" />
            </div>
          </div>
        </Section>

        <Section title="BARS · LEVEL COIN">
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <span className="rpg-coin pixel-font text-xs">7</span>
              <div className="rpg-bar flex-1" style={{ '--pct': 62 }}><i /></div>
            </div>
            <div className="rpg-bar rpg-bar--heart" style={{ '--pct': 35 }}><i /></div>
            <div className="relative w-12 h-12">
              <div className="px-btn w-12 h-12 rounded-full bg-paper flex items-center justify-center">🙂</div>
              <LevelBadge xp={400} />
            </div>
          </div>
        </Section>

        <Section title="HUD">
          <div className="relative h-24 overflow-hidden rounded-lg border-2 border-line">
            <SceneBackdrop clouds={false} />
            <div className="relative z-10 flex items-center justify-between p-3">
              <div className="relative">
                <div className="px-btn w-10 h-10 rounded-full bg-paper flex items-center justify-center">🙂</div>
                <LevelBadge xp={400} />
              </div>
              <div className="px-slab flex items-center gap-3 px-4 py-1.5 pixel-font text-xs">
                <span>🔥 12</span><span>🪙 340</span><span>🌾 85g</span>
              </div>
            </div>
          </div>
        </Section>

        <Section title="PANEL HEADER · FOCUS PANEL (live component)">
          <div className="relative h-[34rem] overflow-hidden rounded-lg border-2 border-line bg-black/20">
            <FocusPanel seatId="lib-3" onClose={() => {}} />
          </div>
        </Section>

        <Section title="LEADERBOARD ROWS">
          <ol className="space-y-1.5 max-w-md">
            {[['🥇', 'โรงเรียนตัวอย่าง A', 5.2], ['🥈', 'โรงเรียนตัวอย่าง B', 4.1], ['🥉', 'โรงเรียนตัวอย่าง C', 3.3], [4, 'โรงเรียนของฉัน', 2.0]].map(([r, n, h], i) => (
              <li key={n} className={`px-slab flex items-center gap-3 px-3 py-2 ${i === 3 ? 'ring-2 ring-lime' : ''}`}>
                <span className="rpg-coin pixel-font text-xs">{r}</span>
                <span className="text-sm flex-1 truncate">{n}</span>
                <span className="pixel-font text-xs text-brand-strong">{h} ชม.</span>
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

        <Section title="SHOP">
          <div className="grid grid-cols-3 gap-2 max-w-md">
            <ProductCard product={{ id: 'a', name: 'เหรียญ 100', coins: 100, price: 29 }} onBuy={() => {}} />
            <ProductCard product={{ id: 'b', name: 'เหรียญ 350', coins: 350, price: 89, image: '💰' }} onBuy={() => {}} />
            <ProductCard product={{ id: 'c', name: 'เหรียญ 800', coins: 800, price: 179, image: '💎' }} onBuy={() => {}} disabled />
          </div>
          <div className="flex gap-2 flex-wrap mt-3">
            {['WAITING_PAYMENT', 'VERIFYING', 'SUCCESS', 'FAILED', 'EXPIRED'].map((st) => <PaymentStatusBadge key={st} status={st} />)}
          </div>
          <div className="px-card max-w-xs mt-3 overflow-hidden">
            <div className="rpg-plank px-4 py-3 thai-font text-sm font-semibold">สั่งซื้อ · แพ็คเกจเหรียญ</div>
            <QRPaymentCard amount={89} expiresAt={qrExpires} />
          </div>
        </Section>

        <Section title="CHAT · SOCIAL">
          <div className="space-y-2 max-w-sm bg-paper p-3 rounded-lg border-2 border-line">
            <div className="flex justify-start"><div className="max-w-[76%] rounded-2xl rounded-bl-sm border-2 border-line/60 shadow-[0_2px_0_0_var(--color-edge)] px-3.5 py-2.5 bg-brand-soft text-ink text-[13px]">ไปอ่านหนังสือที่ห้องสมุดกัน?</div></div>
            <div className="flex justify-end"><div className="max-w-[76%] rounded-2xl rounded-br-sm border-2 border-line/60 shadow-[0_2px_0_0_var(--color-edge)] px-3.5 py-2.5 bg-brand text-white text-[13px]">ได้เลย เจอกันโต๊ะ lib-3 😄</div></div>
            <div className="px-slab flex items-center gap-3 px-3 py-2.5">
              <div className="w-10 h-10 rounded-full bg-paper border-2" style={{ borderColor: 'var(--color-brand)' }} />
              <div className="flex-1 text-sm"><b>เพื่อนร่วมโรงเรียน</b><div className="text-xs text-ink-soft">INFP · วิศวะคอม</div></div>
              <span className="pixel-font text-xs" style={{ color: 'var(--color-warn)' }}>92%</span>
            </div>
            <div className="flex items-center gap-2 bg-paper border-t-2 border-line -mx-3 -mb-3 px-3 py-2.5 rounded-b-md">
              <input className="px-input flex-1 px-3 py-2 text-sm" placeholder="พิมพ์ข้อความ..." />
              <button className="px-btn rpg-btn-primary w-9 h-9 rounded-xl">➤</button>
            </div>
          </div>
        </Section>

        <Section title="SOUND BOARD · FEEDBACK">
          <div className="flex flex-wrap gap-2">
            {Object.keys(SOUNDS).map((name) => (
              <button key={name} className="px-btn bg-paper px-3 py-2 pixel-font text-xs" onClick={() => playSound(name, { now: () => Date.now() + Math.random() })}>{name}</button>
            ))}
            <button className="px-btn bg-paper px-3 py-2 pixel-font text-xs" onClick={() => (isRaining() ? stopRain() : startRain())}>rain on/off</button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button className="px-btn rpg-btn-primary px-3 py-2 pixel-font text-xs" onClick={() => celebrateXp({ before: 10, gained: 25 })}>+25 XP</button>
            <button className="px-btn rpg-btn-primary px-3 py-2 pixel-font text-xs" onClick={() => celebrateXp({ before: 50, gained: 25 })}>level up</button>
            <button className="px-btn bg-paper px-3 py-2 pixel-font text-xs" onClick={() => fxToast('coin', '+10 🪙', 'coin')}>coin</button>
          </div>
        </Section>

        <Section title="ONBOARDING INTRO">
          <div className="h-[28rem] overflow-hidden rounded-lg border-2 border-line"><OnboardingIntro onNext={() => {}} /></div>
        </Section>

        <Section title="LOADING SCENE">
          <div className="h-56 overflow-hidden rounded-lg border-2 border-line"><LoadingScene /></div>
        </Section>

        <Section title="SHEET HEADER">
          <div className="px-sheet overflow-hidden max-w-md">
            <PanelHeader title="ตัวอย่างหัวข้อแผง" onClose={() => {}} />
            <div className="p-4 text-sm">เนื้อหาในแผง</div>
          </div>
        </Section>
      </div>
    </div>
  )
}
