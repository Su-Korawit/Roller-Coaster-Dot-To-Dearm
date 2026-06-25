import Phaser from 'phaser'
import { useWorldStore } from '../stores/useWorldStore'
import { MAP_ITEM_BY_KEY } from '../constants/mapItems'
import { MBTI_TYPES, GAME_ASSETS, GAME_ASSET_BY_KEY } from './assetManifest'
import { cloudAsset } from '../utils/cloudAsset'
import { getMapConfig, DEFAULT_MAP_CONFIGS } from '../utils/mapConfig'
import { updateSelf } from '../lib/presence'
import { parseMapMeta } from '../utils/tiledMapMeta'
import { useFarmStore } from '../stores/useFarmStore'
import { currentStage } from '../systems/farmLogic'
import { useFarmDataStore } from '../stores/useFarmDataStore'

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
        if (!layer || isColl(name) || layer.visible === false) continue
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
  const mapJsonUrl = await cloudAsset(`maps/${mapKey}.json`, { fallback: `/maps/${mapKey}.json` })
  return { assetUrls: { ...assetUrls, [mapKey]: mapJsonUrl }, mapConfig, tilesetUrls }
}

// ── MapScene ────────────────────────────────────────────────────────────────
// One generic, data-driven scene that renders ANY map. It reads `mapKey` and
// `spawn` from init data; the map's config/tilesets are loaded into the registry
// by GameCanvas before the scene starts. Capability flags on the config gate
// presence (multiplayer) and decoration editing (editable). Map switching goes
// through a `mapChangeRequested` game event (NOT scene.restart) so React can
// reload the target map's data before the new scene's preload runs.

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' })
  }

  init(data) {
    this.mapKey = data?.mapKey ?? 'test3'
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

    localByKey[this.mapKey] = { local: GAME_ASSET_BY_KEY[this.mapKey]?.localPath, kind: 'tilemap' }
    this.load.tilemapTiledJSON(this.mapKey, urlFor(r, this.mapKey) ?? `/maps/${this.mapKey}.json`)

    const tiles = r.get('tilesetUrls') ?? {}
    Object.entries(tiles).forEach(([name, { url, local }]) => {
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

    if (!this.textures.exists('crops')) {
      const cropsUrl = urlFor(this.registry, 'crops')
      if (cropsUrl) this.load.spritesheet('crops', cropsUrl, { frameWidth: 16, frameHeight: 16 })
    }

    attachLocalFallback(this, localByKey)
  }

  create() {
    const map = this.make.tilemap({ key: this.mapKey })
    const cfg = this.registry.get('mapConfig')
      ?? DEFAULT_MAP_CONFIGS[this.mapKey]
      ?? { tilesets: {}, collision: {}, hidden: {} }

    this._multiplayer = !!cfg.multiplayer

    const tilesets = map.tilesets
      .map(ts => map.addTilesetImage(ts.name, ts.name))
      .filter(Boolean)

    const layerInfos = map.layers.map((ld, i) => {
      const layer = map.createLayer(ld.name, tilesets, 0, 0)
      if (layer) {
        layer.setDepth(i)
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
    const meta = rawJson ? parseMapMeta(rawJson) : { spawns: [], portals: [], defaultSpawnName: null, farmTiles: new Set(), interactions: [] }
    this._farmTiles = meta.farmTiles ?? new Set()
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
      meta.labels.forEach((lb) => {
        const txt = this.add.text(lb.x * mapScale, lb.y * mapScale, lb.text, {
          fontSize: `${8 * mapScale}px`,
          color: lb.color,
          stroke: '#ffffff',
          strokeThickness: 1,
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

    this._decorGroup = this.add.group()
    this._mapScale = mapScale
    this._renderDecorations(mapScale)
    this._renderLabels(mapScale)

    const onMapObjectsChanged = () => this._renderDecorations(this._mapScale)
    const onEditModeChanged   = () => this._renderDecorations(this._mapScale)
    this.game.events.on('mapObjectsChanged', onMapObjectsChanged)
    this.game.events.on('editModeChanged',   onEditModeChanged)
    this.events.once('shutdown', () => {
      this.game.events.off('mapObjectsChanged', onMapObjectsChanged)
      this.game.events.off('editModeChanged',   onEditModeChanged)
    })

    this._cropGroup = this.add.group()
    this._renderCrops(mapScale)
    const onFarmChanged = () => this._renderCrops(this._mapScale)
    this.game.events.on('farmChanged', onFarmChanged)
    this.events.once('shutdown', () => this.game.events.off('farmChanged', onFarmChanged))

    // Re-render periodically so deterministic growth advances on screen (1s interval).
    this._cropTimer = this.time.addEvent({
      delay: 1000, loop: true, callback: () => this._renderCrops(this._mapScale),
    })
    this.events.once('shutdown', () => this._cropTimer?.remove())

    this._remoteAvatars = new Map()
    this._currentDir    = 'down'

    const onRemoteChanged = () => {
      const players = this.registry.get('remotePlayers') ?? {}
      const selfUid = this.registry.get('selfUid') ?? ''
      this._reconcileRemotePlayers(players, selfUid)
    }
    this.game.events.on('remotePlayersChanged', onRemoteChanged)
    this.events.once('shutdown', () => {
      this.game.events.off('remotePlayersChanged', onRemoteChanged)
      for (const entry of this._remoteAvatars.values()) {
        entry.sprite.destroy()
        entry.label.destroy()
      }
      this._remoteAvatars.clear()
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
      this._zoneDefs.push({ zone, action: it.action, shopId: it.shopId ?? null })
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
      // Decoration placement only on editable maps while edit mode is on.
      if (cfg.editable && this.registry.get('editMode')) {
        const selectedKey = this.registry.get('selectedItemKey')
        if (selectedKey) {
          useWorldStore.getState().addObject({ key: selectedKey, x: pointer.worldX, y: pointer.worldY })
        }
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
  }

  update() {
    if (this.preview) return
    this._tickPresence()

    // ── Farm tile detection + interaction zones (runs every frame unconditionally) ──
    this._farmTick = (this._farmTick ?? 0) + 1
    if (this._farmTick % 10 === 0) {
      const tx = Math.floor(this.player.x / this._mapScale / 16)
      const ty = Math.floor(this.player.y / this._mapScale / 16)
      const onFarm = this._farmTiles?.has(`${tx}_${ty}`) ?? false
      const key = onFarm ? `${tx}_${ty}` : null
      if (key !== this._lastFarmTile) {
        this._lastFarmTile = key
        this.game.events.emit('farmTileChanged', onFarm ? { tileX: tx, tileY: ty } : null)
      }
      if (this._zoneDefs) {
        for (const def of this._zoneDefs) {
          const overlapping = this.physics.world.overlap(this.player, def.zone)
          const was = this._activeZones.has(def.zone)
          if (overlapping && !was) {
            this._activeZones.add(def.zone)
            if (def.action === 'shop') this.game.events.emit('shopEntered', { shopId: def.shopId })
            else if (def.action === 'chest') this.game.events.emit('chestOpened')
          } else if (!overlapping && was) {
            this._activeZones.delete(def.zone)
            if (def.action === 'shop') this.game.events.emit('shopExited', { shopId: def.shopId })
            else if (def.action === 'chest') this.game.events.emit('chestClosed')
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

  // Destroy and re-spawn all decoration sprites from the registry's mapObjects.
  // Sprites sit above tilemap layers (depth 5) but below the player (depth 10).
  // In edit mode each sprite is interactive — tapping it removes it from the store.
  _renderDecorations(mapScale) {
    this._decorGroup.clear(true, true)
    const objects   = this.registry.get('mapObjects') ?? []
    const editMode  = this.registry.get('editMode') ?? false
    objects.forEach(({ key, x, y }, index) => {
      const item = MAP_ITEM_BY_KEY[key]
      if (!item || !this.textures.exists(item.spriteKey)) return
      const img = this.add.image(x, y, item.spriteKey)
      img.setScale(mapScale * 0.5)
      img.setDepth(5)
      if (editMode) {
        img.setInteractive({ useHandCursor: true })
        img.on('pointerdown', (ptr) => {
          ptr.event.stopPropagation()
          useWorldStore.getState().removeObject(index)
        })
        img.setTint(0xddaaff)
      }
      this._decorGroup.add(img)
    })
  }

  _renderCrops(mapScale) {
    if (!this._cropGroup || !this.textures.exists('crops')) return
    this._cropGroup.clear(true, true)
    const plots = useFarmStore.getState().plots || {}
    const { plants } = useFarmDataStore.getState()
    const now = Date.now()
    for (const [key, plot] of Object.entries(plots)) {
      if (!plot || plot.anchorKey) continue
      const plant = plants[plot.plantId]
      if (!plant) continue
      const stage = currentStage(plot.plantedAt, plot.plantId, now, plants)
      const frame = plant.spriteFrames?.[stage] ?? 0
      const [tx, ty] = key.split('_').map(Number)
      const img = this.add.image(
        (tx + 0.5) * 16 * mapScale,
        (ty + 0.5) * 16 * mapScale,
        'crops',
        frame,
      )
      img.setScale(mapScale).setDepth(9)
      this._cropGroup.add(img)
    }
  }

  _renderLabels(mapScale, depth = 6) {
    (this._labels ?? []).forEach((lb) => {
      const txt = this.add.text(lb.x * mapScale, lb.y * mapScale, lb.text, {
        fontSize: `${8 * mapScale}px`,
        color: lb.color,
        stroke: '#ffffff',
        strokeThickness: 1,
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
        entry.label.setText(name)
      } else {
        const spriteMbti = this.textures.exists(mbti) ? mbti : MBTI_TYPES[0]
        const sprite = this.add.sprite(x, y, spriteMbti)
        sprite.setScale(scale)
        sprite.setDepth(8)
        if (this.anims.exists(animKey)) sprite.play(animKey)

        const label = this.add.text(x, y - 24 * scale, name, {
          fontSize: '8px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
        })
        label.setDepth(9)
        label.setOrigin(0.5, 1)

        this._remoteAvatars.set(uid, { sprite, label, targetX: x, targetY: y })
      }
    }
  }

  // Runs at the top of update() every frame: lerps remote avatars and (only on
  // multiplayer maps) broadcasts self into the current map's presence room.
  _tickPresence() {
    for (const entry of this._remoteAvatars.values()) {
      entry.sprite.x = Phaser.Math.Linear(entry.sprite.x, entry.targetX, 0.2)
      entry.sprite.y = Phaser.Math.Linear(entry.sprite.y, entry.targetY, 0.2)
      entry.label.x  = entry.sprite.x
      entry.label.y  = entry.sprite.y - 24 * this._mapScale
    }

    if (!this._multiplayer) return
    const ownerUid = this.registry.get('ownerUid')
    const selfUid  = this.registry.get('selfUid')
    if (ownerUid && selfUid) {
      updateSelf(ownerUid, this.mapKey, selfUid, {
        x:      this.player.x,
        y:      this.player.y,
        dir:    this._currentDir ?? 'down',
        moving: this.isMoving || this.usingWasd || this.joystickActive,
        mbti:   this.currentMbti,
        name:   this.registry.get('selfName') ?? '',
      })
    }
  }
}
