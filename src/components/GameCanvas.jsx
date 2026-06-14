import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { useSelectStore } from '../stores/useSelectStore'
import { MBTI_TYPES, GAME_ASSETS, GAME_ASSET_BY_KEY } from '../game/assetManifest'
import { cloudAsset } from '../utils/cloudAsset'
import { getMapConfig, DEFAULT_MAP_CONFIGS } from '../utils/mapConfig'

// â”€â”€ CHARACTER MODE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 0 = Basic_Charakter (1 à¸•à¸±à¸§)
// 1 = MBTI rotation (16 à¸•à¸±à¸§ à¸ªà¸¥à¸±à¸šà¸—à¸¸à¸ 1 à¸§à¸´)
const CHARACTER_MODE = 1
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SPEED = 80
const SPRINT_MULTIPLIER = 2
const ARRIVE_THRESHOLD = 4
const DOUBLE_CLICK_MS = 300

const PLAYER_KEY = 'Basic_Charakter'
const getZoom = (w) => w < 768 ? 1.5 : w < 1024 ? 3 : 2.5

// Resolve all game asset cloud URLs before Phaser boots.
// Returns { [key]: url } — Storage URL if uploaded, local public/ path as fallback.
async function resolveAssetUrls() {
  const entries = await Promise.all(
    GAME_ASSETS.map(async (a) => {
      const url = await cloudAsset(a.storagePath, { fallback: a.localPath })
      return [a.key, url ?? a.localPath]
    })
  )
  return Object.fromEntries(entries)
}

// Read a URL from the registry, falling back to the local public/ path.
function urlFor(registry, key) {
  const urls = registry.get('assetUrls') || {}
  return urls[key] ?? GAME_ASSET_BY_KEY[key]?.localPath ?? null
}

// storagePath → local public/ path, for resolving fallbacks of config tilesets.
const LOCAL_BY_STORAGE = Object.fromEntries(GAME_ASSETS.map((a) => [a.storagePath, a.localPath]))

// Resolve a map's config (tileset name → Storage path, per-layer collision/hidden)
// plus a resolved URL for each tileset image, with local public/ fallback.
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

// Re-queue a single asset from its local public/ path after a cloud load failed.
function reloadLocal(scene, key, spec) {
  if (!spec?.local) return
  if (spec.kind === 'spritesheet')    scene.load.spritesheet(key, spec.local, spec.frameConfig)
  else if (spec.kind === 'tilemap')   scene.load.tilemapTiledJSON(key, spec.local)
  else                                scene.load.image(key, spec.local)
}

// When a cloud asset 500s/404s mid-load, fall back to its local public/ copy so
// the map still renders. `localByKey` maps Phaser key → { local, kind }. Each key
// is retried at most once to avoid loops when the local copy is missing too.
function attachLocalFallback(scene, localByKey) {
  const retried = new Set()
  scene.load.on('loaderror', (file) => {
    const spec = localByKey[file.key]
    if (!spec || retried.has(file.key)) return
    retried.add(file.key)
    reloadLocal(scene, file.key, spec)
    scene.load.start()
  })
}

// Apply per-cell collision: a cell blocks only if no VISIBLE, non-collision layer
// sits ABOVE the topmost collision tile there. This lets the player walk on
// overpasses (the Bridge over Water, a grass shoreline over Water) while invisible
// masks (the Roof overlay, the indoor Collision layer) keep their intended behavior.
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

// Everything Phaser needs before booting: character/map URLs (assetUrls), the two
// maps' configs, and a resolved tileset image URL per Tiled tileset name.
async function loadSceneData() {
  const [assetUrls, test3Cfg, indoorCfg] = await Promise.all([
    resolveAssetUrls(),
    getMapConfig('test3'),
    getMapConfig('indoor'),
  ])
  const [test3Tiles, indoorTiles] = await Promise.all([
    resolveMapTilesets(test3Cfg),
    resolveMapTilesets(indoorCfg),
  ])
  return {
    assetUrls,
    mapConfigs: { test3: test3Cfg, indoor: indoorCfg },
    tilesetUrls: { test3: test3Tiles, indoor: indoorTiles },
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  preload() {
    this.load.on('loaderror', (file) => {
      console.error('Failed to load:', file.src)
    })

    const r = this.registry
    const localByKey = {}

    localByKey['test3'] = { local: GAME_ASSET_BY_KEY['test3']?.localPath, kind: 'tilemap' }
    this.load.tilemapTiledJSON('test3', urlFor(r, 'test3'))

    const tiles = r.get('tilesetUrls')?.test3 ?? {}
    Object.entries(tiles).forEach(([name, { url, local }]) => {
      localByKey[name] = { local, kind: 'image' }
      this.load.image(name, url)
    })

    if (CHARACTER_MODE === 0) {
      this.load.spritesheet(PLAYER_KEY, '/assets/sprites/Characters/Play2_Charakter_Spritesheet.png', {
        frameWidth: 48, frameHeight: 48,
      })
    } else {
      MBTI_TYPES.forEach(mbti => {
        localByKey[mbti] = {
          local: GAME_ASSET_BY_KEY[mbti]?.localPath,
          kind: 'spritesheet',
          frameConfig: { frameWidth: 48, frameHeight: 48 },
        }
        this.load.spritesheet(mbti, urlFor(r, mbti), { frameWidth: 48, frameHeight: 48 })
      })
    }

    attachLocalFallback(this, localByKey)
  }

  create() {
    const map = this.make.tilemap({ key: 'test3' })
    const cfg = this.registry.get('mapConfigs')?.test3 ?? DEFAULT_MAP_CONFIGS.test3

    // Build tilesets/layers straight from the parsed map. Each tileset image was
    // preloaded under its Tiled name (see preload), so name === Phaser key.
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
    if (CHARACTER_MODE === 0) {
      DIRS.forEach(({ key, start, end }) => {
        this.anims.create({
          key: `${PLAYER_KEY}-${key}`,
          frames: this.anims.generateFrameNumbers(PLAYER_KEY, { start, end }),
          frameRate: 8,
          repeat: -1,
        })
      })
      this.anims.create({
        key: `${PLAYER_KEY}-idle`,
        frames: this.anims.generateFrameNumbers(PLAYER_KEY, { frames: [0] }),
        frameRate: 1,
        repeat: 0,
      })
      this.currentMbti = PLAYER_KEY
    } else {
      MBTI_TYPES.forEach(mbti => {
        DIRS.forEach(({ key, start, end }) => {
          this.anims.create({
            key: `${mbti}-${key}`,
            frames: this.anims.generateFrameNumbers(mbti, { start, end }),
            frameRate: 8,
            repeat: -1,
          })
        })
        this.anims.create({
          key: `${mbti}-idle`,
          frames: this.anims.generateFrameNumbers(mbti, { frames: [0] }),
          frameRate: 1,
          repeat: 0,
        })
      })
      const chosen = this.registry.get('selectedMbti')
      this.mbtiIndex   = Math.max(0, MBTI_TYPES.indexOf(chosen))
      this.currentMbti = MBTI_TYPES[this.mbtiIndex]
    }

    const spawnX = 35 * 16 * mapScale
    const spawnY = 32 * 16 * mapScale
    this.player = this.physics.add.sprite(spawnX, spawnY, this.currentMbti)
    this.player.setScale(mapScale)
    this.player.body.setSize(16, 20)
    this.player.body.setOffset(16, 12)
    this.player.setDepth(10)
    this.player.setCollideWorldBounds(true)
    this.player.play(`${this.currentMbti}-idle`)

    // Collision: layers the admin marked in mapConfigs block the player, except
    // where a walkable layer (e.g. the Bridge) sits on top.
    applyCollision(this, map, layerInfos, cfg, this.player)

    // Door trigger â€“ enter indoor
    this.transitioning = false
    const doorToIndoor = map.getObjectLayer('Doors') &&
      map.findObject('Doors', o => o.name === 'door_to_indoor')
    if (doorToIndoor) {
      const dz = this.add.zone(
        doorToIndoor.x * mapScale + doorToIndoor.width  * mapScale / 2,
        doorToIndoor.y * mapScale + doorToIndoor.height * mapScale / 2,
        doorToIndoor.width  * mapScale,
        doorToIndoor.height * mapScale,
      )
      this.physics.world.enable(dz)
      dz.body.setAllowGravity(false)
      dz.body.moves = false
      this.physics.add.overlap(this.player, dz, () => {
        if (!this.transitioning) {
          this.transitioning = true
          this.scene.start('IndoorScene')
        }
      })
    }

    // destination marker
    this.marker = this.add.graphics()
    this.marker.fillStyle(0xffff00, 1)
    this.marker.fillCircle(0, 0, 4)
    this.marker.setDepth(11)
    this.marker.setVisible(false)

    // move state
    this.isMoving = false
    this.targetX  = 0
    this.targetY  = 0
    this.isSprinting  = false
    this.lastClickTime = 0

    this.input.on('pointerdown', (pointer) => {
      const now = this.time.now
      if (now - this.lastClickTime < DOUBLE_CLICK_MS) {
        this.isSprinting = !this.isSprinting
      }
      this.lastClickTime = now

      const worldX = pointer.worldX
      const worldY = pointer.worldY
      this.targetX  = worldX
      this.targetY  = worldY
      this.isMoving = true
      this.marker.setPosition(worldX, worldY).setVisible(true)
    })

    // camera
    this.cameras.main.setBounds(0, 0, worldW, worldH)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setZoom(getZoom(this.scale.width))
    this.game.events.emit('zoomChanged', getZoom(this.scale.width))
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
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })
    this.usingWasd = false

    this.scale.on('resize', (gameSize) => {
      const newZoom = getZoom(gameSize.width)
      this.cameras.main.setSize(gameSize.width, gameSize.height)
      this.cameras.main.setZoom(newZoom)
      this.game.events.emit('zoomChanged', newZoom)
    })
  }

  update() {
    const p1 = this.input.pointer1
    const p2 = this.input.pointer2
    if (p1.isDown && p2.isDown) {
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

    const spd = SPEED * (this.isSprinting ? SPRINT_MULTIPLIER : 1)

    const { up, down, left, right } = this.wasd
    const wasdActive = up.isDown || down.isDown || left.isDown || right.isDown

    if (wasdActive) {
      this.usingWasd = true
      this.isMoving = false
      this.marker.setVisible(false)

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

    if (!this.isMoving) return

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

    const animKey = `${this.currentMbti}-${dir}`
    if (this.player.anims.currentAnim?.key !== animKey) {
      this.player.play(animKey)
    }
  }
}

class IndoorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'IndoorScene' })
  }

  preload() {
    this.load.on('loaderror', (file) => {
      console.error('Failed to load:', file.src)
    })

    const r = this.registry
    const localByKey = {}

    localByKey['indoor'] = { local: GAME_ASSET_BY_KEY['indoor']?.localPath, kind: 'tilemap' }
    this.load.tilemapTiledJSON('indoor', urlFor(r, 'indoor'))

    const tiles = r.get('tilesetUrls')?.indoor ?? {}
    Object.entries(tiles).forEach(([name, { url, local }]) => {
      localByKey[name] = { local, kind: 'image' }
      this.load.image(name, url)
    })

    attachLocalFallback(this, localByKey)
  }

  create() {
    const map = this.make.tilemap({ key: 'indoor' })
    const cfg = this.registry.get('mapConfigs')?.indoor ?? DEFAULT_MAP_CONFIGS.indoor

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

    const scaleX   = this.scale.width  / map.widthInPixels
    const scaleY   = this.scale.height / map.heightInPixels
    const mapScale = Math.ceil(Math.max(scaleX, scaleY))

    layers.forEach(layer => layer && layer.setScale(mapScale))

    const worldW = map.widthInPixels  * mapScale
    const worldH = map.heightInPixels * mapScale

    this.physics.world.setBounds(0, 0, worldW, worldH)

    const spawnDoor = map.getObjectLayer('Door') &&
      map.findObject('Door', o => o.name === 'door_to_world')
    const spawnX = 6 * 16 * mapScale
    const spawnY = 12 * 16 * mapScale

    // Animations â€“ guard against duplicates if GameScene already created them
    const DIRS = [
      { key: 'walk-down',  start: 0,  end: 3  },
      { key: 'walk-up',    start: 4,  end: 7  },
      { key: 'walk-left',  start: 8,  end: 11 },
      { key: 'walk-right', start: 12, end: 15 },
    ]
    if (CHARACTER_MODE === 0) {
      DIRS.forEach(({ key, start, end }) => {
        const animKey = `${PLAYER_KEY}-${key}`
        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNumbers(PLAYER_KEY, { start, end }),
            frameRate: 8,
            repeat: -1,
          })
        }
      })
      const idleKey = `${PLAYER_KEY}-idle`
      if (!this.anims.exists(idleKey)) {
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

    this.player = this.physics.add.sprite(spawnX, spawnY, this.currentMbti)
    this.player.setScale(mapScale)
    this.player.body.setSize(16, 20)
    this.player.body.setOffset(16, 12)
    this.player.setDepth(5)
    this.player.setCollideWorldBounds(true)
    this.player.play(`${this.currentMbti}-idle`)

    // Collision: layers the admin marked in mapConfigs block the player, except
    // where a walkable layer sits on top.
    applyCollision(this, map, layerInfos, cfg, this.player)

    // Door trigger â€“ exit to world; block for 500ms so spawn doesn't immediately re-fire
    this.transitioning = true
    this.time.delayedCall(500, () => { this.transitioning = false })

    if (spawnDoor) {
      const dz = this.add.zone(
        spawnDoor.x * mapScale + (spawnDoor.width  * mapScale) / 2,
        spawnDoor.y * mapScale + (spawnDoor.height * mapScale) / 2,
        spawnDoor.width  * mapScale,
        spawnDoor.height * mapScale,
      )
      this.physics.world.enable(dz)
      dz.body.setAllowGravity(false)
      dz.body.moves = false
      this.physics.add.overlap(this.player, dz, () => {
        if (!this.transitioning) {
          this.transitioning = true
          this.scene.start('GameScene')
        }
      })
    }

    // Destination marker
    this.marker = this.add.graphics()
    this.marker.fillStyle(0xffff00, 1)
    this.marker.fillCircle(0, 0, 4)
    this.marker.setDepth(10)
    this.marker.setVisible(false)

    // Move state
    this.isMoving    = false
    this.targetX     = 0
    this.targetY     = 0
    this.isSprinting = false
    this.lastClickTime = 0

    this.input.on('pointerdown', (pointer) => {
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

    // Camera
    this.cameras.main.setBounds(0, 0, worldW, worldH)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setZoom(getZoom(this.scale.width))
    this.game.events.emit('zoomChanged', getZoom(this.scale.width))
    this.cameras.main.centerOn(spawnX, spawnY)

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const current = this.cameras.main.zoom
      const next = Phaser.Math.Clamp(current + (deltaY > 0 ? -0.1 : 0.1), 1.0, 3.0)
      this.cameras.main.setZoom(next)
      this.game.events.emit('zoomChanged', next)
    })

    this.input.addPointer(1)
    this.lastPinchDist = null

    this.wasd = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })
    this.usingWasd = false

    this.scale.on('resize', (gameSize) => {
      const newZoom = getZoom(gameSize.width)
      this.cameras.main.setSize(gameSize.width, gameSize.height)
      this.cameras.main.setZoom(newZoom)
      this.game.events.emit('zoomChanged', newZoom)
    })
  }

  update() {
    const p1 = this.input.pointer1
    const p2 = this.input.pointer2
    if (p1.isDown && p2.isDown) {
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

    const spd = SPEED * (this.isSprinting ? SPRINT_MULTIPLIER : 1)

    const { up, down, left, right } = this.wasd
    const wasdActive = up.isDown || down.isDown || left.isDown || right.isDown

    if (wasdActive) {
      this.usingWasd = true
      this.isMoving = false
      this.marker.setVisible(false)

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

    if (!this.isMoving) return

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

    const animKey = `${this.currentMbti}-${dir}`
    if (this.player.anims.currentAnim?.key !== animKey) {
      this.player.play(animKey)
    }
  }
}

export default function GameCanvas({ active = true }) {
  const containerRef = useRef(null)
  const [zoom, setZoom] = useState(null)
  const [showZoom, setShowZoom] = useState(false)
  const gameRef = useRef(null)
  const hideTimerRef = useRef(null)
  const assetUrlsRef = useRef(null) // populated before Phaser boots

  // Player locks to the MBTI chosen during onboarding. Held in a ref so the
  // one-time game-creation effect below reads the latest value, not a stale one.
  const selectedMbti = useSelectStore((s) => s.mbti)
  const selectedMbtiRef = useRef(selectedMbti)
  useEffect(() => { selectedMbtiRef.current = selectedMbti }, [selectedMbti])

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
      // If the ResizeObserver already fired with a valid size, boot now.
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

  return (
    <>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      />
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
