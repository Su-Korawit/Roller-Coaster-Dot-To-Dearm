// Frame picker for ambient pixel loops. Static (frame 0) under reduced motion or
// while the idle governor reports AFK. Loops run 2–8 frames at 4–8 fps (Soft Pixel).

const MIN_FPS = 4
const MAX_FPS = 8
const MAX_FRAMES = 8

export function createAmbientClock({ reducedMotion = false, isIdle = () => false } = {}) {
  return {
    frameFor({ frames, fps, offset = 0 }, nowMs) {
      if (fps < MIN_FPS || fps > MAX_FPS) throw new RangeError(`fps must be ${MIN_FPS}–${MAX_FPS}, got ${fps}`)
      if (frames < 1 || frames > MAX_FRAMES) throw new RangeError(`frames must be 1–${MAX_FRAMES}, got ${frames}`)
      if (reducedMotion || isIdle()) return 0
      return (Math.floor((nowMs * fps) / 1000) + offset) % frames
    },
  }
}
