import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { getDoc, setDoc } from 'firebase/firestore'
import { refs, shapes } from '../lib/db'
import { useAuthStore } from '../stores/useAuthStore'
import { useUserStore } from '../stores/useUserStore'
import { useEntitlementsStore } from '../stores/useEntitlementsStore'
import { bagQuotaFromStores, loadBagFolderContents } from '../services/fileBag'
import { BAG_STORAGE_CATALOG_SEEDS } from '../data/bagStorageCatalog'
import BagIconRail, { CATEGORIES } from '../components/bag/BagIconRail'
import BagSettingsPanel from '../components/bag/BagSettingsPanel'
import BagQuotaMeter from '../components/bag/BagQuotaMeter'
import BagCanvas from '../components/bag/BagCanvas'
import BagGridView from '../components/bag/BagGridView'

const DEFAULT_CATEGORIES = CATEGORIES.map((c) => c.id)

export default function BagPage() {
  const user = useAuthStore((s) => s.user)
  const uid = user?.uid
  const email = user?.email
  const usageBytes = useUserStore((s) => s.fileBagUsageBytes ?? 0)
  const purchase = useEntitlementsStore((s) => s.purchase)
  const loadCatalog = useEntitlementsStore((s) => s.loadCatalog)
  const catalog = useEntitlementsStore((s) => s.catalog)

  const [folderId, setFolderId] = useState(null)
  const [folderStack, setFolderStack] = useState([]) // [{id, name}]
  const [items, setItems] = useState([])
  const [folders, setFolders] = useState([])
  const [category, setCategory] = useState('files')
  const [visibleCategories, setVisibleCategories] = useState(DEFAULT_CATEGORIES)
  const [showSettings, setShowSettings] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [isMd, setIsMd] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true,
  )

  const quota = bagQuotaFromStores(email, usageBytes)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => setIsMd(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  useEffect(() => {
    if (!uid) return
    getDoc(refs.bagSettings(uid)).then((snap) => {
      if (snap.exists() && Array.isArray(snap.data().visibleCategories)) {
        setVisibleCategories(snap.data().visibleCategories)
      }
    }).catch(() => {})
  }, [uid])

  const refresh = useCallback(async () => {
    if (!uid) return
    const { items: nextItems, folders: nextFolders } = await loadBagFolderContents(uid, folderId)
    setItems(nextItems)
    setFolders(nextFolders)
  }, [uid, folderId])

  useEffect(() => { refresh() }, [refresh])

  const openFolder = (id) => {
    const f = folders.find((x) => x.id === id)
    setFolderStack((s) => [...s, { id, name: f?.name ?? 'Folder' }])
    setFolderId(id)
  }

  const goBack = () => {
    setFolderStack((s) => {
      const next = s.slice(0, -1)
      setFolderId(next.length ? next[next.length - 1].id : null)
      return next
    })
  }

  const saveSettings = async (cats) => {
    setVisibleCategories(cats)
    if (!uid) return
    await setDoc(refs.bagSettings(uid), shapes.bagSettings({ visibleCategories: cats }), { merge: true })
  }

  const handleUpgrade = async (itemId) => {
    try {
      await purchase(itemId)
      setShowUpgrade(false)
    } catch (err) {
      window.alert(err?.message ?? 'ซื้อไม่สำเร็จ — ตรวจเหรียญในแอป')
    }
  }

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-brand-soft min-h-0">
      <div className="flex md:flex-col md:w-20 flex-shrink-0 bg-paper border-b md:border-b-0 md:border-r border-ink/10">
        <BagIconRail
          visibleCategories={visibleCategories}
          activeCategory={category}
          onSelectCategory={setCategory}
          onOpenSettings={() => setShowSettings(true)}
        />
        <div className="hidden md:block mt-auto w-full">
          <BagQuotaMeter
            used={quota.used}
            quota={quota.quota}
            isAdmin={quota.isAdmin}
            onUpgrade={() => setShowUpgrade(true)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <header className="flex items-center gap-2 px-3 py-2 border-b border-ink/10 bg-paper flex-shrink-0">
          {folderStack.length > 0 && (
            <button type="button" onClick={goBack} aria-label="Back" className="p-1.5 rounded-lg hover:bg-brand/10">
              <ChevronLeft size={18} />
            </button>
          )}
          <h1 className="pixel-font text-xs text-ink">
            {folderStack.length ? folderStack.map((f) => f.name).join(' / ') : 'File Bag'}
          </h1>
          <div className="md:hidden ml-auto">
            <BagQuotaMeter
              used={quota.used}
              quota={quota.quota}
              isAdmin={quota.isAdmin}
              onUpgrade={() => setShowUpgrade(true)}
            />
          </div>
        </header>

        {isMd ? (
          <BagCanvas
            uid={uid}
            folderId={folderId}
            items={items}
            folders={folders}
            category={category}
            onOpenFolder={openFolder}
            onRefresh={refresh}
            onQuotaExceeded={() => setShowUpgrade(true)}
          />
        ) : (
          <BagGridView
            uid={uid}
            folderId={folderId}
            items={items}
            folders={folders}
            category={category}
            onOpenFolder={openFolder}
            onRefresh={refresh}
            onQuotaExceeded={() => setShowUpgrade(true)}
          />
        )}
      </div>

      {showSettings && (
        <BagSettingsPanel
          visibleCategories={visibleCategories}
          onChange={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showUpgrade && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowUpgrade(false)}>
          <div className="px-card p-5 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="pixel-font text-xs text-ink">Upgrade storage</h2>
            <p className="text-xs text-ink-soft">ซื้อด้วยเหรียญ (Coins) ผ่าน entitlement ในแอป</p>
            {(catalog.filter((c) => c.kind === 'storage-quota').length
              ? catalog.filter((c) => c.kind === 'storage-quota')
              : BAG_STORAGE_CATALOG_SEEDS
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleUpgrade(item.id)}
                className="w-full px-btn rounded-xl px-4 py-3 text-left text-sm bg-paper"
              >
                <span className="font-semibold">{item.name}</span>
                <span className="block text-xs text-ink-soft">{item.priceCoins} coins</span>
              </button>
            ))}
            <button type="button" className="text-xs text-brand" onClick={() => setShowUpgrade(false)}>ปิด</button>
          </div>
        </div>
      )}
    </div>
  )
}
