import { useEffect } from 'react'
import { Lock, Check } from 'lucide-react'
import { useEntitlementsStore } from '../../stores/useEntitlementsStore'
import { useUserStore } from '../../stores/useUserStore'
import { CoinIcon } from '../ui/CoinIcon'

// Sells permanent entitlement unlocks for Coins. Purchases run through the
// purchaseEntitlement Cloud Function — never a client-side coin decrement.
export default function UnlockSection() {
  const catalog = useEntitlementsStore((s) => s.catalog)
  const catalogLoading = useEntitlementsStore((s) => s.catalogLoading)
  const entitlements = useEntitlementsStore((s) => s.entitlements)
  const coins = useUserStore((s) => s.coins)

  useEffect(() => {
    useEntitlementsStore.getState().loadCatalog()
  }, [])

  async function handleBuy(item) {
    try {
      await useEntitlementsStore.getState().purchase(item.id)
    } catch (e) {
      if (String(e?.message ?? '').includes('INSUFFICIENT_COINS')) {
        window.alert('เหรียญไม่พอ — เติมเหรียญด้านบนก่อนนะ')
      } else if (String(e?.message ?? '').includes('already-exists')) {
        window.alert('เป็นเจ้าของแล้ว')
      } else {
        console.error('[unlock] purchase failed:', e)
        window.alert('ซื้อไม่สำเร็จ ลองใหม่อีกครั้ง')
      }
    }
  }

  if (!catalogLoading && catalog.length === 0) return null

  return (
    <div className="border-t-2 border-edge/40 bg-paper px-4 py-3">
      <p className="pixel-font mb-2 text-[8px] text-ink/50">ปลดล็อกฟีเจอร์</p>
      {catalogLoading ? (
        <p className="thai-font text-xs text-ink-soft py-2">กำลังโหลด...</p>
      ) : (
        <div className="space-y-2">
          {catalog.map((item) => {
            const isOwned = Boolean(entitlements[item.id])
            const affordable = coins >= (item.priceCoins ?? 0)
            return (
              <div key={item.id} className="neo-card flex items-center gap-3 p-3" data-testid="unlock-item">
                <Lock size={16} className="text-brand-strong shrink-0" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="thai-font text-sm text-ink block truncate">{item.name}</span>
                  {item.description && (
                    <span className="thai-font text-[11px] text-ink-soft block truncate">{item.description}</span>
                  )}
                </span>
                {isOwned ? (
                  <span className="thai-font text-xs text-brand-strong flex items-center gap-1 shrink-0">
                    <Check size={14} /> เป็นเจ้าของแล้ว
                  </span>
                ) : (
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={!affordable}
                    className={`neo-btn rounded-lg px-3 py-1.5 pixel-font text-[9px] flex items-center gap-1.5 shrink-0 ${
                      affordable ? 'rpg-btn-primary' : 'bg-surface text-ink-soft opacity-60'
                    }`}
                  >
                    <CoinIcon size={12} />
                    {affordable ? item.priceCoins : 'เหรียญไม่พอ'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
