import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { useSelectStore } from '../stores/useSelectStore'

// â”€â”€ CHARACTER MODE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 0 = Basic_Charakter (1 à¸•à¸±à¸§)
// 1 = MBTI rotation (16 à¸•à¸±à¸§ à¸ªà¸¥à¸±à¸šà¸—à¸¸à¸ 1 à¸§à¸´)
const CHARACTER_MODE = 1
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SPEED = 80
const SPRINT_MULTIPLIER = 2
const ARRIVE_THRESHOLD = 4
const DOUBLE_CLICK_MS = 300

const PLAYER_KEY  = 'Basic_Charakter'
const getZoom = (w) => w < 768 ? 1.5 : w < 1024 ? 3 : 2.5
const MBTI_TYPES  = [
  'ENFJ', 'ENFP', 'ENTJ', 'ENTP',
  'ESFJ', 'ESFP', 'ESTJ', 'ESTP',
  'INFJ', 'INFP', 'INTJ', 'INTP',
  'ISFJ', 'ISFP', 'ISTJ', 'ISTP',
]

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  preload() {
    this.load.on('loaderror', (file) => {
      console.error('Failed to load:', file.src)
    })

    this.load.tilemapTiledJSON('test3', '/maps/test3.json')
    this.load.image('Grass',                     '/assets/sprites/Tilesets/Grass.png')
    this.load.image('Water',                     '/assets/sprites/Tilesets/Water.png')
    this.load.image('Wooden_House',              '/assets/sprites/Tilesets/Wooden_House.png')
    this.load.image('Wooden_House_Walls_Tilset', '/assets/sprites/Tilesets/Wooden_House_Walls_Tilset.png')
    this.load.image('Wooden_House_Roof_Tilset',  '/assets/sprites/Tilesets/Wooden_House_Roof_Tilset.png')
    this.load.image('Hills',                     '/assets/sprites/Tilesets/Hills.png')
    this.load.image('Tilled_Dirt',               '/assets/sprites/Tilesets/Tilled_Dirt.png')
    this.load.image('Tilled_Dirt_v2',            '/assets/sprites/Tilesets/Tilled_Dirt_v2.png')
    this.load.image('Tilled_Dirt_Wide',          '/assets/sprites/Tilesets/Tilled_Dirt_Wide.png')
    this.load.image('Tilled_Dirt_Wide_v2',       '/assets/sprites/Tilesets/Tilled_Dirt_Wide_v2.png')
    this.load.image('Wood_Bridge',               '/assets/sprites/Objects/Wood_Bridge.png')
    this.load.image('Basic_Grass_Biom_things_1', '/assets/sprites/Objects/Basic_Grass_Biom_things_1.png')
    this.load.image('Fences',                    '/assets/sprites/Tilesets/Fences.png')

    if (CHARACTER_MODE === 0) {
      this.load.spritesheet(PLAYER_KEY, '/assets/sprites/Characters/Play2_Charakter_Spritesheet.png', {
        frameWidth: 48, frameHeight: 48,
      })
    } else {
      MBTI_TYPES.forEach(mbti => {
        this.load.spritesheet(mbti, `/assets/sprites/Characters/${mbti}_Charakter_Spritesheet.png`, {
          frameWidth: 48, frameHeight: 48,
        })
      })
    }
  }

  create() {
    const map = this.make.tilemap({ key: 'test3' })

    const tilesets = [
      map.addTilesetImage('Grass',                     'Grass'),
      map.addTilesetImage('Water',                     'Water'),
      map.addTilesetImage('Wooden House',              'Wooden_House'),
      map.addTilesetImage('Wooden_House_Walls_Tilset', 'Wooden_House_Walls_Tilset'),
      map.addTilesetImage('Wooden_House_Roof_Tilset',  'Wooden_House_Roof_Tilset'),
      map.addTilesetImage('Hills',                     'Hills'),
      map.addTilesetImage('Tilled Dirt',               'Tilled_Dirt'),
      map.addTilesetImage('Tilled_Dirt_v2',            'Tilled_Dirt_v2'),
      map.addTilesetImage('Tilled_Dirt_Wide',          'Tilled_Dirt_Wide'),
      map.addTilesetImage('Tilled_Dirt_Wide_v2',       'Tilled_Dirt_Wide_v2'),
      map.addTilesetImage('Wood_Bridge',               'Wood_Bridge'),
      map.addTilesetImage('Basic Grass Biom things 1', 'Basic_Grass_Biom_things_1'),
      map.addTilesetImage('Fences',                    'Fences'),
    ]

    const layers = [
      map.createLayer('Water',     tilesets, 0, 0),
      map.createLayer('Grass',     tilesets, 0, 0),
      map.createLayer('Path',      tilesets, 0, 0),
      map.createLayer('Bridge',    tilesets, 0, 0),
      map.createLayer('Hill/Wall', tilesets, 0, 0),
      map.createLayer('Object',    tilesets, 0, 0),
      map.createLayer('Roof',      tilesets, 0, 0),
    ]
    const [waterLayer, , , , wallLayer] = layers
    layers.forEach((layer, i) => layer && layer.setDepth(i))

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

    ;[waterLayer, wallLayer].forEach(layer => layer && layer.setCollisionByExclusion([-1]))
    if (waterLayer) this.physics.add.collider(this.player, waterLayer)
    if (wallLayer)  this.physics.add.collider(this.player, wallLayer)

    // Door trigger â€“ enter indoor
    this.transitioning = false
    const doorToIndoor = map.findObject('Doors', o => o.name === 'door_to_indoor')
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
    this.load.tilemapTiledJSON('indoor', '/maps/indoor.json')
    this.load.image('Wooden_House',   '/assets/sprites/Tilesets/Wooden_House.png')
    this.load.image('Basic_Furniture', '/assets/sprites/Objects/Basic_Furniture.png')
    this.load.image('Chest',          '/assets/sprites/Objects/Chest.png')
  }

  create() {
    const map = this.make.tilemap({ key: 'indoor' })

    const furnitureTiles = map.addTilesetImage('Basic_Furniture', 'Basic_Furniture')
    const houseTiles     = map.addTilesetImage('Wooden_House',    'Wooden_House')
    const chestTiles     = map.addTilesetImage('Chest',           'Chest')
    const tilesets = [furnitureTiles, houseTiles, chestTiles]

    const groundLayer    = map.createLayer('Ground',    tilesets, 0, 0)
    const objectsLayer   = map.createLayer('Objects',   tilesets, 0, 0)
    const collisionLayer = map.createLayer('Collision', tilesets, 0, 0)
    if (!collisionLayer) {
      console.error('Indoor Collision layer not found!')
    } else {
      collisionLayer.setVisible(false)
      collisionLayer.setCollisionByExclusion([-1])
    }

    groundLayer.setDepth(0)
    objectsLayer.setDepth(1)
    if (collisionLayer) collisionLayer.setDepth(2)

    const scaleX   = this.scale.width  / map.widthInPixels
    const scaleY   = this.scale.height / map.heightInPixels
    const mapScale = Math.ceil(Math.max(scaleX, scaleY))

    groundLayer.setScale(mapScale)
    objectsLayer.setScale(mapScale)
    if (collisionLayer) collisionLayer.setScale(mapScale)

    const worldW = map.widthInPixels  * mapScale
    const worldH = map.heightInPixels * mapScale

    this.physics.world.setBounds(0, 0, worldW, worldH)

    const spawnDoor = map.findObject('Door', o => o.name === 'door_to_world')
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

    if (collisionLayer) this.physics.add.collider(this.player, collisionLayer)

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

  // Player locks to the MBTI chosen during onboarding. Held in a ref so the
  // one-time game-creation effect below reads the latest value, not a stale one.
  const selectedMbti = useSelectStore((s) => s.mbti)
  const selectedMbtiRef = useRef(selectedMbti)
  selectedMbtiRef.current = selectedMbti

  useEffect(() => {
    let game = null

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width === 0 || height === 0) return

      if (!game) {
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
          scale: {
            mode: Phaser.Scale.RESIZE,
            width,
            height,
          },
        }
        game = new Phaser.Game(config)
        game.registry.set('selectedMbti', selectedMbtiRef.current)
        gameRef.current = game
        game.events.on('zoomChanged', (v) => {
          setZoom(+v.toFixed(1))
          setShowZoom(true)
          clearTimeout(hideTimerRef.current)
          hideTimerRef.current = setTimeout(() => setShowZoom(false), 1500)
        })
      } else {
        game.scale.resize(width, height)
      }
    })

    ro.observe(containerRef.current)

    return () => {
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
