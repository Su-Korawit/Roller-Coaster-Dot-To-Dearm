// Phaser half of the room pet (the behaviour is src/game/petBehaviour.js, unit-tested). Draws the
// active pet from the `room_pets` sheet (7 frames per row, one row per pet, then the heart), keeps
// it in step with the layout, and reacts to taps. Used by MapScene for maps with `room: true`.
import { createPet, stepPet, petFloor, petFrame, walkableAt, PET_ROWS } from './petBehaviour'

const FRAMES_PER_ROW = 7
const HEART_FRAME = 4 * FRAMES_PER_ROW
const TAP_RADIUS = 14 // px (unscaled)
const FLOOR_DEPTH = 3 // like roomRender's furniture: y-sorted among the floor items

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// getState() -> { layout, catalog, focusing, playerAt: {x, y} in unscaled px }
export function renderPet(scene, getState) {
  const scale = scene._mapScale ?? 1
  let pet = null
  let petId = null
  let sprite = null
  let heart = null
  let tapped = false
  const seed = 1 + Math.floor(Math.random() * 1e6)

  const roomOf = ({ layout, catalog }) => petFloor({ tier: layout.tier ?? 0, placed: layout.placed, catalog })

  const sync = () => {
    const state = getState()
    const id = state.layout?.petId && PET_ROWS[state.layout.petId] !== undefined ? state.layout.petId : null
    if (id !== petId) {
      sprite?.destroy()
      sprite = null
      pet = null
      petId = id
    }
    if (!id) return
    const room = roomOf(state)
    if (!pet) pet = createPet({ seed, room })
    else pet = walkableAt(room, pet.x, pet.y) ? { ...pet, room } : createPet({ seed, room })
    if (!sprite) {
      sprite = scene.add.sprite(0, 0, 'room_pets', PET_ROWS[id] * FRAMES_PER_ROW).setOrigin(0.5, 1).setScale(scale)
      heart = heart ?? scene.add.sprite(0, 0, 'room_pets', HEART_FRAME).setOrigin(0.5, 1).setScale(scale).setVisible(false)
    }
  }

  const onPointer = (pointer) => {
    if (!pet || !sprite) return
    const x = pointer.worldX / scale
    const y = pointer.worldY / scale
    if (Math.abs(x - pet.x) <= TAP_RADIUS && Math.abs(y - (pet.y - 6)) <= TAP_RADIUS) tapped = true
  }

  sync()
  scene.game.events.on('roomChanged', sync)
  scene.input.on('pointerdown', onPointer)

  const destroy = () => {
    scene.game.events.off('roomChanged', sync)
    scene.input?.off('pointerdown', onPointer)
    sprite?.destroy()
    heart?.destroy()
    sprite = null
    heart = null
    pet = null
  }
  scene.events.once('shutdown', destroy)

  return {
    update(time, delta) {
      if (!pet || !sprite) return
      const { focusing, playerAt } = getState()
      pet = stepPet(pet, { dt: Math.min(delta ?? 16, 250), playerAt, focusing, tapped, reducedMotion: prefersReducedMotion() })
      tapped = false
      sprite.setPosition(pet.x * scale, pet.y * scale)
      sprite.setFlipX(pet.facing < 0)
      sprite.setFrame(PET_ROWS[petId] * FRAMES_PER_ROW + petFrame(pet, time))
      sprite.setDepth(FLOOR_DEPTH + pet.y / 1000)
      if (heart) {
        heart.setVisible(pet.mode === 'heart')
        heart.setPosition(pet.x * scale, (pet.y - 14) * scale).setDepth(20)
      }
    },
    destroy,
  }
}
