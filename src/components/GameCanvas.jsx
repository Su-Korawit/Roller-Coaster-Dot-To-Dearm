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
import { MapScene, loadSceneData } from '../game/worldScenes'
import { listMapConfigs, pickEntryKey } from '../utils/mapConfig'
import { useFarmDataStore } from '../stores/useFarmDataStore'
import { tileKey, isReady } from '../systems/farmLogic'
import { countInSlots } from '../systems/inventoryLogic'
import { plantSeed, harvestAt } from '../systems/farmActions'
import { moveToStorage, moveToHotbar, swapSlots } from '../systems/inventoryActions'
import { buyItem, sellItem, sellAllProduce } from '../systems/shopActions'

export default function GameCanvas({ active = true }) {
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

  // Farm state
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
          useWorldStore.getState().setCurrentMapKey(mapKey)
          useFarmStore.getState().setCurrentMapKey(mapKey)
          game.scene.start('MapScene', { mapKey, spawn })
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
    }

    // Resolve entry map configs + cloud URLs first, then let the ResizeObserver boot.
    ;(async () => {
      const maps = await listMapConfigs()
      const entryKey = pickEntryKey(maps) ?? 'test3'
      const data = await loadSceneData(entryKey)
      if (cancelled) return
      assetUrlsRef.current = { ...data, mapKey: entryKey }
      useWorldStore.getState().setCurrentMapKey(entryKey)
      useFarmStore.getState().setCurrentMapKey(entryKey)
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        if (width > 0 && height > 0) bootGame(width, height)
      }
    })().catch((e) => {
      console.error('[GameCanvas] boot failed:', e)
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
      {active && (
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
