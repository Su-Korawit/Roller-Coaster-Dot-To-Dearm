import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { useSelectStore } from '../stores/useSelectStore'
import { useWorldStore } from '../stores/useWorldStore'
import { useAuthStore } from '../stores/useAuthStore'
import { useUserStore } from '../stores/useUserStore'
import { DayNightOverlay } from './DayNightOverlay'
import { NotificationContainer } from './NotificationContainer'
import { isEditableTarget } from '../utils/isEditableTarget'
import { joinWorld, leaveWorld, subscribeWorldPlayers } from '../lib/presence'
import { isRoomOwnerUid, SCHOOL_HUB_MAP_KEY } from '../lib/schoolRoom'
import { returnHome, flushResumeSync } from '../lib/syncManager'
import { useResumeStore } from '../stores/useResumeStore'
import { useSchoolWorldStore } from '../stores/useSchoolWorldStore'
import SchoolWorldLayer from './school/world/SchoolWorldLayer'
import LoadingScene from './ui/LoadingScene'
import WarpTransition from './hotbar/WarpTransition'
import { MapScene, loadSceneData } from '../game/worldScenes'
import { createIdleGovernor, setFpsLimit, IDLE_FPS } from '../game/idleGovernor'
import { listMapConfigs, resolveBootTarget, resolveEntryKey } from '../utils/mapConfig'
import { loadBootTarget } from '../lib/bootTarget'
import { useRoomStore } from '../stores/useRoomStore'
import { useFocusStore } from '../stores/useFocusStore'
import { useRoomUiStore } from '../stores/useRoomUiStore'
import { useOpenHouseUiStore } from '../stores/useOpenHouseUiStore'

// `entryMapKey` pins the first map (the guest-usable /openhouse page boots straight into the campus,
// ignoring the registry and the resume point); `entrySpawnAt` ({ x, y } in map px) stands the avatar
// somewhere specific there, e.g. in front of a deep-linked building.
export default function GameCanvas({ active = true, onOpenView, entryMapKey = null, entrySpawnAt = null }) {
  const containerRef = useRef(null)
  const entryRef = useRef({ mapKey: entryMapKey, spawnAt: entrySpawnAt })
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

  const currentMapOwnerUid = useWorldStore((s) => s.currentMapOwnerUid)
  const currentMapKey      = useWorldStore((s) => s.currentMapKey)
  const remotePlayers      = useWorldStore((s) => s.remotePlayers)
  const controlMode        = useUserStore((s) => s.controlMode)

  const [isBooting, setIsBooting] = useState(true)
  const [isSwitchingMap, setIsSwitchingMap] = useState(false)
  const [bootError, setBootError] = useState(false)

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

  useEffect(() => {
    let game = null
    let cancelled = false
    const unsubs = []

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
      game.registry.set('controlMode', useUserStore.getState().controlMode)
      game.scene.start('MapScene', { mapKey: assetUrlsRef.current.mapKey, spawn: null, spawnAt: assetUrlsRef.current.spawnAt ?? null })
      gameRef.current = game
      // Dev-only QA handle (e.g. teleport the player from the console); stripped from production builds.
      if (import.meta.env.DEV) window.__rcGame = game
      game.events.on('mapSceneReady', () => {
        setIsBooting(false)
        setIsSwitchingMap(false)
      })
      game.events.on('mapLoadFailed', ({ mapKey }) => {
        // Never boot into a map that fails to load again on the next reload.
        useResumeStore.getState().forget(mapKey)
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
      game.events.on('mapChangeRequested', async ({ mapKey, spawn, spawnAt }) => {
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
          game.scene.start('MapScene', { mapKey, spawn, spawnAt: spawnAt ?? null })
        } catch (e) {
          console.error('[GameCanvas] map switch failed:', e)
          setIsSwitchingMap(false)
        } finally {
          switching = false
        }
      })
      // Where the player stands, every 2 s while moving: remembered so the app resumes there.
      game.events.on('playerSampled', ({ mapKey, x, y, facing, label }) => useResumeStore.getState().record(mapKey, { x, y, facing, label }))
      // School Hub zones (ADR 0018) -> UI state; panels render in SchoolWorldLayer.
      game.events.on('focusSeatEntered', ({ seatId }) => useSchoolWorldStore.getState().openPanel({ type: 'focus', seatId }))
      game.events.on('boardEntered', ({ boardId }) => useSchoolWorldStore.getState().openPanel(
        boardId === 'leaderboard' ? { type: 'leaderboard' } : { type: 'board', id: boardId },
      ))
      game.events.on('toolEntered', ({ route }) => useSchoolWorldStore.getState().requestTool(route))
      // Study room (ADR-0023): the desk seat opens the focus setup; taps edit the room while decorating.
      game.events.on('roomSeatEntered', () => {
        if (useAuthStore.getState().user && useFocusStore.getState().status === 'idle') useRoomUiStore.getState().open('focus')
      })
      game.events.on('roomTap', ({ x, y }) => {
        if (useRoomStore.getState().tapRoom(x, y)) game.events.emit('roomChanged')
      })
      // Open House campus: door zones and the directory board feed the faculty UI; the UI walks the avatar.
      const campusUi = useOpenHouseUiStore.getState()
      game.events.on('buildingDoorEntered', ({ buildingId }) => campusUi.setDoor(buildingId))
      game.events.on('buildingDoorExited', ({ buildingId }) => campusUi.clearDoor(buildingId))
      game.events.on('directoryEntered', () => campusUi.setNearDirectory(true))
      game.events.on('directoryExited', () => campusUi.setNearDirectory(false))
      campusUi.setWalker((tx, ty) => game.events.emit('campusWalkTo', { tx, ty }))
      game.registry.set('roomDecorating', useRoomStore.getState().decorating)
      unsubs.push(useRoomStore.subscribe((s, prev) => {
        if (s.decorating !== prev.decorating) game.registry.set('roomDecorating', s.decorating)
        if (s.layout !== prev.layout || s.catalog !== prev.catalog) game.events.emit('roomChanged')
      }))
      unsubs.push(useFocusStore.subscribe((s, prev) => {
        if (s.status !== prev.status) game.events.emit('roomChanged')
      }))
    }

    // Resolve entry map configs + cloud URLs first, then let the ResizeObserver boot.
    ;(async () => {
      const pinned = entryRef.current.mapKey
      if (pinned) {
        // A page that pins its map needs no registry read (guests cannot list it) and no resume.
        const data = await loadSceneData(pinned)
        if (cancelled) return
        assetUrlsRef.current = { ...data, mapKey: pinned, spawnAt: entryRef.current.spawnAt }
        useSchoolWorldStore.getState().setEntryMapKey(pinned)
        useWorldStore.getState().setCurrentMapKey(pinned)
        if (containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect()
          if (width > 0 && height > 0) bootGame(width, height)
        }
        return
      }
      const maps = await listMapConfigs()
      // Boot where the player left off when that spot is usable, else the normal entry map.
      const normalEntry = resolveEntryKey(maps)
      const { mapKey: entryKey, point, data } = await loadBootTarget({
        target: resolveBootTarget(maps, useResumeStore.getState()),
        entryKey: normalEntry,
        load: loadSceneData,
        onResumeFailed: (key, e) => {
          console.warn('[GameCanvas] resume map failed, using the entry map:', key, e)
          useResumeStore.getState().forget(key)
        },
      })
      if (cancelled) return
      assetUrlsRef.current = { ...data, mapKey: entryKey, spawnAt: point ? { x: point.x, y: point.y } : null }
      // Leaving the School Hub returns to the normal entry map, not to wherever the app resumed.
      useSchoolWorldStore.getState().setEntryMapKey(normalEntry)
      useWorldStore.getState().setCurrentMapKey(entryKey)
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
      useOpenHouseUiStore.getState().setWalker(null)
      useOpenHouseUiStore.getState().reset()
      unsubs.forEach((off) => off())
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
    if (mapKey) game.events.emit('mapChangeRequested', { mapKey, spawn: null, spawnAt: mapChangeRequest.spawnAt ?? null })
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

  // The switch is over (loaded or failed): warping is allowed again.
  useEffect(() => {
    if (!isSwitchingMap) useSchoolWorldStore.getState().clearMapSwitching()
  }, [isSwitchingMap])

  // Leaving or hiding the page: send the pending resume point now instead of waiting 10 s.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') flushResumeSync()
    }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flushResumeSync)
    return () => {
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flushResumeSync)
    }
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

  return (
    <>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      />
      {bootError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6 px-sky-bg">
          <div className="px-card px-6 py-6 flex flex-col items-center gap-4 max-w-sm text-center animate-pop">
            <span className="text-4xl" aria-hidden="true">🛠️</span>
            <span className="thai-font text-sm text-ink leading-relaxed">
              โหลดแผนที่ไม่สำเร็จ — เซิร์ฟเวอร์ asset อาจไม่พร้อมใช้งานชั่วคราว
            </span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-btn rpg-btn-primary pixel-font text-xs px-5 py-2.5 rounded-lg"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      )}
      {isBooting && !bootError && (
        <div className="absolute inset-0 z-50">
          <LoadingScene />
        </div>
      )}
      <WarpTransition active={isSwitchingMap && !isBooting} />
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
          color: 'var(--color-ink)',
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
