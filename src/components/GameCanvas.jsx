import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { useSelectStore } from '../stores/useSelectStore'
import { useWorldStore } from '../stores/useWorldStore'
import { useAuthStore } from '../stores/useAuthStore'
import { useUserStore } from '../stores/useUserStore'
import MapPalette from './MapPalette'
import { isEditableTarget } from '../utils/isEditableTarget'
import { joinWorld, leaveWorld, subscribeWorldPlayers } from '../lib/presence'
import { GameScene, IndoorScene, loadSceneData } from '../game/worldScenes'

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
  const remotePlayers      = useWorldStore((s) => s.remotePlayers)
  const controlMode = useUserStore((s) => s.controlMode)

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

  // Keep selfUid and display name in the registry for GameScene to read during update().
  useEffect(() => {
    const game = gameRef.current
    if (!game) return
    game.registry.set('selfUid',  selfUid  ?? '')
    game.registry.set('selfName', user?.displayName ?? '')
  }, [selfUid, user])

  // Push remotePlayers into the registry and notify GameScene to reconcile sprites.
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

  // Arm/disarm presence room whenever the visited map owner changes.
  useEffect(() => {
    if (!currentMapOwnerUid || !selfUid) return

    const selfState = {
      x: 0, y: 0, dir: 'down', moving: false,
      mbti:     selectedMbtiRef.current ?? 'INTJ',
      name:     user?.displayName ?? '',
      photoURL: user?.photoURL ?? null,
    }
    joinWorld(currentMapOwnerUid, selfUid, selfState).catch(() => {})

    if (gameRef.current) {
      gameRef.current.registry.set('ownerUid', currentMapOwnerUid)
      gameRef.current.registry.set('selfUid',  selfUid)
      gameRef.current.registry.set('selfName', user?.displayName ?? '')
    }

    const unsub = subscribeWorldPlayers(currentMapOwnerUid, (snapshot) => {
      useWorldStore.getState().setRemotePlayers(snapshot)
    })

    return () => {
      leaveWorld(currentMapOwnerUid, selfUid)
      unsub()
      useWorldStore.getState().setRemotePlayers({})
    }
  }, [currentMapOwnerUid, selfUid])  // eslint-disable-line react-hooks/exhaustive-deps

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
        scene: [GameScene, IndoorScene],
        scale: { mode: Phaser.Scale.RESIZE, width, height },
      }
      game = new Phaser.Game(config)
      game.registry.set('selectedMbti', selectedMbtiRef.current)
      game.registry.set('assetUrls', assetUrlsRef.current.assetUrls)
      game.registry.set('mapConfigs', assetUrlsRef.current.mapConfigs)
      game.registry.set('tilesetUrls', assetUrlsRef.current.tilesetUrls)
      game.registry.set('mapObjects', useWorldStore.getState().mapObjects)
      game.registry.set('editMode', useWorldStore.getState().editMode)
      game.registry.set('selectedItemKey', useWorldStore.getState().selectedItemKey)
      game.registry.set('controlMode', useUserStore.getState().controlMode)
      gameRef.current = game
      game.events.on('zoomChanged', (v) => {
        setZoom(+v.toFixed(1))
        setShowZoom(true)
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = setTimeout(() => setShowZoom(false), 1500)
      })
    }

    // Resolve map configs + cloud URLs first, then let the ResizeObserver boot.
    loadSceneData().then((data) => {
      if (cancelled) return
      assetUrlsRef.current = data
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        if (width > 0 && height > 0) bootGame(width, height)
      }
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

  return (
    <>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      />
      <MapPalette />
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
