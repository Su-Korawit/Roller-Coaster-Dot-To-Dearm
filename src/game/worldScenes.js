import Phaser from 'phaser'
import { MBTI_TYPES, GAME_ASSETS, GAME_ASSET_BY_KEY, localMapPath, mapStoragePath } from './assetManifest'
import { cloudAsset } from '../utils/cloudAsset'
import { getMapConfig, DEFAULT_MAP_CONFIGS } from '../utils/mapConfig'
import { updateSelf } from '../lib/presence'
import { EMOTE_BY_ID } from '../constants/emotes'
import { parseMapMeta } from '../utils/tiledMapMeta'
import { useRoomStore } from '../stores/useRoomStore'
import { useFocusStore } from '../stores/useFocusStore'
import { focusProgress } from '../room/focusProgress'
import { renderRoom } from './roomRender'

// 0 = Basic_Charakter (1 ตัว)
// 1 = MBTI rotation (16 ตัว สลับทุก 1 วิ)
const CHARACTER_MODE = 1

const SPEED = 80
const SPRINT_MULTIPLIER = 2
const ARRIVE_THRESHOLD = 4
const DOUBLE_CLICK_MS = 300
const JOYSTICK_DEADZONE = 15   // screen px — below this the avatar stays put (the "rest" zone near the press point)
const JOYSTICK_SPRINT   = 60   // screen px — at/beyond this distance the avatar sprints
const DEFAULT_CONTROL_MODE = 'joystick'

const PLAYER_KEY = 'Basic_Charakter'

// Layers drawn ABOVE the player so avatars pass behind tree canopies and roofs. They are
// ignored by the "non-colliding tile covers a collider" rule (see applyCollision).
const OVERHEAD_DEPTH = { Canopy: 20, Roof: 21 }
const ROOF_FADED_ALPHA = 0.12

// Ambient wildlife (maps with config.critters): spritesheets from public/assets/sprites/Characters.
const CRITTER_SHEETS = {
  chicken: { key: 'critter_chicken', file: 'Free_Chicken_Sprites.png', frame: 16, idle: [0, 1], walk: [4, 5, 6], speed: 9 },
  cow:     { key: 'critter_cow',     file: 'Free_Cow_Sprites.png',     frame: 32, idle: [0],    walk: [0, 1, 2], speed: 6 },
}
export const getZoom = (w) => w < 768 ? 1.5 : w < 1024 ? 3 : 2.5

// ── Asset helpers ─────────────────────────────────────────────────────────────

async function resolveAssetUrls() {
  const entries = await Promise.all(
    GAME_ASSETS.map(async (a) => {
      const url = await cloudAsset(a.storagePath, { fallback: a.localPath })
      return [a.key, url ?? a.localPath]
    })
  )
  return Object.fromEntries(entries)
}

function urlFor(registry, key) {
  const urls = registry.get('assetUrls') || {}
  return urls[key] ?? GAME_ASSET_BY_KEY[key]?.localPath ?? null
}

const LOCAL_BY_STORAGE = Object.fromEntries(GAME_ASSETS.map((a) => [a.storagePath, a.localPath]))

async function resolveMapTilesets(cfg) {
  const out = {}
  await Promise.all(
    Object.entries(cfg.tilesets || {}).map(async ([name, storagePath]) => {
      const local = LOCAL_BY_STORAGE[storagePath] ?? null
      const url = await cloudAsset(storagePath, { fallback: local })
      out[name] = { url: url ?? local, local }
    }),
  )
  return out
}

function reloadLocal(scene, key, spec) {
  if (!spec?.local) return
  if (spec.kind === 'spritesheet')    scene.load.spritesheet(key, spec.local, spec.frameConfig)
  else if (spec.kind === 'tilemap')   scene.load.tilemapTiledJSON(key, spec.local)
  else                                scene.load.image(key, spec.local)
}

// When a cloud asset 500s/404s mid-load, fall back to its local public/ copy so
// the map still renders. Each key is retried at most once to avoid loops.
function attachLocalFallback(scene, localByKey) {
  const retried = new Set()
  const handler = (file) => {
    const spec = localByKey[file.key]
    if (!spec || retried.has(file.key)) return
    retried.add(file.key)
    reloadLocal(scene, file.key, spec)
    scene.load.start()
  }
  // preload() re-runs on every scene.start, so remove the listener on shutdown
  // to stop handlers accumulating across map transitions.
  scene.load.on('loaderror', handler)
  scene.events.once('shutdown', () => scene.load.off('loaderror', handler))
}

// Apply per-cell collision: a cell blocks only if no VISIBLE, non-collision layer
// sits ABOVE the topmost collision tile there. Lets the player walk on overpasses.
function applyCollision(scene, map, layerInfos, cfg, player) {
  const isColl = (n) => !!cfg.collision?.[n]
  layerInfos.forEach(({ name, layer }) => {
    if (layer && isColl(name)) layer.setCollisionByExclusion([-1])
  })
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      let cover = -1
      for (let i = layerInfos.length - 1; i >= 0; i--) {
        const { name, layer } = layerInfos[i]
        if (!layer || isColl(name) || layer.visible === false || OVERHEAD_DEPTH[name]) continue
        if (layer.getTileAt(x, y)) { cover = i; break }
      }
      if (cover < 0) continue
      for (let i = 0; i < cover; i++) {
        const { name, layer } = layerInfos[i]
        if (layer && isColl(name)) {
          const t = layer.getTileAt(x, y)
          if (t) t.setCollision(false)
        }
      }
    }
  }
  layerInfos.forEach(({ name, layer }) => {
    if (layer && isColl(name)) scene.physics.add.collider(player, layer)
  })
}

// Resolve all data Phaser needs before booting/switching to one map: character
// URLs, that map's config (via getMapConfig), and a resolved tileset image URL
// per Tiled tileset name. Called once per map (entry boot + each portal switch).
export async function loadSceneData(mapKey) {
  const [assetUrls, mapConfig] = await Promise.all([
    resolveAssetUrls(),
    getMapConfig(mapKey),
  ])
  const tilesetUrls = await resolveMapTilesets(mapConfig)
  // Resolve the map JSON URL (uploaded maps live in Storage, not /maps/*.json).
  // Store it under the map key so MapScene.preload() can use it directly via
  // urlFor() without falling back to the public-folder path that 404s for uploaded maps.
  const mapJsonUrl = await cloudAsset(mapStoragePath(mapKey), { fallback: localMapPath(mapKey) })
  if (!mapJsonUrl) throw new Error(`map-unavailable:${mapKey}`)
  return { assetUrls: { ...assetUrls, [mapKey]: mapJsonUrl }, mapConfig, tilesetUrls }
}

// ── MapScene ────────────────────────────────────────────────────────────────
// One generic, data-driven scene that renders ANY map. It reads `mapKey` and
// `spawn` from init data; the map's config/tilesets are loaded into the registry
// by GameCanvas before the scene starts. Capability flags on the config gate
// presence (multiplayer) and the study room (room). Map switching goes
// through a `mapChangeRequested` game event (NOT scene.restart) so React can
// reload the target map's data before the new scene's preload runs.

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' })
  }

  init(data) {
    this.mapKey = data?.mapKey ?? 'room'
    this.spawnName = data?.spawn ?? null   // null → use map's default spawn
    this.preview = !!data?.preview
    // Always initialise before create() or update() runs — preview mode returns
    // early from create() before the normal _remoteAvatars = new Map() line,
    // causing _tickPresence() to crash on the first frame.
    this._remoteAvatars = new Map()
  }

  preload() {
    const onLoadError = (file) => console.error('Failed to load:', file.src)
    this.load.on('loaderror', onLoadError)
    this.events.once('shutdown', () => this.load.off('loaderror', onLoadError))

    const r = this.registry
    const localByKey = {}

    localByKey[this.mapKey] = { local: localMapPath(this.mapKey), kind: 'tilemap' }
    const mapUrl = urlFor(r, this.mapKey) ?? localMapPath(this.mapKey)
    if (mapUrl) this.load.tilemapTiledJSON(this.mapKey, mapUrl)

    const tiles = r.get('tilesetUrls') ?? {}
    Object.entries(tiles).forEach(([name, { url, local }]) => {
      if (!url) {
        console.warn(`[MapScene] tileset "${name}" unavailable (no cloud URL, no local copy) — skipped`)
        return
      }
      localByKey[name] = { local, kind: 'image' }
      this.load.image(name, url)
    })

    if (CHARACTER_MODE === 0) {
      this.load.spritesheet(PLAYER_KEY, '/assets/sprites/Characters/Play2_Charakter_Spritesheet.png', {
        frameWidth: 48, frameHeight: 48,
      })
    } else {
      MBTI_TYPES.forEach((mbti) => {
        localByKey[mbti] = {
          local: GAME_ASSET_BY_KEY[mbti]?.localPath,
          kind: 'spritesheet',
          frameConfig: { frameWidth: 48, frameHeight: 48 },
        }
        this.load.spritesheet(mbti, urlFor(r, mbti), { frameWidth: 48, frameHeight: 48 })
      })
    }

    if (r.get('mapConfig')?.critters) {
      Object.values(CRITTER_SHEETS).forEach((c) => {
        if (!this.textures.exists(c.key)) {
          this.load.spritesheet(c.key, `/assets/sprites/Characters/${c.file}`, { frameWidth: c.frame, frameHeight: c.frame })
        }
      })
    }

    // Study room maps draw furniture and the desk pot from these generated sheets.
    if (r.get('mapConfig')?.room) {
      for (const key of ['room_items', 'focus_art']) {
        const url = urlFor(r, key)
        const frame = GAME_ASSET_BY_KEY[key]?.frameConfig
        if (url && frame && !this.textures.exists(key)) this.load.spritesheet(key, url, frame)
      }
    }

    attachLocalFallback(this, localByKey)
  }

  create() {
    if (!this.cache.tilemap.exists(this.mapKey)) {
      this.game.events.emit('mapLoadFailed', { mapKey: this.mapKey })
      return
    }
    const map = this.make.tilemap({ key: this.mapKey })
    const cfg = this.registry.get('mapConfig')
      ?? DEFAULT_MAP_CONFIGS[this.mapKey]
      ?? { tilesets: {}, collision: {}, hidden: {} }

    this._multiplayer = !!cfg.multiplayer

    const tilesets = map.tilesets.map((ts) => map.addTilesetImage(ts.name, ts.name)).filter(Boolean)

    const layerInfos = map.layers.map((ld, i) => {
      const layer = map.createLayer(ld.name, tilesets, 0, 0)
      if (layer) {
        layer.setDepth(OVERHEAD_DEPTH[ld.name] ?? i)
        if (cfg.hidden?.[ld.name]) layer.setVisible(false)
      }
      return { name: ld.name, layer }
    })
    const layers = layerInfos.map(l => l.layer).filter(Boolean)

    const scaleX   = this.scale.width / map.widthInPixels
    const scaleY   = this.scale.height / map.heightInPixels
    const mapScale = Math.ceil(Math.max(scaleX, scaleY))

    layers.forEach(layer => layer && layer.setScale(mapScale))

    const worldW = map.widthInPixels * mapScale
    const worldH = map.heightInPixels * mapScale

    this.physics.world.setBounds(0, 0, worldW, worldH)

    const DIRS = [
      { key: 'walk-down',  start: 0,  end: 3  },
      { key: 'walk-up',    start: 4,  end: 7  },
      { key: 'walk-left',  start: 8,  end: 11 },
      { key: 'walk-right', start: 12, end: 15 },
    ]
    // Phaser's AnimationManager is global and scene.start() re-runs create(), so
    // guard every anims.create() with exists(). The textures.exists() check guards
    // the loaderror→retry race where create() can run before a re-queued
    // spritesheet finished loading.
    if (CHARACTER_MODE === 0) {
      DIRS.forEach(({ key, start, end }) => {
        const animKey = `${PLAYER_KEY}-${key}`
        if (!this.anims.exists(animKey) && this.textures.exists(PLAYER_KEY)) {
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNumbers(PLAYER_KEY, { start, end }),
            frameRate: 8,
            repeat: -1,
          })
        }
      })
      const idleKey = `${PLAYER_KEY}-idle`
      if (!this.anims.exists(idleKey) && this.textures.exists(PLAYER_KEY)) {
        this.anims.create({
          key: idleKey,
          frames: this.anims.generateFrameNumbers(PLAYER_KEY, { frames: [0] }),
          frameRate: 1,
          repeat: 0,
        })
      }
      this.currentMbti = PLAYER_KEY
    } else {
      MBTI_TYPES.forEach(mbti => {
        if (!this.textures.exists(mbti)) return
        DIRS.forEach(({ key, start, end }) => {
          const animKey = `${mbti}-${key}`
          if (!this.anims.exists(animKey)) {
            this.anims.create({
              key: animKey,
              frames: this.anims.generateFrameNumbers(mbti, { start, end }),
              frameRate: 8,
              repeat: -1,
            })
          }
        })
        const idleKey = `${mbti}-idle`
        if (!this.anims.exists(idleKey)) {
          this.anims.create({
            key: idleKey,
            frames: this.anims.generateFrameNumbers(mbti, { frames: [0] }),
            frameRate: 1,
            repeat: 0,
          })
        }
      })
      const chosen = this.registry.get('selectedMbti')
      this.mbtiIndex   = Math.max(0, MBTI_TYPES.indexOf(chosen))
      this.currentMbti = MBTI_TYPES[this.mbtiIndex]
    }

    // Spawn at the named Spawns-layer object (or this map's default), falling
    // back to map center. parseMapMeta needs the raw Tiled JSON, which Phaser
    // caches under the tilemap key.
    const rawJson = this.cache.tilemap.get(this.mapKey)?.data
    const meta = rawJson ? parseMapMeta(rawJson) : { spawns: [], portals: [], defaultSpawnName: null, interactions: [], labels: [] }
    this._interactions = meta.interactions ?? []
    this._labels = meta.labels ?? []
    const spawnName = this.spawnName ?? cfg.defaultSpawn ?? meta.defaultSpawnName
    const spawnObj = meta.spawns.find((s) => s.name === spawnName) ?? meta.spawns[0] ?? null
    const spawnX = (spawnObj ? spawnObj.x : (map.width / 2) * 16) * mapScale
    const spawnY = (spawnObj ? spawnObj.y : (map.height / 2) * 16) * mapScale

    if (this.preview) {
      // Draw spawn pins
      meta.spawns.forEach((s) => {
        const px = s.x * mapScale
        const py = s.y * mapScale
        const pin = this.add.graphics()
        pin.fillStyle(0x22cc44, 0.9)
        pin.fillCircle(px, py, 6 * mapScale)
        pin.setDepth(20)
        const label = this.add.text(px + 8 * mapScale, py - 6 * mapScale, s.name, {
          fontSize: `${8 * mapScale}px`,
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
        })
        label.setDepth(21)
      })
      // Draw portal rects
      meta.portals.forEach((p) => {
        const rect = this.add.graphics()
        rect.fillStyle(0x4488ff, 0.4)
        rect.fillRect(p.x * mapScale, p.y * mapScale, p.width * mapScale, p.height * mapScale)
        rect.lineStyle(2, 0x4488ff, 0.9)
        rect.strokeRect(p.x * mapScale, p.y * mapScale, p.width * mapScale, p.height * mapScale)
        rect.setDepth(20)
      })
      // Draw label text (admin preview)
      this._labels.forEach((lb) => {
        const txt = this.add.text(lb.x * mapScale, lb.y * mapScale, lb.text, {
          fontSize: `${8 * mapScale}px`,
          color: lb.color,
          // Parchment name-plate so labels stay legible over lawns, paths and roofs.
          backgroundColor: 'rgba(243, 229, 194, 0.94)',
          padding: { x: 3 * mapScale, y: 1 * mapScale },
        })
        txt.setDepth(22)
        txt.setOrigin(0.5, 1)
      })
      // Fit camera to map (cover — no black borders)
      const fitZoom = Math.max(
        this.scale.width / worldW,
        this.scale.height / worldH,
      )
      this.cameras.main.setZoom(fitZoom)
      this.cameras.main.centerOn(worldW / 2, worldH / 2)
      return   // skip all player/physics/input/presence setup
    }

    this.player = this.physics.add.sprite(spawnX, spawnY, this.currentMbti)
    this.player.setScale(mapScale)
    this.player.body.setSize(16, 20)
    this.player.body.setOffset(16, 12)
    this.player.setDepth(10)
    this.player.setCollideWorldBounds(true)
    this.player.play(`${this.currentMbti}-idle`)

    applyCollision(this, map, layerInfos, cfg, this.player)
    this._initRoofs(layerInfos, map)
    this._spawnCritters(meta.critters ?? [], mapScale)

    this._mapScale = mapScale
    this._renderLabels(mapScale)

    if (cfg.room) {
      renderRoom(this, () => {
        const { layout, catalog } = useRoomStore.getState()
        const focus = useFocusStore.getState()
        return {
          layout,
          catalog,
          progress: focus.status === 'running' ? focusProgress({ startedAt: focus.startedAt, plannedMin: focus.plannedMin }) : 0,
          lit: focus.status === 'running',
        }
      })
    }

    this._remoteAvatars = new Map()
    this._currentDir    = 'down'

    const onRemoteChanged = () => {
      const players = this.registry.get('remotePlayers') ?? {}
      const selfUid = this.registry.get('selfUid') ?? ''
      this._reconcileRemotePlayers(players, selfUid)
    }
    this.game.events.on('remotePlayersChanged', onRemoteChanged)
    // Share-image capture hides other players' name labels (privacy: no names by default).
    this._namesVisible = true
    const onNamesVisible = (visible) => {
      this._namesVisible = !!visible
      for (const entry of this._remoteAvatars.values()) entry.label.setVisible(this._namesVisible)
    }
    this.game.events.on('setNamesVisible', onNamesVisible)
    this.events.once('shutdown', () => {
      this.game.events.off('remotePlayersChanged', onRemoteChanged)
      this.game.events.off('setNamesVisible', onNamesVisible)
      for (const entry of this._remoteAvatars.values()) {
        entry.sprite.destroy()
        entry.label.destroy()
        entry.bubble?.destroy()
      }
      this._remoteAvatars.clear()
      this._selfBubble?.destroy()
      this._selfBubble = null
    })

    // Block portal re-fire for 500ms after (re)spawn so arriving on top of a
    // return portal doesn't immediately bounce the player back.
    this.transitioning = true
    this.time.delayedCall(500, () => { this.transitioning = false })

    // Portals: one overlap zone per Portals-layer object. Switching maps goes
    // through the game event so GameCanvas can reload the target's data (config/
    // tilesets) into the registry before the next scene's preload runs.
    meta.portals.forEach((p) => {
      if (!p.target) return
      const dz = this.add.zone(
        p.x * mapScale + (p.width * mapScale) / 2,
        p.y * mapScale + (p.height * mapScale) / 2,
        p.width * mapScale,
        p.height * mapScale,
      )
      this.physics.world.enable(dz)
      dz.body.setAllowGravity(false)
      dz.body.moves = false
      this.physics.add.overlap(this.player, dz, () => {
        if (this.transitioning) return
        this.transitioning = true
        this.game.events.emit('mapChangeRequested', { mapKey: p.target, spawn: p.targetSpawn ?? null })
      })
    })

    this._activeZones = new Set()
    this._zoneDefs = []
    this._interactions.forEach((it) => {
      if (!it.action) return
      const zone = this.add.zone(
        it.x * mapScale + (it.width * mapScale) / 2,
        it.y * mapScale + (it.height * mapScale) / 2,
        it.width * mapScale,
        it.height * mapScale,
      )
      this.physics.world.enable(zone)
      zone.body.setAllowGravity(false)
      zone.body.moves = false
      this._zoneDefs.push({
        zone, action: it.action, shopId: it.shopId ?? null,
        seatId: it.seatId ?? null, boardId: it.boardId ?? null, route: it.route ?? null,
      })
    })

    this.marker = this.add.graphics()
    this.marker.fillStyle(0xffff00, 1)
    this.marker.fillCircle(0, 0, 4)
    this.marker.setDepth(11)
    this.marker.setVisible(false)

    this.isMoving = false
    this.targetX  = 0
    this.targetY  = 0
    this.isSprinting  = false
    this.lastClickTime = 0
    this.joystickActive    = false
    this.joystickOriginX   = 0
    this.joystickOriginY   = 0
    this.joystickPointerId = -1

    this.input.on('pointerdown', (pointer) => {
      // Study room: while decorating, a tap edits the room instead of moving the avatar.
      if (cfg.room && this.registry.get('roomDecorating')) {
        this.game.events.emit('roomTap', { x: pointer.worldX / mapScale, y: pointer.worldY / mapScale })
        return
      }
      const controlMode = this.registry.get('controlMode') ?? DEFAULT_CONTROL_MODE
      if (controlMode === 'joystick') {
        // Second finger = pinch-zoom; don't hijack it as a joystick.
        if (this.input.pointer2.isDown) return
        this.joystickActive    = true
        this.joystickOriginX   = pointer.x
        this.joystickOriginY   = pointer.y
        this.joystickPointerId = pointer.id
        return
      }

      // click-to-move
      const now = this.time.now
      if (now - this.lastClickTime < DOUBLE_CLICK_MS) {
        this.isSprinting = !this.isSprinting
      }
      this.lastClickTime = now
      this.targetX  = pointer.worldX
      this.targetY  = pointer.worldY
      this.isMoving = true
      this.marker.setPosition(pointer.worldX, pointer.worldY).setVisible(true)
    })

    const cancelJoystick = (pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.joystickActive = false
        this.player.setVelocity(0, 0)
        this.player.play(`${this.currentMbti}-idle`)
      }
    }
    this.input.on('pointerup', cancelJoystick)
    this.input.on('pointerupoutside', cancelJoystick)

    this.cameras.main.setBounds(0, 0, worldW, worldH)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    const initZoom = this.registry.get('savedZoom') ?? getZoom(this.scale.width)
    this.registry.set('savedZoom', null)
    this.cameras.main.setZoom(initZoom)
    this.game.events.emit('zoomChanged', initZoom)
    this.cameras.main.centerOn(this.player.x, this.player.y)

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const current = this.cameras.main.zoom
      const next = Phaser.Math.Clamp(current + (deltaY > 0 ? -0.1 : 0.1), 1.0, 3.0)
      this.cameras.main.setZoom(next)
      this.game.events.emit('zoomChanged', next)
    })

    this.input.addPointer(1)
    this.lastPinchDist = null

    this.wasd = this.input.keyboard.addKeys({
      up:     Phaser.Input.Keyboard.KeyCodes.W,
      down:   Phaser.Input.Keyboard.KeyCodes.S,
      left:   Phaser.Input.Keyboard.KeyCodes.A,
      right:  Phaser.Input.Keyboard.KeyCodes.D,
      sprint: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    })
    this.usingWasd = false

    // this.scale is the game-level ScaleManager (not a per-scene plugin), so its
    // listeners aren't cleared on scene shutdown — remove ours explicitly or they
    // accumulate across every map transition.
    const onResize = (gameSize) => {
      const newZoom = getZoom(gameSize.width)
      this.cameras.main.setSize(gameSize.width, gameSize.height)
      this.cameras.main.setZoom(newZoom)
      this.game.events.emit('zoomChanged', newZoom)
    }
    this.scale.on('resize', onResize)
    this.events.once('shutdown', () => this.scale.off('resize', onResize))

    this.game.events.emit('mapSceneReady')
  }

  update(_time, delta) {
    if (this.preview) return
    this._tickPresence()
    this._tickRoofs()
    this._tickCritters(delta ?? 16)

    // ── Interaction zones (checked every 10th frame) ──
    this._zoneTick = (this._zoneTick ?? 0) + 1
    if (this._zoneTick % 10 === 0) {
      if (this._zoneDefs) {
        for (const def of this._zoneDefs) {
          const overlapping = this.physics.world.overlap(this.player, def.zone)
          const was = this._activeZones.has(def.zone)
          if (overlapping && !was) {
            this._activeZones.add(def.zone)
            if (def.action === 'focusSeat') this.game.events.emit('focusSeatEntered', { seatId: def.seatId })
            else if (def.action === 'board') this.game.events.emit('boardEntered', { boardId: def.boardId })
            else if (def.action === 'tool') this.game.events.emit('toolEntered', { route: def.route })
            else if (def.action === 'roomSeat') this.game.events.emit('roomSeatEntered', { seatId: def.seatId })
          } else if (!overlapping && was) {
            this._activeZones.delete(def.zone)
            if (def.action === 'focusSeat') this.game.events.emit('focusSeatExited', { seatId: def.seatId })
            else if (def.action === 'board') this.game.events.emit('boardExited', { boardId: def.boardId })
            else if (def.action === 'roomSeat') this.game.events.emit('roomSeatExited', { seatId: def.seatId })
          }
        }
      }
    }

    const p1 = this.input.pointer1
    const p2 = this.input.pointer2
    if (p1.isDown && p2.isDown) {
      if (this.joystickActive) {
        this.joystickActive = false
        this.player.setVelocity(0, 0)
      }
      const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y)
      if (this.lastPinchDist !== null) {
        const next = Phaser.Math.Clamp(
          this.cameras.main.zoom + (dist - this.lastPinchDist) * 0.005,
          1.0, 3.0
        )
        this.cameras.main.setZoom(next)
        this.game.events.emit('zoomChanged', next)
      }
      this.lastPinchDist = dist
    } else {
      this.lastPinchDist = null
    }

    const { up, down, left, right } = this.wasd
    const wasdActive = up.isDown || down.isDown || left.isDown || right.isDown

    if (wasdActive) {
      this.usingWasd = true
      this.isMoving = false
      this.marker.setVisible(false)

      const spd = SPEED * (this.wasd.sprint.isDown ? SPRINT_MULTIPLIER : 1)
      let vx = 0, vy = 0
      if (left.isDown)  vx -= spd
      if (right.isDown) vx += spd
      if (up.isDown)    vy -= spd
      if (down.isDown)  vy += spd
      if (vx !== 0 && vy !== 0) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2 }
      this.player.setVelocity(vx, vy)

      if (vx === 0 && vy === 0) {
        const idleKey = `${this.currentMbti}-idle`
        if (this.player.anims.currentAnim?.key !== idleKey) this.player.play(idleKey)
      } else {
        const dir = Math.abs(vx) >= Math.abs(vy)
          ? (vx > 0 ? 'walk-right' : 'walk-left')
          : (vy > 0 ? 'walk-down' : 'walk-up')
        this._currentDir = dir
        const animKey = `${this.currentMbti}-${dir}`
        if (this.player.anims.currentAnim?.key !== animKey) this.player.play(animKey)
      }
      return
    }

    if (this.usingWasd) {
      this.usingWasd = false
      this.player.setVelocity(0, 0)
      this.player.play(`${this.currentMbti}-idle`)
    }

    const controlMode = this.registry.get('controlMode') ?? DEFAULT_CONTROL_MODE
    if (controlMode === 'joystick') {
      // Find the specific pointer that started the joystick
      const allPointers = [this.input.pointer1, this.input.pointer2]
      const ptr = allPointers.find(p => p.id === this.joystickPointerId) ?? this.input.activePointer
      if (!this.joystickActive || !ptr.isDown) {
        if (this.joystickActive) {
          this.joystickActive = false
          this.player.setVelocity(0, 0)
          this.player.play(`${this.currentMbti}-idle`)
        }
        return
      }
      const dx  = ptr.x - this.joystickOriginX
      const dy  = ptr.y - this.joystickOriginY
      const mag = Math.hypot(dx, dy)
      if (mag < JOYSTICK_DEADZONE) {
        this.player.setVelocity(0, 0)
        const idleKey = `${this.currentMbti}-idle`
        if (this.player.anims.currentAnim?.key !== idleKey) this.player.play(idleKey)
        return
      }
      const jspd = SPEED * (mag >= JOYSTICK_SPRINT ? SPRINT_MULTIPLIER : 1)
      const vx = (dx / mag) * jspd
      const vy = (dy / mag) * jspd
      this.player.setVelocity(vx, vy)
      const dir = Math.abs(vx) >= Math.abs(vy)
        ? (vx > 0 ? 'walk-right' : 'walk-left')
        : (vy > 0 ? 'walk-down' : 'walk-up')
      this._currentDir = dir
      const animKey = `${this.currentMbti}-${dir}`
      if (this.player.anims.currentAnim?.key !== animKey) this.player.play(animKey)
      return
    }

    // joystick was active but controlMode switched — stop the avatar
    if (this.joystickActive) {
      this.joystickActive = false
      this.player.setVelocity(0, 0)
      this.player.play(`${this.currentMbti}-idle`)
    }

    if (!this.isMoving) return

    const spd = SPEED * (this.isSprinting ? SPRINT_MULTIPLIER : 1)
    const dx       = this.targetX - this.player.x
    const dy       = this.targetY - this.player.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < ARRIVE_THRESHOLD) {
      this.player.setVelocity(0, 0)
      this.player.play(`${this.currentMbti}-idle`)
      this.isMoving = false
      this.isSprinting = false
      this.marker.setVisible(false)
      return
    }

    this.player.setVelocity(
      (dx / distance) * spd,
      (dy / distance) * spd,
    )

    const dir = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'walk-right' : 'walk-left')
      : (dy > 0 ? 'walk-down'  : 'walk-up')
    this._currentDir = dir

    const animKey = `${this.currentMbti}-${dir}`
    if (this.player.anims.currentAnim?.key !== animKey) {
      this.player.play(animKey)
    }
  }

  _renderLabels(mapScale, depth = 6) {
    (this._labels ?? []).forEach((lb) => {
      const txt = this.add.text(lb.x * mapScale, lb.y * mapScale, lb.text, {
        fontSize: `${8 * mapScale}px`,
        color: lb.color,
        // Parchment name-plate so labels stay legible over lawns, paths and roofs.
        backgroundColor: 'rgba(243, 229, 194, 0.94)',
        padding: { x: 3 * mapScale, y: 1 * mapScale },
      })
      txt.setDepth(depth)
      txt.setOrigin(0.5, 1)
    })
  }

  // Create / update / destroy remote avatar sprites to match the presence snapshot.
  _reconcileRemotePlayers(players, selfUid) {
    const scale = this._mapScale

    for (const [uid, entry] of this._remoteAvatars) {
      if (!players[uid]) {
        entry.sprite.destroy()
        entry.label.destroy()
        entry.bubble?.destroy()
        this._remoteAvatars.delete(uid)
      }
    }

    for (const [uid, state] of Object.entries(players)) {
      if (uid === selfUid) continue
      const { x, y, dir = 'walk-down', moving = false, mbti = 'INTJ', name = '' } = state
      const animKey = moving ? `${mbti}-${dir}` : `${mbti}-idle`

      if (this._remoteAvatars.has(uid)) {
        const entry = this._remoteAvatars.get(uid)
        entry.targetX = x
        entry.targetY = y
        if (this.anims.exists(animKey) && entry.sprite.anims.currentAnim?.key !== animKey) {
          entry.sprite.play(animKey)
        }
        entry.label.setText(state.badge === 'teacher' ? `🎓 ${name}` : name)
        this._syncBubble(entry, state.emote)
      } else {
        const spriteMbti = this.textures.exists(mbti) ? mbti : MBTI_TYPES[0]
        const sprite = this.add.sprite(x, y, spriteMbti)
        sprite.setScale(scale)
        sprite.setDepth(8)
        if (this.anims.exists(animKey)) sprite.play(animKey)

        const label = this.add.text(x, y - 24 * scale, state.badge === 'teacher' ? `🎓 ${name}` : name, {
          fontSize: '8px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
        })
        label.setDepth(9)
        label.setOrigin(0.5, 1)
        label.setVisible(this._namesVisible !== false)

        const entry = { sprite, label, bubble: null, targetX: x, targetY: y }
        this._remoteAvatars.set(uid, entry)
        this._syncBubble(entry, state.emote)
      }
    }
  }

  // Roofs: group the Roof layer's tiles into connected buildings; the one the player is standing
  // under fades out (so the interior shows) and fades back in when they leave.
  _initRoofs(layerInfos, map) {
    this._roofs = []
    const info = layerInfos.find((l) => l.name === 'Roof')
    const layer = info?.layer
    if (!layer || layer.visible === false) return
    const W = map.width
    const seen = new Set()
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < W; x++) {
        const key = y * W + x
        if (seen.has(key) || !layer.getTileAt(x, y)) continue
        const cells = new Set()
        const tiles = []
        const queue = [[x, y]]
        seen.add(key)
        while (queue.length) {
          const [cx, cy] = queue.pop()
          cells.add(cy * W + cx)
          tiles.push(layer.getTileAt(cx, cy))
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx
            const ny = cy + dy
            const nk = ny * W + nx
            if (nx < 0 || ny < 0 || nx >= W || ny >= map.height || seen.has(nk) || !layer.getTileAt(nx, ny)) continue
            seen.add(nk)
            queue.push([nx, ny])
          }
        }
        this._roofs.push({ cells, tiles, alpha: 1 })
      }
    }
    this._roofMapW = W
  }

  _tickRoofs() {
    if (!this._roofs?.length || !this.player) return
    this._roofTick = (this._roofTick ?? 0) + 1
    if (this._roofTick % 4 !== 0) return
    const tx = Math.floor(this.player.x / this._mapScale / 16)
    const ty = Math.floor(this.player.y / this._mapScale / 16)
    const here = ty * this._roofMapW + tx
    for (const roof of this._roofs) {
      const target = roof.cells.has(here) ? ROOF_FADED_ALPHA : 1
      if (Math.abs(roof.alpha - target) < 0.01) continue
      roof.alpha += (target - roof.alpha) * 0.35
      if (Math.abs(roof.alpha - target) < 0.02) roof.alpha = target
      for (const t of roof.tiles) t.alpha = roof.alpha
    }
  }

  // Ambient wildlife: slow wander around a home point; pauses, faces its heading.
  _spawnCritters(list, mapScale) {
    this._critters = []
    for (const c of list) {
      const def = CRITTER_SHEETS[c.kind]
      if (!def || !this.textures.exists(def.key)) continue
      const idleKey = def.key + '-idle'
      const walkKey = def.key + '-walk'
      if (!this.anims.exists(idleKey)) {
        this.anims.create({ key: idleKey, frames: this.anims.generateFrameNumbers(def.key, { frames: def.idle }), frameRate: 2, repeat: -1 })
      }
      if (!this.anims.exists(walkKey)) {
        this.anims.create({ key: walkKey, frames: this.anims.generateFrameNumbers(def.key, { frames: def.walk }), frameRate: 6, repeat: -1 })
      }
      const sprite = this.add.sprite(c.x * mapScale, c.y * mapScale, def.key)
      sprite.setScale(mapScale).setDepth(9).play(idleKey)
      this._critters.push({
        def, sprite, idleKey, walkKey, mapScale,
        homeX: c.x * mapScale, homeY: c.y * mapScale, radius: c.radius * mapScale,
        target: null, wait: 500 + Math.random() * 3000,
      })
    }
  }

  _tickCritters(delta) {
    if (!this._critters?.length) return
    const dt = Math.min(delta, 100) / 1000
    for (const c of this._critters) {
      if (c.target) {
        const dx = c.target.x - c.sprite.x
        const dy = c.target.y - c.sprite.y
        const dist = Math.hypot(dx, dy)
        const step = c.def.speed * c.mapScale * dt
        if (dist <= step) {
          c.sprite.x = c.target.x
          c.sprite.y = c.target.y
          c.target = null
          c.wait = 1500 + Math.random() * 4000
          c.sprite.play(c.idleKey, true)
        } else {
          c.sprite.x += (dx / dist) * step
          c.sprite.y += (dy / dist) * step
          if (Math.abs(dx) > 0.5) c.sprite.setFlipX(dx < 0)
        }
      } else {
        c.wait -= dt * 1000
        if (c.wait <= 0) {
          const a = Math.random() * Math.PI * 2
          const r = Math.random() * c.radius
          c.target = { x: c.homeX + Math.cos(a) * r, y: c.homeY + Math.sin(a) * r * 0.6 }
          c.sprite.play(c.walkKey, true)
        }
      }
    }
  }

  // Emote bubble above a remote avatar: created/updated/destroyed to match `emoteId`.
  _syncBubble(entry, emoteId) {
    const glyph = EMOTE_BY_ID[emoteId]?.glyph
    if (!glyph) { entry.bubble?.destroy(); entry.bubble = null; return }
    if (!entry.bubble) {
      entry.bubble = this.add.text(entry.sprite.x, entry.sprite.y, glyph, { fontSize: `${14 * this._mapScale}px` })
      entry.bubble.setOrigin(0.5, 1).setDepth(12)
    } else if (entry.bubble.text !== glyph) {
      entry.bubble.setText(glyph)
    }
  }

  // Same bubble over the local player, driven by the 'selfEmote' registry key.
  _tickSelfBubble() {
    const glyph = EMOTE_BY_ID[this.registry.get('selfEmote')]?.glyph
    if (!glyph) { this._selfBubble?.destroy(); this._selfBubble = null; return }
    if (!this._selfBubble) {
      this._selfBubble = this.add.text(0, 0, glyph, { fontSize: `${14 * this._mapScale}px` })
      this._selfBubble.setOrigin(0.5, 1).setDepth(12)
    } else if (this._selfBubble.text !== glyph) {
      this._selfBubble.setText(glyph)
    }
    this._selfBubble.x = this.player.x
    this._selfBubble.y = this.player.y - 26 * this._mapScale
  }

  // Runs at the top of update() every frame: lerps remote avatars and (only on
  // multiplayer maps) broadcasts self into the current map's presence room.
  _tickPresence() {
    for (const entry of this._remoteAvatars.values()) {
      entry.sprite.x = Phaser.Math.Linear(entry.sprite.x, entry.targetX, 0.2)
      entry.sprite.y = Phaser.Math.Linear(entry.sprite.y, entry.targetY, 0.2)
      entry.label.x  = entry.sprite.x
      entry.label.y  = entry.sprite.y - 24 * this._mapScale
      if (entry.bubble) { entry.bubble.x = entry.sprite.x; entry.bubble.y = entry.label.y - 10 * this._mapScale }
    }
    this._tickSelfBubble()

    if (!this._multiplayer) return
    const ownerUid = this.registry.get('ownerUid')
    const selfUid  = this.registry.get('selfUid')
    if (ownerUid && selfUid) {
      const payload = {
        x:      this.player.x,
        y:      this.player.y,
        dir:    this._currentDir ?? 'down',
        moving: this.isMoving || this.usingWasd || this.joystickActive,
        mbti:   this.currentMbti,
        name:   this.registry.get('selfName') ?? '',
      }
      // RTDB set() throws on undefined, so only include the key while an emote is active.
      const emote = this.registry.get('selfEmote')
      if (emote) payload.emote = emote
      // Teacher badge: the rules only accept it from a real `teacher` claim.
      const badge = this.registry.get('selfBadge')
      if (badge) payload.badge = badge
      updateSelf(ownerUid, this.mapKey, selfUid, payload)
    }
  }
}
