import { useEffect, useState } from 'react'

// Renders one MBTI game spritesheet (public/assets/sprites/Characters/*_Charakter_Spritesheet.png)
// as a pixel-art preview that walks in place and auto-rotates through its four facings.
//
// Sheet layout: 4×4 grid of 48px frames.
//   row 0 = walk-down, 1 = walk-up, 2 = walk-left, 3 = walk-right; columns 0..3 = walk cycle.
const FRAME = 48
const COLS = 4
// Turn order shown to the user: down → left → up → right (rows in the sheet).
const FACING_ROWS = [0, 2, 1, 3]

function CharacterSprite({ code, scale = 4 }) {
  const [frame, setFrame] = useState(0)
  const [facing, setFacing] = useState(0)

  useEffect(() => {
    const walk = setInterval(() => setFrame((f) => (f + 1) % COLS), 125)
    const turn = setInterval(() => setFacing((d) => (d + 1) % FACING_ROWS.length), 900)
    return () => {
      clearInterval(walk)
      clearInterval(turn)
    }
  }, [])

  const size = FRAME * scale
  const row = FACING_ROWS[facing]
  const sheet = `/assets/sprites/Characters/${code}_Charakter_Spritesheet.png`

  return (
    <div
      role="img"
      aria-label={`${code} character`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${sheet})`,
        backgroundSize: `${FRAME * COLS * scale}px ${FRAME * COLS * scale}px`,
        backgroundPosition: `-${frame * size}px -${row * size}px`,
        imageRendering: 'pixelated',
      }}
    />
  )
}

export default CharacterSprite
