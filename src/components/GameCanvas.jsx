import { useEffect, useMemo, useRef, useState } from 'react'
import Phaser from 'phaser'
import { useSelectStore } from '../stores/useSelectStore'
import { useWorldStore } from '../stores/useWorldStore'
import { useAuthStore } from '../stores/useAuthStore'
import { useUserStore } from '../stores/useUserStore'
import { useFarmStore } from '../stores/useFarmStore'
import { useInventoryStore } from '../stores/useInventoryStore'
import MapPalette from './MapPalette'
import { Hotbar } from './Hotbar'
import { ShopUI } from './ShopUI'
import { StorageUI } from './StorageUI'
import { DayNightOverlay } from './DayNightOverlay'
import { NotificationContainer } from './NotificationContainer'
import FarmActionButton from './FarmActionButton'
import { isEditableTarget } from '../utils/isEditableTarget'
import { joinWorld, leaveWorld, subscribeWorldPlayers } from '../lib/presence'
import { isRoomOwnerUid, SCHOOL_HUB_MAP_KEY } from '../lib/schoolRoom'
import { returnHome } from '../lib/syncManager'
import { useSchoolWorldStore } from '../stores/useSchoolWorldStore'
import SchoolWorldLayer from './school/world/SchoolWorldLayer'
import { MapScene, loadSceneData } from '../game/worldScenes'
import { createIdleGovernor, setFpsLimit, IDLE_FPS } from '../game/idleGovernor'
import { listMapConfigs, pickEntryKey } from '../utils/mapConfig'
import { useFarmDataStore } from '../stores/useFarmDataStore'
import { tileKey, isReady } from '../systems/farmLogic'
import { countInSlots } from '../systems/inventoryLogic'
import { plantSeed, harvestAt } from '../systems/farmActions'
import { moveToStorage, moveToHotbar, swapSlots } from '../systems/inventoryActions'
import { buyItem, sellItem, sellAllProduce } from '../systems/shopActions'

export default function GameCanvas({ active = true, onOpenView }) {
  const containerRef = useRef(null)
  const [zoom, setZoom] = useState(null)
  const [showZoom, setShowZoom] = useState(false)
  const gameRef = useRef(null)
  const hideTimerRef = useRef(null)
  const assetUrlsRef = useRef(null) // populated before Phaser boots
  const activeRef = useRef(active)
  useEffect(() => { activeRef.current = active }, [active])

  // Player locks to the MBTI chosen during onboarding. Held in a ref so the
  // one-time game-creation effect below reads the latest value, not a stale one.
  const selectedMbti = useSelectStore((s) => s.mbti)
  const selectedMbtiRef = useRef(selectedMbti)
  useEffect(() => { selectedMbtiRef.current = selectedMbti }, [selectedMbti])

  const user    = useAuthStore((s) => s.user)
  const selfUid = user?.uid ?? null

  // Personal Map decorations — push into the Phaser registry and notify the
  // scene whenever the store updates (e.g. after sessionBootstrap hydrates).
  const mapObjects      = useWorldStore((s) => s.mapObjects)
  const editMode        = useWorldStore((s) => s.editMode)
  const selectedItemKey = useWorldStore((s) => s.selectedItemKey)
  const currentMapOwnerUid = useWorldStore((s) => s.currentMapOwnerUid)
  const currentMapKey      = useWorldStore((s) => s.currentMapKey)
  const remotePlayers      = useWorldStore((s) => s.remotePlayers)
  const controlMode        = useUserStore((s) => s.controlMode)
  const uiVisibility       = useUserStore((s) => s.uiVisibility)

  // Farm state
  const [isBooting, setIsBooting] = useState(true)
  const [isSwitchingMap, setIsSwitchingMap] = useState(false)
  const [bootError, setBootError] = useState(false)
  const [activeTile, setActiveTile] = useState(null)
  const [selectedHotbarIndex, setSelectedHotbarIndex] = useState(0)
  const selectedHotbarIndexRef = useRef(0)
  useEffect(() => { selectedHotbarIndexRef.current = selectedHotbarIndex }, [selectedHotbarIndex])
  const [shopState, setShopState] = useState(null)   // { shopId } | null
  const [chestOpen, setChestOpen] = useState(false)
  const plots = useFarmStore((s) => s.plots)
  const isOwner = currentMapOwnerUid && selfUid && currentMapOwnerUid === selfUid

  // Farm data store subscriptions (replaces static ITEMS/getShop imports)
  const farmItems = useFarmDataStore((s) => s.items)
  const farmShops = useFarmDataStore((s) => s.shops)
  const farmPlants = useFarmDataStore((s) => s.plants)

  // Inventory subscriptions
  const hotbar  = useInventoryStore((s) => s.hotbar)
  const storage = useInventoryStore((s) => s.storage)
  const gold    = useInventoryStore((s) => s.gold)

  useEffect(() => {
    const game = gameRef.current
    if (!game) return
    game.registry.set('mapObjects', mapObjects)
    game.events.emit('mapObjectsChanged')
  }, [mapObjects])

  useEffect(() => {
    const game = gameRef.current
    if (!game) return
    game.registry.set('editMode', editMode)
    game.registry.set('selectedItemKey', selectedItemKey)
    game.events.emit('editModeChanged')
  }, [editMode, selectedItemKey])

  // Keep selfUid and display name in the registry for MapScene to read during update().
  useEffect(() => {
    const game = gameRef.current
    if (!game) return
    game.registry.set('selfUid',  selfUid  ?? '')
    game.registry.set('selfName', user?.displayName ?? '')
  }, [selfUid, user])

  // Push remotePlayers into the registry and notify MapScene to reconcile sprites.
  useEffect(() => {
    const game = gameRef.current
    if (!game) return
    game.registry.set('remotePlayers', remotePlayers)
    game.events.emit('remotePlayersChanged')
  }, [remotePlayers])

  useEffect(() => {
    const game = gameRef.current
    if (!game) return
    game.registry.set('controlMode', controlMode)
  }, [controlMode])

  // Arm/disarm presence room whenever the visited map owner or current map changes.
  useEffect(() => {
    if (!currentMapOwnerUid || !selfUid || !currentMapKey) return

    const selfState = {
      x: 0, y: 0, dir: 'down', moving: false,
      mbti:     selectedMbtiRef.current ?? 'INTJ',
      name:     user?.displayName ?? '',
      photoURL: user?.photoURL ?? null,
    }
    joinWorld(currentMapOwnerUid, currentMapKey, selfUid, selfState).catch(() => {})

    if (gameRef.current) {
      gameRef.current.registry.set('ownerUid', currentMapOwnerUid)
      gameRef.current.registry.set('selfUid',  selfUid)
      gameRef.current.registry.set('selfName', user?.displayName ?? '')
    }

    const unsub = subscribeWorldPlayers(currentMapOwnerUid, currentMapKey, (snapshot) => {
      useWorldStore.getState().setRemotePlayers(snapshot)
    })

    return () => {
      leaveWorld(currentMapOwnerUid, currentMapKey, selfUid)
      unsub()
      useWorldStore.getState().setRemotePlayers({})
    }
  }, [currentMapOwnerUid, selfUid, currentMapKey])  // eslint-disable-line react-hooks/exhaustive-deps

  // Bridge farm store → scene so crops re-render on plant/harvest.
  useEffect(() => {
    const game = gameRef.current
    if (!game) return
    game.events.emit('farmChanged')
  }, [plots])

  useEffect(() => {
    let game = null
    let cancelled = false

    function bootGame(width, height) {
      if (game || !assetUrlsRef.current) return
      const config = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        pixelArt: true,
        antialias: false,
        physics: {
          default: 'arcade',
          arcade: { gravity: { y: 0 }, debug: false },
        },
        scene: [MapScene],
        scale: { mode: Phaser.Scale.RESIZE, width, height },
      }
      game = new Phaser.Game(config)
      game.registry.set('selectedMbti', selectedMbtiRef.current)
      game.registry.set('assetUrls', assetUrlsRef.current.assetUrls)
      game.registry.set('mapConfig', assetUrlsRef.current.mapConfig)
      game.registry.set('tilesetUrls', assetUrlsRef.current.tilesetUrls)
      game.registry.set('mapObjects', useWorldStore.getState().mapObjects)
      game.registry.set('editMode', useWorldStore.getState().editMode)
      game.registry.set('selectedItemKey', useWorldStore.getState().selectedItemKey)
      game.registry.set('controlMode', useUserStore.getState().controlMode)
      game.scene.start('MapScene', { mapKey: assetUrlsRef.current.mapKey, spawn: null })
      gameRef.current = game
      game.events.on('mapSceneReady', () => {
        setIsBooting(false)
        setIsSwitchingMap(false)
      })
      game.events.on('mapLoadFailed', ({ mapKey }) => {
        console.error('[GameCanvas] map load failed:', mapKey)
        setIsBooting(false)
        setIsSwitchingMap(false)
        setBootError(true)
      })
      game.events.on('zoomChanged', (v) => {
        setZoom(+v.toFixed(1))
        setShowZoom(true)
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = setTimeout(() => setShowZoom(false), 1500)
      })
      // Handle portal-driven map switches: reload target map's config/tilesets into
      // the registry before restarting the scene so preload can access fresh URLs.
      let switching = false
      game.events.on('mapChangeRequested', async ({ mapKey, spawn }) => {
        if (switching) return
        switching = true
        setIsSwitchingMap(true)
        try {
          const data = await loadSceneData(mapKey)
          if (cancelled) return   // component unmounted during await — game is destroyed
          game.registry.set('mapConfig', data.mapConfig)
          game.registry.set('tilesetUrls', data.tilesetUrls)
          game.registry.set('assetUrls', data.assetUrls)
          // Persist zoom so the new scene restores it instead of resetting to default
          const activeScene = game.scene.getScene('MapScene')
          if (activeScene?.cameras?.main) {
            game.registry.set('savedZoom', activeScene.cameras.main.zoom)
          }
          // Walking out of the School Hub (e.g. its exit portal) returns the player to
          // their own world; owner + map key flip together so presence joins one room.
          const leavingHub = isRoomOwnerUid(useWorldStore.getState().currentMapOwnerUid) && mapKey !== SCHOOL_HUB_MAP_KEY
          if (leavingHub) {
            useSchoolWorldStore.getState().setLeft()
            returnHome(useAuthStore.getState().user?.uid, mapKey)
          } else {
            useWorldStore.getState().setCurrentMapKey(mapKey)
          }
          useFarmStore.getState().setCurrentMapKey(mapKey)
          game.scene.start('MapScene', { mapKey, spawn })
        } catch (e) {
          console.error('[GameCanvas] map switch failed:', e)
          setIsSwitchingMap(false)
        } finally {
          switching = false
        }
      })
      // Farm scene event wiring
      game.events.on('farmTileChanged', (tile) => setActiveTile(tile))
      game.events.on('shopEntered', ({ shopId }) => setShopState({ shopId }))
      game.events.on('shopExited', () => setShopState(null))
      game.events.on('chestOpened', () => setChestOpen(true))
      game.events.on('chestClosed', () => setChestOpen(false))
      // School Hub zones (ADR 0018) -> UI state; panels render in SchoolWorldLayer.
      game.events.on('focusSeatEntered', ({ seatId }) => useSchoolWorldStore.getState().openPanel({ type: 'focus', seatId }))
      game.events.on('boardEntered', ({ boardId }) => useSchoolWorldStore.getState().openPanel(
        boardId === 'leaderboard' ? { type: 'leaderboard' } : { type: 'board', id: boardId },
      ))
      game.events.on('toolEntered', ({ route }) => useSchoolWorldStore.getState().requestTool(route))
    }

    // Resolve entry map configs + cloud URLs first, then let the ResizeObserver boot.
    ;(async () => {
      const maps = await listMapConfigs()
      const entryKey = pickEntryKey(maps) ?? 'test3'
      const data = await loadSceneData(entryKey)
      if (cancelled) return
      assetUrlsRef.current = { ...data, mapKey: entryKey }
      useSchoolWorldStore.getState().setEntryMapKey(entryKey)
      useWorldStore.getState().setCurrentMapKey(entryKey)
      useFarmStore.getState().setCurrentMapKey(entryKey)
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        if (width > 0 && height > 0) bootGame(width, height)
      }
    })().catch((e) => {
      console.error('[GameCanvas] boot failed:', e)
      setIsBooting(false)
      setBootError(true)
    })

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width === 0 || height === 0) return
      if (!game) {
        bootGame(width, height)
      } else {
        game.scale.resize(width, height)
      }
    })

    ro.observe(containerRef.current)

    return () => {
      cancelled = true
      ro.disconnect()
      clearTimeout(hideTimerRef.current)
      if (game) game.destroy(true)
      gameRef.current = null
    }
  }, [])

  // School World asks for map switches through the store (it has no handle on the
  // Phaser game); forward them to the same event portals use.
  const mapChangeRequest = useSchoolWorldStore((s) => s.mapChangeRequest)
  useEffect(() => {
    if (!mapChangeRequest) return
    useSchoolWorldStore.getState().clearMapChangeRequest()
    const game = gameRef.current
    if (!game) return
    const mapKey = mapChangeRequest.mapKey ?? assetUrlsRef.current?.mapKey
    if (mapKey) game.events.emit('mapChangeRequested', { mapKey, spawn: null })
  }, [mapChangeRequest])

  // Leaving the Home screen while inside a school room must not strand the next
  // boot in a room whose map is no longer loaded.
  useEffect(() => () => {
    const s = useSchoolWorldStore.getState()
    if (!s.inHub) return
    s.setLeft()
    const uid = useAuthStore.getState().user?.uid
    if (uid) returnHome(uid)
  }, [])

  // AFK: after 60s without input, cap Phaser at IDLE_FPS (battery/CPU for
  // all-day tabs). Any input restores full speed. Presence writes are
  // de-duplicated separately in lib/presence.js.
  useEffect(() => {
    const governor = createIdleGovernor({
      onIdle:   () => setFpsLimit(gameRef.current, IDLE_FPS),
      onActive: () => setFpsLimit(gameRef.current, 0),
    })
    const events = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel']
    const touch = () => governor.touch()
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }))
    const timer = setInterval(() => governor.tick(), 5000)
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch))
      clearInterval(timer)
    }
  }, [])

  // Pause game input while an app panel/modal is open so typing (e.g. WASD in
  // Chat or Task forms) doesn't move the character.
  useEffect(() => {
    const game = gameRef.current
    if (!game || !game.input) return
    game.input.enabled = active
    if (game.input.keyboard) game.input.keyboard.enabled = active
  }, [active])

  // Suppress keyboard while a text field (input/textarea/contenteditable) is
  // focused — prevents WASD in Roadmap block fields from moving the avatar.
  useEffect(() => {
    function onFocusIn(e) {
      if (!isEditableTarget(e.target)) return
      const game = gameRef.current
      if (game?.input?.keyboard) game.input.keyboard.enabled = false
    }
    function onFocusOut() {
      if (isEditableTarget(document.activeElement)) return
      const game = gameRef.current
      if (game?.input?.keyboard) game.input.keyboard.enabled = activeRef.current
    }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  // ---------- Growing info indicator ----------
  const activePlot = activeTile ? plots[tileKey(activeTile.tileX, activeTile.tileY)] : null
  const showGrowing = active && isOwner && activePlot && !activePlot.anchorKey &&
    !isReady(activePlot.plantedAt, activePlot.plantId, Date.now(), farmPlants)

  // Auto-plant / auto-harvest: fires when player walks onto a new farm tile.
  useEffect(() => {
    if (!activeTile || !isOwner) return
    const { plots: currentPlots } = useFarmStore.getState()
    const plot = currentPlots[tileKey(activeTile.tileX, activeTile.tileY)]

    // Auto-harvest ready crops
    if (plot && !plot.anchorKey) {
      const { plants } = useFarmDataStore.getState()
      if (isReady(plot.plantedAt, plot.plantId, Date.now(), plants)) {
        harvestAt({ tileX: activeTile.tileX, tileY: activeTile.tileY })
        return
      }
    }

    if (plot) return // growing — nothing to do

    // Auto-plant seed from selected hotbar slot
    const { hotbar: currentHotbar } = useInventoryStore.getState()
    const slot = currentHotbar[selectedHotbarIndexRef.current]
    if (!slot) return
    const { items } = useFarmDataStore.getState()
    if (items[slot.itemId]?.type !== 'seed') return
    plantSeed({
      tileX: activeTile.tileX,
      tileY: activeTile.tileY,
      seedItemId: slot.itemId,
      farmTiles: gameRef.current?.scene?.getScene('MapScene')?._farmTiles,
    })
  }, [activeTile, isOwner]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Derived produce list ----------
  const produceList = useMemo(() => {
    const byId = {}
    ;[...hotbar, ...storage].forEach(slot => {
      if (!slot) return
      if (farmItems[slot.itemId]?.type === 'produce') {
        byId[slot.itemId] = (byId[slot.itemId] ?? 0) + slot.count
      }
    })
    return Object.entries(byId).map(([itemId, count]) => ({
      itemId, count, name: farmItems[itemId]?.name ?? itemId, sellPrice: farmItems[itemId]?.sellPrice ?? 0,
    }))
  }, [hotbar, storage, farmItems])

  const stockList = useMemo(() => {
    if (!shopState?.shopId) return []
    const shop = farmShops[shopState.shopId]
    if (!shop) return []
    return shop.sells.map(s => ({
      itemId: s.itemId,
      name: farmItems[s.itemId]?.name ?? s.itemId,
      price: s.price,
      playerCount: countInSlots(hotbar, s.itemId) + countInSlots(storage, s.itemId),
    }))
  }, [shopState, hotbar, storage, farmItems, farmShops])

  // ---------- Storage move/swap handlers ----------
  const handleMoveToStorage = (fromIndex) => moveToStorage(fromIndex)
  const handleMoveToHotbar = (fromIndex) => moveToHotbar(fromIndex)
  const handleSwapSlots = (fromIndex, toIndex, isHotbarSwap) => swapSlots(fromIndex, toIndex, isHotbarSwap)

  // ---------- Shop buy/sell handlers ----------
  const handleBuy = (itemId, qty) => buyItem(farmShops, shopState?.shopId, itemId, qty)
  const handleSell = (itemId, count) => sellItem(itemId, count)
  const handleSellAll = () => sellAllProduce()

  return (
    <>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      />
      {bootError && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4"
          style={{ background: 'linear-gradient(160deg, #0f0824 0%, #1a1035 50%, #0d1f3c 100%)' }}
        >
          <span className="text-5xl" aria-hidden="true">🛠️</span>
          <span className="pixel-font text-[10px] text-purple-300 text-center leading-relaxed px-8">
            โหลดแผนที่ไม่สำเร็จ — เซิร์ฟเวอร์ asset อาจไม่พร้อมใช้งานชั่วคราว
          </span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="pixel-font text-[10px] px-4 py-2 rounded border border-purple-400/50 text-purple-200 hover:bg-purple-400/10"
          >
            ลองใหม่
          </button>
        </div>
      )}
      {isBooting && !bootError && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(160deg, #0f0824 0%, #1a1035 50%, #0d1f3c 100%)' }}
        >
          <span className="text-5xl mb-5" aria-hidden="true">🚀</span>
          <span className="pixel-font text-[10px] text-purple-300 mb-4">Loading...</span>
          <div
            className="w-48 h-1.5 rounded-full overflow-hidden bg-white/10"
            role="progressbar"
            aria-label="กำลังโหลด"
            aria-busy="true"
          >
            <div
              className="h-full w-1/3 rounded-full animate-loading-slide"
              style={{ background: 'linear-gradient(90deg, transparent, var(--color-brand), var(--color-accent-pink), transparent)' }}
            />
          </div>
        </div>
      )}
      {isSwitchingMap && !isBooting && (
        <div className="absolute inset-0 z-40 bg-black/40 flex items-end justify-end p-6">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}
      {active && uiVisibility.hotbar && (
        <Hotbar slots={hotbar} selectedIndex={selectedHotbarIndex} gold={gold} onSelectSlot={setSelectedHotbarIndex} />
      )}

      {showGrowing && (
        <FarmActionButton label="กำลังโต…" onAction={() => {}} />
      )}
      {active && shopState && (
        <ShopUI
          isOpen
          shop={farmShops[shopState.shopId]}
          stockList={stockList}
          produceList={produceList}
          gold={gold}
          onBuy={handleBuy}
          onSell={handleSell}
          onSellAll={handleSellAll}
          onClose={() => setShopState(null)}
        />
      )}
      {active && chestOpen && (
        <StorageUI
          isOpen
          hotbarSlots={hotbar}
          storageSlots={storage}
          gold={gold}
          onMoveToStorage={handleMoveToStorage}
          onMoveToHotbar={handleMoveToHotbar}
          onSwapSlots={handleSwapSlots}
          onClose={() => setChestOpen(false)}
        />
      )}
      <SchoolWorldLayer gameRef={gameRef} onOpenView={onOpenView} active={active} />
      {active && <DayNightOverlay dayNight={null} />}
      {active && <NotificationContainer />}
      <div style={{
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 64,
        height: 20,
        backgroundImage: 'url(/assets/ui/custom/zoom_bg.png)',
        backgroundSize: '100% 100%',
        imageRendering: 'pixelated',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: showZoom ? 1 : 0,
        transition: 'opacity 0.3s',
        pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily: "'pixelFont-7', monospace",
          fontSize: 10,
          color: '#3d2b1f',
          fontWeight: 'bold',
          lineHeight: 1,
          userSelect: 'none',
        }}>
          {zoom}×
        </span>
      </div>
    </>
  )
}
