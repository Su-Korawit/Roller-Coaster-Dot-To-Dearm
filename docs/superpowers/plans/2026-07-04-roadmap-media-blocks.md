# Roadmap Media Blocks Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task, OR hand this file to Cursor IDE to implement directly, checking off each `- [ ]`. Claude Code (terminal) should review/check the diff after each task per this repo's CLAUDE.md collaboration model.

**Goal:** Turn the Roadmap's single-image Image block into a multi-image album, add a new single-video Video block, and add a shared full-screen Lightbox so both media types can be viewed large — all backward compatible with existing saved roadmaps.

**Architecture:** Three additive layers on top of the existing React Flow roadmap canvas (`src/pages/RoadmapPage.jsx`):
1. A pure normalizer (`src/utils/normalizeImageNodeData.js`) migrates the legacy `ImageNode` data shape (`{ url, offset }`) to the new album shape (`{ images: [{ url, offset }], activeIndex }`) on every read, so old roadmaps never need a data migration script.
2. `ImageNode.jsx` and the new `VideoNode.jsx` are both "picker-trigger-when-empty" blocks that open a portalled modal (`ImagePickerModal.jsx` / new `VideoPickerModal.jsx`) to set their media, following the exact portal pattern `ImagePickerModal` already established (portalled to `document.body` because the block lives inside React Flow's transformed viewport).
3. A new shared `MediaLightbox.jsx`, also portalled, opens from either block to show the current image/album or video large, dismissible via backdrop click, close button, or Escape.

**Tech Stack:** Plain JS + JSX (no TypeScript), React 19, `@xyflow/react` v12, Tailwind v4 utility classes, Zustand (`useRoadmapStore`), Vitest + `@testing-library/react` (jsdom), `lucide-react` icons.

## Global Constraints

- No TypeScript — plain JS + JSX only.
- All Firestore/Firebase Storage access goes through existing helpers: `src/utils/storageOps.js`'s `listFlat`/`uploadAsset` (already format-agnostic — no `image/*` hardcoded inside them, only the `<input accept="image/*">` in the picker components is format-specific, mirrored as `accept="video/*"` for the video picker). No new inline `firebase/storage` calls anywhere.
- Roadmap board state changes only via `useRoadmapStore`'s `updateNodeData(id, patch)` — never mutate `data` directly.
- No new Firestore writes are introduced by this plan (Roadmap board state persists via the existing Zustand `persist` middleware in `useRoadmapStore.js`, unchanged); if a future task adds Firestore sync for the Roadmap, it must go through the debounced `syncManager`, not this plan's scope.
- Function/prop names below are exact and must stay identical across every task that references them: `normalizeImageNodeData`, `DEFAULT_IMAGE_OFFSET`, `stepAlbumIndex`, `removeAlbumImage`, `MediaLightbox` (props: `items`, `initialIndex`, `onClose`), `VideoPickerModal` (props: `nodeId`, `onClose`), `VideoNode`.
- Every new/edited component keeps this file's existing conventions: Thai `aria-label`s where the file already uses Thai (e.g. `ปิด`), `pixel-font` class on small UI text, `nodrag` class on any button living inside a draggable/pannable node so React Flow doesn't swallow the click.

## Judgment Calls (read before implementing)

1. **Append, don't replace, and keep the picker open.** `ImagePickerModal` now appends every pick to `data.images` (jumping `activeIndex` to the new image) instead of replacing `data.url`, and no longer auto-closes after a pick — the user closes it explicitly (X button or backdrop click) once they're done adding images. This is the simplest way to let someone add several images in one sitting without reopening the modal each time.
2. **Each upload needs a unique Storage path now.** The old picker uploaded every file to the same `users/{uid}/roadmap/{nodeId}` path (fine when a node held one image — each upload just overwrote the last). Now that a node can hold many images, every upload must land at a distinct path (`users/{uid}/roadmap/{nodeId}-{Date.now()}`) or a second upload would silently overwrite the first image's Storage object out from under its still-referenced download URL.
3. **Video is single, not an album.** The spec asked for "a Video Block," not a video album, and a per-video pan-to-reposition control (the reason `ImageNode` needs an offset) doesn't apply to a `<video>` element. `VideoNode`'s data shape is the flat `{ url }`, no `images` array, no normalizer needed.
4. **Videos get their own Storage prefix.** `VideoPickerModal` lists/writes `users/{uid}/roadmap-video/` instead of `users/{uid}/roadmap/`, so "My uploads" never has to sniff a file's type before deciding whether to render an `<img>` or a `<video>` for it.
5. **No "App images" tab in the video picker.** There's no video equivalent of a profile photo or university logo, so `VideoPickerModal` only has "My uploads" and "Upload new".
6. **Lightbox navigation is local-only.** Paging through an album inside `MediaLightbox` does not write back to the node's `activeIndex` — it's `useState` local to the lightbox. Closing and reopening the lightbox always starts back at whatever the block's thumbnail is currently showing. This avoids surprising writes to board state from what is fundamentally a read-only viewer.
7. **No dedicated "remove video" button.** `ImageNode` gets a remove-this-image button because removing one image from an album is a normal album operation. `VideoNode` only gets the existing replace-via-pencil affordance (mirroring the old single-image `ImageNode` before this plan) — to remove a video entirely, the user deletes the whole block via the existing trash-zone/delete-key flow, same as before this plan for images.
8. **`roadmapExport.js` needs no changes.** `toSchema`/`fromSchema` copy `data` opaquely (`data: n.data`) without enumerating fields, so the new `images`/`activeIndex` shape and the new `video` node type both round-trip through export/import with zero changes to that file. Re-read `src/utils/roadmapExport.js` if in doubt — confirmed during planning, no task below touches it.

---
### Task 1: `normalizeImageNodeData` — migrate legacy single-image data on read

**Files:** `src/utils/normalizeImageNodeData.js` (new), `src/utils/normalizeImageNodeData.test.js` (new)
**Interfaces:** `export const DEFAULT_IMAGE_OFFSET = { x: 50, y: 50 }`, `export function normalizeImageNodeData(data)` → always returns `{ images: [{ url, offset }], activeIndex }`.

- [ ] Step 1: Write the failing test — create `src/utils/normalizeImageNodeData.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { normalizeImageNodeData, DEFAULT_IMAGE_OFFSET } from './normalizeImageNodeData'

describe('normalizeImageNodeData', () => {
  it('returns an empty album for undefined data', () => {
    expect(normalizeImageNodeData(undefined)).toEqual({ images: [], activeIndex: 0 })
  })

  it('returns an empty album for an empty object', () => {
    expect(normalizeImageNodeData({})).toEqual({ images: [], activeIndex: 0 })
  })

  it('migrates the legacy { url, offset } shape into a single-image album', () => {
    expect(normalizeImageNodeData({ url: 'a.png', offset: { x: 10, y: 20 } })).toEqual({
      images: [{ url: 'a.png', offset: { x: 10, y: 20 } }],
      activeIndex: 0,
    })
  })

  it('defaults the offset when migrating a legacy shape without one', () => {
    expect(normalizeImageNodeData({ url: 'a.png' })).toEqual({
      images: [{ url: 'a.png', offset: DEFAULT_IMAGE_OFFSET }],
      activeIndex: 0,
    })
  })

  it('passes an already-normalized shape through unchanged', () => {
    const data = { images: [{ url: 'a.png' }, { url: 'b.png' }], activeIndex: 1 }
    expect(normalizeImageNodeData(data)).toEqual(data)
  })

  it('clamps an out-of-range activeIndex to the last image', () => {
    expect(normalizeImageNodeData({ images: [{ url: 'a.png' }], activeIndex: 5 })).toEqual({
      images: [{ url: 'a.png' }],
      activeIndex: 0,
    })
  })

  it('clamps activeIndex to 0 for an empty images array', () => {
    expect(normalizeImageNodeData({ images: [], activeIndex: 3 })).toEqual({ images: [], activeIndex: 0 })
  })
})
```
- [ ] Step 2: Run it, confirm it fails: `npm test -- normalizeImageNodeData`. Expected failure: `Failed to resolve import "./normalizeImageNodeData"` (the module doesn't exist yet).
- [ ] Step 3: Minimal implementation — create `src/utils/normalizeImageNodeData.js`:
```js
// Normalizes an Image block's `data` into the multi-image album shape,
// migrating the legacy single-image shape ({ url, offset }) on read so
// existing roadmaps never lose data. Always returns { images, activeIndex }
// with activeIndex clamped to a valid slot (or 0 for an empty album).
export const DEFAULT_IMAGE_OFFSET = { x: 50, y: 50 }

export function normalizeImageNodeData(data) {
  if (!data) return { images: [], activeIndex: 0 }

  if (Array.isArray(data.images)) {
    const images = data.images
    const activeIndex = images.length === 0
      ? 0
      : Math.min(Math.max(data.activeIndex ?? 0, 0), images.length - 1)
    return { images, activeIndex }
  }

  if (data.url) {
    return {
      images: [{ url: data.url, offset: data.offset ?? DEFAULT_IMAGE_OFFSET }],
      activeIndex: 0,
    }
  }

  return { images: [], activeIndex: 0 }
}
```
- [ ] Step 4: Run it, confirm it passes: `npm test -- normalizeImageNodeData`. All 7 tests green.
- [ ] Step 5: Manual verification: N/A (pure function, no UI yet — covered when wired into `ImageNode` in Task 5).
- [ ] Step 6: Commit:
```bash
git add src/utils/normalizeImageNodeData.js src/utils/normalizeImageNodeData.test.js
git commit -m "feat(roadmap): add normalizeImageNodeData to migrate legacy image data"
```

---
### Task 2: `stepAlbumIndex` — wrap-around paging math

**Files:** `src/utils/stepAlbumIndex.js` (new), `src/utils/stepAlbumIndex.test.js` (new)
**Interfaces:** `export function stepAlbumIndex(index, delta, length)` → next index, wrapping around `[0, length)`.

- [ ] Step 1: Write the failing test — create `src/utils/stepAlbumIndex.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { stepAlbumIndex } from './stepAlbumIndex'

describe('stepAlbumIndex', () => {
  it('steps forward within bounds', () => {
    expect(stepAlbumIndex(0, 1, 3)).toBe(1)
  })

  it('wraps forward past the end back to 0', () => {
    expect(stepAlbumIndex(2, 1, 3)).toBe(0)
  })

  it('wraps backward past the start to the last index', () => {
    expect(stepAlbumIndex(0, -1, 3)).toBe(2)
  })

  it('always resolves to 0 for a single-item album', () => {
    expect(stepAlbumIndex(0, 1, 1)).toBe(0)
    expect(stepAlbumIndex(0, -1, 1)).toBe(0)
  })

  it('resolves to 0 for an empty album instead of dividing by zero', () => {
    expect(stepAlbumIndex(0, 1, 0)).toBe(0)
  })
})
```
- [ ] Step 2: Run it, confirm it fails: `npm test -- stepAlbumIndex`. Expected failure: `Failed to resolve import "./stepAlbumIndex"`.
- [ ] Step 3: Minimal implementation — create `src/utils/stepAlbumIndex.js`:
```js
// Wrap-around index stepping for an album/carousel. Used by both ImageNode's
// prev/next controls and MediaLightbox's navigation so both agree on the same
// math. Returns 0 for an empty list to avoid a NaN/negative index.
export function stepAlbumIndex(index, delta, length) {
  if (length <= 0) return 0
  return (index + delta + length) % length
}
```
- [ ] Step 4: Run it, confirm it passes: `npm test -- stepAlbumIndex`. All 5 tests green.
- [ ] Step 5: Manual verification: N/A (pure function, covered visually in Task 4/5's manual steps).
- [ ] Step 6: Commit:
```bash
git add src/utils/stepAlbumIndex.js src/utils/stepAlbumIndex.test.js
git commit -m "feat(roadmap): add stepAlbumIndex wrap-around paging helper"
```

---
### Task 3: `removeAlbumImage` — remove-with-reindex math

**Files:** `src/utils/removeAlbumImage.js` (new), `src/utils/removeAlbumImage.test.js` (new)
**Interfaces:** `export function removeAlbumImage(images, activeIndex, removeIndex)` → `{ images, activeIndex }`.

- [ ] Step 1: Write the failing test — create `src/utils/removeAlbumImage.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { removeAlbumImage } from './removeAlbumImage'

const a = { url: 'a.png' }
const b = { url: 'b.png' }
const c = { url: 'c.png' }

describe('removeAlbumImage', () => {
  it('removing an image before the active one shifts activeIndex down to keep the same image showing', () => {
    expect(removeAlbumImage([a, b, c], 2, 0)).toEqual({ images: [b, c], activeIndex: 1 })
  })

  it('removing the active image slides the next image into its place', () => {
    expect(removeAlbumImage([a, b, c], 0, 0)).toEqual({ images: [b, c], activeIndex: 0 })
  })

  it('removing the active image when it is last clamps to the new last index', () => {
    expect(removeAlbumImage([a, b, c], 2, 2)).toEqual({ images: [a, b], activeIndex: 1 })
  })

  it('removing an image after the active one leaves activeIndex unchanged', () => {
    expect(removeAlbumImage([a, b, c], 0, 2)).toEqual({ images: [a, b], activeIndex: 0 })
  })

  it('removing the only image returns an empty album', () => {
    expect(removeAlbumImage([a], 0, 0)).toEqual({ images: [], activeIndex: 0 })
  })
})
```
- [ ] Step 2: Run it, confirm it fails: `npm test -- removeAlbumImage`. Expected failure: `Failed to resolve import "./removeAlbumImage"`.
- [ ] Step 3: Minimal implementation — create `src/utils/removeAlbumImage.js`:
```js
// Removes the image at `removeIndex` and returns a new { images, activeIndex }
// pair with activeIndex re-pointed so the same image stays showing where
// possible, clamped to a valid slot (or 0 for an empty result).
export function removeAlbumImage(images, activeIndex, removeIndex) {
  const nextImages = images.filter((_, i) => i !== removeIndex)
  if (nextImages.length === 0) return { images: nextImages, activeIndex: 0 }

  let nextActive = activeIndex
  if (removeIndex < activeIndex) nextActive = activeIndex - 1
  else if (removeIndex === activeIndex) nextActive = Math.min(activeIndex, nextImages.length - 1)

  return { images: nextImages, activeIndex: Math.min(Math.max(nextActive, 0), nextImages.length - 1) }
}
```
- [ ] Step 4: Run it, confirm it passes: `npm test -- removeAlbumImage`. All 5 tests green.
- [ ] Step 5: Manual verification: N/A (pure function, covered visually in Task 5's manual step).
- [ ] Step 6: Commit:
```bash
git add src/utils/removeAlbumImage.js src/utils/removeAlbumImage.test.js
git commit -m "feat(roadmap): add removeAlbumImage remove-with-reindex helper"
```

---
### Task 4: `MediaLightbox` — shared full-screen viewer

**Files:** `src/components/roadmap/MediaLightbox.jsx` (new), `src/components/roadmap/MediaLightbox.test.jsx` (new)
**Interfaces:** `export default function MediaLightbox({ items, initialIndex = 0, onClose })` where `items` is `Array<{ type: 'image' | 'video', url: string }>`.

- [ ] Step 1: Write the failing test — create `src/components/roadmap/MediaLightbox.test.jsx`:
```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MediaLightbox from './MediaLightbox'

describe('MediaLightbox', () => {
  it('renders the item at initialIndex', () => {
    render(
      <MediaLightbox
        items={[{ type: 'image', url: 'a.png' }, { type: 'image', url: 'b.png' }]}
        initialIndex={1}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByTestId('lightbox-media').src).toContain('b.png')
  })

  it('closes when the backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<MediaLightbox items={[{ type: 'image', url: 'a.png' }]} initialIndex={0} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('lightbox-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<MediaLightbox items={[{ type: 'image', url: 'a.png' }]} initialIndex={0} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'ปิด' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('navigates forward and backward through the album, wrapping at the ends', () => {
    render(
      <MediaLightbox
        items={[{ type: 'image', url: 'a.png' }, { type: 'image', url: 'b.png' }]}
        initialIndex={0}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }))
    expect(screen.getByTestId('lightbox-media').src).toContain('b.png')
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }))
    expect(screen.getByTestId('lightbox-media').src).toContain('a.png')
    fireEvent.click(screen.getByRole('button', { name: 'ก่อนหน้า' }))
    expect(screen.getByTestId('lightbox-media').src).toContain('b.png')
  })

  it('renders a video with controls and hides nav arrows for a single item', () => {
    render(<MediaLightbox items={[{ type: 'video', url: 'clip.mp4' }]} initialIndex={0} onClose={vi.fn()} />)
    const video = screen.getByTestId('lightbox-media')
    expect(video.tagName).toBe('VIDEO')
    expect(video.src).toContain('clip.mp4')
    expect(screen.queryByRole('button', { name: 'ถัดไป' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'ก่อนหน้า' })).toBeNull()
  })
})
```
- [ ] Step 2: Run it, confirm it fails: `npm test -- MediaLightbox`. Expected failure: `Failed to resolve import "./MediaLightbox"`.
- [ ] Step 3: Minimal implementation — create `src/components/roadmap/MediaLightbox.jsx`:
```jsx
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { stepAlbumIndex } from '../../utils/stepAlbumIndex'

// Full-screen viewer for an image album or a single video, shared by
// ImageNode and VideoNode. Portalled to document.body for the same reason as
// ImagePickerModal: the block lives inside React Flow's transformed
// viewport, where a `position: fixed` child would anchor to that transform
// (scaled/offset, unclickable) instead of the real screen.
//
// Navigation here is local-only — stepping through the album while the
// lightbox is open does not write back to the node's `activeIndex`, so
// re-opening the lightbox always starts from the thumbnail currently shown
// on the block.
export default function MediaLightbox({ items, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex)
  const current = items[index]

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && items.length > 1) setIndex((i) => stepAlbumIndex(i, -1, items.length))
      if (e.key === 'ArrowRight' && items.length > 1) setIndex((i) => stepAlbumIndex(i, 1, items.length))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [items.length, onClose])

  if (!current) return null

  // Full-viewport on small screens (iPad/mobile); centered with max-width/
  // max-height constraints on desktop (sm: breakpoint, 640px+).
  const mediaClass = 'w-screen h-screen object-contain sm:w-auto sm:h-auto sm:max-w-[90vw] sm:max-h-[90vh]'

  return createPortal(
    <div
      data-testid="lightbox-backdrop"
      className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="ปิด"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-95 transition-all z-10"
      >
        <X size={22} />
      </button>

      {items.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIndex((i) => stepAlbumIndex(i, -1, items.length)) }}
          aria-label="ก่อนหน้า"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-95 transition-all z-10"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      {items.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIndex((i) => stepAlbumIndex(i, 1, items.length)) }}
          aria-label="ถัดไป"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-95 transition-all z-10"
        >
          <ChevronRight size={24} />
        </button>
      )}

      <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
        {current.type === 'video' ? (
          <video data-testid="lightbox-media" src={current.url} controls autoPlay className={mediaClass} />
        ) : (
          <img data-testid="lightbox-media" src={current.url} alt="" draggable={false} className={mediaClass} />
        )}
      </div>
    </div>,
    document.body,
  )
}
```
- [ ] Step 4: Run it, confirm it passes: `npm test -- MediaLightbox`. All 5 tests green.
- [ ] Step 5: Manual verification: skip for now — `MediaLightbox` has no trigger yet until Task 5/9 wire it in; verify visually then.
- [ ] Step 6: Commit:
```bash
git add src/components/roadmap/MediaLightbox.jsx src/components/roadmap/MediaLightbox.test.jsx
git commit -m "feat(roadmap): add shared MediaLightbox for images and video"
```

---
### Task 5: `ImageNode` — album rendering, paging, remove, and lightbox trigger

**Files:** `src/components/roadmap/ImageNode.jsx` (edit), `src/components/roadmap/ImageNode.test.jsx` (new)
**Interfaces:** `ImageNode({ id, data, selected })` unchanged signature; `data` now read exclusively through `normalizeImageNodeData(data)`.

- [ ] Step 1: Write the failing test — create `src/components/roadmap/ImageNode.test.jsx`:
```jsx
// @vitest-environment jsdom
import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let updateNodeDataSpy
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel({ updateNodeData: (...args) => updateNodeDataSpy(...args) }),
}))
vi.mock('./ConnectionDot', () => ({ default: () => null }))
vi.mock('./ImagePickerModal', () => ({
  default: ({ nodeId }) => <div data-testid="picker" data-node-id={nodeId} />,
}))
vi.mock('./MediaLightbox', () => ({
  default: ({ items }) => <div data-testid="lightbox" data-count={items.length} />,
}))

const { default: ImageNode } = await import('./ImageNode')

function Harness({ initialData }) {
  const [data, setData] = useState(initialData)
  updateNodeDataSpy = (id, patch) => setData((d) => ({ ...d, ...patch }))
  return <ImageNode id="n1" data={data} selected={false} />
}

describe('ImageNode', () => {
  it('shows the empty state and opens the picker when tapped', () => {
    render(<Harness initialData={{}} />)
    expect(screen.getByText('tap to choose')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Choose image' }))
    expect(screen.getByTestId('picker').dataset.nodeId).toBe('n1')
  })

  it('renders a legacy single-image node via the normalizer', () => {
    render(<Harness initialData={{ url: 'legacy.png', offset: { x: 10, y: 20 } }} />)
    const img = screen.getByTestId('node-image')
    expect(img.src).toContain('legacy.png')
    expect(img.style.objectPosition).toBe('10% 20%')
  })

  it('pages through an album and shows the position indicator', () => {
    render(
      <Harness
        initialData={{ images: [{ url: 'a.png' }, { url: 'b.png' }, { url: 'c.png' }], activeIndex: 0 }}
      />,
    )
    expect(screen.getByText('1/3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'รูปถัดไป' }))
    expect(screen.getByText('2/3')).toBeTruthy()
    expect(screen.getByTestId('node-image').src).toContain('b.png')
  })

  it('removes the active image from the album', () => {
    render(<Harness initialData={{ images: [{ url: 'a.png' }, { url: 'b.png' }], activeIndex: 0 }} />)
    fireEvent.click(screen.getByRole('button', { name: 'ลบรูปนี้' }))
    expect(screen.getByTestId('node-image').src).toContain('b.png')
    expect(screen.queryByRole('button', { name: 'รูปถัดไป' })).toBeNull()
  })

  it('opens the lightbox with the full album', () => {
    render(<Harness initialData={{ images: [{ url: 'a.png' }, { url: 'b.png' }], activeIndex: 0 }} />)
    fireEvent.click(screen.getByRole('button', { name: 'ขยายรูป' }))
    expect(screen.getByTestId('lightbox').dataset.count).toBe('2')
  })
})
```
- [ ] Step 2: Run it, confirm it fails: `npm test -- components/roadmap/ImageNode`. Expected failure: assertions fail because the current `ImageNode.jsx` still reads `data.url`/`data.offset` directly (no album, no `node-image` testid, no paging/remove/expand buttons) — several `getByRole`/`getByTestId` calls throw "Unable to find element".
- [ ] Step 3: Minimal implementation — replace the full contents of `src/components/roadmap/ImageNode.jsx`:
```jsx
import { useRef, useState } from 'react'
import { Position } from '@xyflow/react'
import { ImageIcon, Pencil, ChevronLeft, ChevronRight, Trash2, Maximize2 } from 'lucide-react'
import ImagePickerModal from './ImagePickerModal'
import MediaLightbox from './MediaLightbox'
import ConnectionDot from './ConnectionDot'
import { computeImageOffset } from '../../utils/computeImageOffset'
import { normalizeImageNodeData, DEFAULT_IMAGE_OFFSET } from '../../utils/normalizeImageNodeData'
import { stepAlbumIndex } from '../../utils/stepAlbumIndex'
import { removeAlbumImage } from '../../utils/removeAlbumImage'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

// Decorative connection points on all four sides — used to snap the image
// adjacent to flow blocks (lineless, like every other connection).
const SIDES = [Position.Top, Position.Bottom, Position.Left, Position.Right]

export default function ImageNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  // Holds the last pointer position + the frame's screen size while panning.
  // Screen size (not the 128 world size) keeps the math correct under zoom.
  const dragRef = useRef(null)

  const { images, activeIndex } = normalizeImageNodeData(data)
  const hasImage = images.length > 0
  const active = images[activeIndex]
  const offset = active?.offset ?? DEFAULT_IMAGE_OFFSET

  // Pan only when the block is selected; otherwise the pointer drag is left to
  // React Flow so the block moves around the canvas as usual.
  const panning = selected && hasImage

  const onPointerDown = (e) => {
    if (!panning) return
    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!dragRef.current) return
    const { x, y, w, h } = dragRef.current
    const delta = { dx: e.clientX - x, dy: e.clientY - y }
    dragRef.current = { ...dragRef.current, x: e.clientX, y: e.clientY }
    const nextOffset = computeImageOffset(offset, delta, { w, h })
    updateNodeData(id, {
      images: images.map((img, i) => (i === activeIndex ? { ...img, offset: nextOffset } : img)),
    })
  }
  const onPointerUp = (e) => {
    dragRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  const goToIndex = (delta) => (e) => {
    e.stopPropagation()
    updateNodeData(id, { activeIndex: stepAlbumIndex(activeIndex, delta, images.length) })
  }

  const removeActive = (e) => {
    e.stopPropagation()
    updateNodeData(id, removeAlbumImage(images, activeIndex, activeIndex))
  }

  return (
    <div className="relative w-32 h-32">
      <div
        className={`w-full h-full rounded-2xl border-2 bg-white shadow-md overflow-hidden flex items-center justify-center transition-all ${
          panning ? 'nodrag cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        } ${selected ? 'border-brand shadow-brand/30 shadow-lg' : 'border-brand/40'}`}
        onClick={hasImage ? undefined : () => setPickerOpen(true)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="button"
        aria-label="Choose image"
      >
        {hasImage ? (
          <img
            data-testid="node-image"
            src={active.url}
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: `${offset.x}% ${offset.y}%` }}
            draggable={false}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-brand/50">
            <ImageIcon size={28} strokeWidth={1.5} />
            <span className="pixel-font text-[7px] text-gray-300">tap to choose</span>
          </div>
        )}
      </div>

      {/* Re-open the picker to add another image once at least one is set;
          `nodrag` + stopPropagation keep this tap from being swallowed by
          canvas dragging or image panning. */}
      {hasImage && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setPickerOpen(true)}
          aria-label="เพิ่ม/เปลี่ยนรูป"
          className="nodrag absolute top-1 right-1 w-6 h-6 rounded-lg bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-brand active:scale-95 transition-all"
        >
          <Pencil size={13} />
        </button>
      )}

      {/* Remove the currently shown image from the album. */}
      {hasImage && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={removeActive}
          aria-label="ลบรูปนี้"
          className="nodrag absolute top-1 left-1 w-6 h-6 rounded-lg bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-red-500 active:scale-95 transition-all"
        >
          <Trash2 size={13} />
        </button>
      )}

      {/* Expand into the full-screen lightbox. */}
      {hasImage && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setLightboxOpen(true) }}
          aria-label="ขยายรูป"
          className="nodrag absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-brand active:scale-95 transition-all"
        >
          <Maximize2 size={13} />
        </button>
      )}

      {/* Album paging — only shown once there is more than one image. */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={goToIndex(-1)}
            aria-label="รูปก่อนหน้า"
            className="nodrag absolute left-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-brand active:scale-95 transition-all"
          >
            <ChevronLeft size={12} />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={goToIndex(1)}
            aria-label="รูปถัดไป"
            className="nodrag absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-brand active:scale-95 transition-all"
          >
            <ChevronRight size={12} />
          </button>
          <span className="nodrag absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-white/90 shadow pixel-font text-[6px] text-gray-500">
            {activeIndex + 1}/{images.length}
          </span>
        </>
      )}

      {SIDES.map((pos) => (
        <ConnectionDot key={pos} id={pos} type="source" position={pos} />
      ))}

      {pickerOpen && <ImagePickerModal nodeId={id} onClose={() => setPickerOpen(false)} />}
      {lightboxOpen && (
        <MediaLightbox
          items={images.map((img) => ({ type: 'image', url: img.url }))}
          initialIndex={activeIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}
```
- [ ] Step 4: Run it, confirm it passes: `npm test -- components/roadmap/ImageNode`. All 5 tests green.
- [ ] Step 5: Manual verification in `npm run dev`:
  1. Open the Roadmap, add an Image block, click it to open the picker, upload a photo. Confirm it appears in the block.
  2. Click the pencil icon again, pick/upload a second image. Confirm the modal stays open (does not auto-close) and the block now shows a "1/2"-style indicator in the bottom-center with left/right chevron arrows.
  3. Click the right chevron: confirm the image changes and the indicator reads "2/2". Click left chevron: back to "1/2".
  4. Select the block (click once to select it, not drag) and drag inside it: confirm the visible image still pans/repositions (existing offset behavior) and the pan applies to whichever image is currently active.
  5. Click the trash icon: confirm the current image is removed, the remaining image shows, and (once only 1 image remains) the indicator/arrows disappear.
  6. Click the expand icon (bottom-right): confirm a full-screen dark overlay opens showing the image large; confirm clicking the backdrop or the X closes it.
- [ ] Step 6: Commit:
```bash
git add src/components/roadmap/ImageNode.jsx src/components/roadmap/ImageNode.test.jsx
git commit -m "feat(roadmap): turn ImageNode into a multi-image album with lightbox"
```

---
### Task 6: `ImagePickerModal` — append instead of replace

**Files:** `src/components/roadmap/ImagePickerModal.jsx` (edit), `src/components/roadmap/ImagePickerModal.test.jsx` (new)
**Interfaces:** `ImagePickerModal({ nodeId, onClose })` unchanged signature; internally now reads the target node's current `data` from `useRoadmapStore` to append rather than replace.

- [ ] Step 1: Write the failing test — create `src/components/roadmap/ImagePickerModal.test.jsx`:
```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../firebase', () => ({ storage: {} }))
vi.mock('firebase/storage', () => ({
  ref: (_s, p) => ({ path: p }),
  getDownloadURL: vi.fn(),
}))
vi.mock('../../utils/storageOps', () => ({
  listFlat: vi.fn(),
  uploadAsset: vi.fn(),
}))
vi.mock('../../hooks/useMytcas', () => ({ tcasLogoUrl: (id) => `logo-${id}` }))

let authState
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))
let userState
vi.mock('../../stores/useUserStore', () => ({
  useUserStore: (sel) => sel(userState),
}))
let selectState
vi.mock('../../stores/useSelectStore', () => ({
  useSelectStore: (sel) => sel(selectState),
}))

let roadmapState
let updateNodeDataSpy
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel(roadmapState),
}))

const { default: ImagePickerModal } = await import('./ImagePickerModal')
const { listFlat } = await import('../../utils/storageOps')

describe('ImagePickerModal', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    userState = { profilePhotoURL: null }
    selectState = { university: null }
    updateNodeDataSpy = vi.fn()
    roadmapState = {
      nodes: [{ id: 'n1', data: { images: [{ url: 'existing.png', offset: { x: 50, y: 50 } }], activeIndex: 0 } }],
      updateNodeData: updateNodeDataSpy,
    }
    listFlat.mockResolvedValue([])
  })

  it('appends a picked upload to the album instead of replacing it, and stays open', async () => {
    const { getDownloadURL } = await import('firebase/storage')
    listFlat.mockResolvedValue([{ path: 'x', ref: {} }])
    getDownloadURL.mockResolvedValue('https://cdn/new.png')
    const onClose = vi.fn()
    render(<ImagePickerModal nodeId="n1" onClose={onClose} />)

    const thumb = await screen.findByRole('img', { name: 'image' })
    fireEvent.click(thumb.closest('button'))

    await waitFor(() => expect(updateNodeDataSpy).toHaveBeenCalled())
    expect(updateNodeDataSpy).toHaveBeenCalledWith('n1', {
      images: [
        { url: 'existing.png', offset: { x: 50, y: 50 } },
        { url: 'https://cdn/new.png', offset: { x: 50, y: 50 } },
      ],
      activeIndex: 1,
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows a helper hint telling the user to close the modal when done', () => {
    render(<ImagePickerModal nodeId="n1" onClose={vi.fn()} />)
    expect(screen.getByText(/close when you're done/i)).toBeTruthy()
  })
})
```
- [ ] Step 2: Run it, confirm it fails: `npm test -- ImagePickerModal`. Expected failure: `updateNodeDataSpy` is called with `{ url: 'https://cdn/new.png' }` (replace behavior) instead of the appended `images` array, and the hint text doesn't exist yet.
- [ ] Step 3: Minimal implementation — replace the full contents of `src/components/roadmap/ImagePickerModal.jsx`:
```jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getDownloadURL } from 'firebase/storage'
import { X, Upload, Loader } from 'lucide-react'
import { listFlat, uploadAsset } from '../../utils/storageOps'
import { tcasLogoUrl } from '../../hooks/useMytcas'
import { useAuthStore } from '../../stores/useAuthStore'
import { useUserStore } from '../../stores/useUserStore'
import { useSelectStore } from '../../stores/useSelectStore'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import { normalizeImageNodeData, DEFAULT_IMAGE_OFFSET } from '../../utils/normalizeImageNodeData'

// Asset picker for an image block: previously uploaded roadmap images, app
// assets (profile photo + selected university logo), and a fresh upload.
// Selecting an image APPENDS it to the block's album (data.images) rather
// than replacing it — the modal stays open afterwards so the user can add
// several images in one sitting; they close it explicitly via the X button
// or a backdrop click when done.
export default function ImagePickerModal({ nodeId, onClose }) {
  const uid = useAuthStore((s) => s.user?.uid)
  const profilePhotoURL = useUserStore((s) => s.profilePhotoURL)
  const university = useSelectStore((s) => s.university)
  const nodeData = useRoadmapStore((s) => s.nodes.find((n) => n.id === nodeId)?.data)
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)

  const [uploads, setUploads] = useState([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  // Load previously uploaded roadmap images.
  useEffect(() => {
    if (!uid) return
    let alive = true
    listFlat(`users/${uid}/roadmap/`)
      .then((entries) => Promise.all(entries.map(({ ref }) => getDownloadURL(ref))))
      .then((urls) => { if (alive) setUploads(urls) })
      .catch(() => { if (alive) setUploads([]) })
    return () => { alive = false }
  }, [uid])

  const appendImage = useCallback((url) => {
    const { images } = normalizeImageNodeData(nodeData)
    const nextImages = [...images, { url, offset: DEFAULT_IMAGE_OFFSET }]
    updateNodeData(nodeId, { images: nextImages, activeIndex: nextImages.length - 1 })
  }, [nodeData, nodeId, updateNodeData])

  const pick = useCallback((url) => {
    appendImage(url)
  }, [appendImage])

  const onFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uid) return
    setUploading(true)
    try {
      // Unique path per upload: a node can now hold many images, so reusing
      // one path per node would overwrite an earlier image's Storage object.
      const url = await uploadAsset(`users/${uid}/roadmap/${nodeId}-${Date.now()}`, file, { contentType: file.type })
      appendImage(url)
    } catch {
      // swallow — the upload button below returns to its resting state
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }, [uid, nodeId, appendImage])

  const appImages = [
    profilePhotoURL && { url: profilePhotoURL, label: 'Profile' },
    university && { url: tcasLogoUrl(university), label: 'University' },
  ].filter(Boolean)

  // Rendered through a portal to document.body: the Image block lives inside
  // React Flow's transformed viewport, where a position:fixed child would
  // anchor to that transform (scaled/offset, unclickable) instead of the
  // screen. Portalling out lets `fixed inset-0` cover the real viewport.
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm aspect-square max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <p className="pixel-font text-[11px] font-bold text-gray-800">Choose image</p>
            <p className="pixel-font text-[7px] text-gray-400 mt-0.5">Tap to add — close when you're done</p>
          </div>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:scale-95 transition-all"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* My uploads */}
          <Section title="My uploads">
            {uploads.length === 0
              ? <Empty>No uploads yet</Empty>
              : uploads.map((url) => <Thumb key={url} url={url} onClick={() => pick(url)} />)}
          </Section>

          {/* App images */}
          <Section title="App images">
            {appImages.length === 0
              ? <Empty>None available</Empty>
              : appImages.map((img) => <Thumb key={img.url} url={img.url} label={img.label} onClick={() => pick(img.url)} />)}
          </Section>

          {/* Upload new */}
          <button
            onClick={() => !uploading && inputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand/40 text-brand hover:bg-brand/5 active:scale-95 transition-all"
          >
            {uploading
              ? <Loader size={18} className="animate-spin" />
              : <><Upload size={16} /><span className="pixel-font text-[10px]">Upload new</span></>}
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="pixel-font text-[9px] text-gray-400">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Thumb({ url, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-16 h-16 rounded-xl border-2 border-gray-100 overflow-hidden hover:border-brand active:scale-95 transition-all relative"
    >
      <img src={url} alt={label ?? 'image'} className="w-full h-full object-contain p-1" draggable={false} />
      {label && (
        <span className="absolute bottom-0 inset-x-0 bg-white/80 pixel-font text-[6px] text-gray-500 text-center">{label}</span>
      )}
    </button>
  )
}

function Empty({ children }) {
  return <span className="pixel-font text-[8px] text-gray-300">{children}</span>
}
```
- [ ] Step 4: Run it, confirm it passes: `npm test -- ImagePickerModal`. Both tests green.
- [ ] Step 5: Manual verification in `npm run dev`: covered by Task 5 Step 5 (picking multiple images without the modal auto-closing). Additionally: upload two different files in a row from "Upload new" and confirm both appear as separate images in the album (not one overwriting the other).
- [ ] Step 6: Commit:
```bash
git add src/components/roadmap/ImagePickerModal.jsx src/components/roadmap/ImagePickerModal.test.jsx
git commit -m "feat(roadmap): make ImagePickerModal append to the album, not replace"
```

---
### Task 7: Register the Video block's default size

**Files:** `src/utils/computeSnapPosition.js` (edit), `src/utils/computeSnapPosition.test.js` (edit)
**Interfaces:** `BLOCK_SIZES.video = { w: 128, h: 128 }` (same footprint as `image`).

- [ ] Step 1: Write the failing test — add this test to the end of the `describe('computeSnapPosition', ...)` block in `src/utils/computeSnapPosition.test.js` (append right after the existing "uses measured dimensions..." test, before the closing `})`):
```js
  it('uses the video block size (128x128) just like image blocks', () => {
    const videoSource = { type: 'video', position: { x: 100, y: 100 } }
    const videoTarget = { type: 'video', position: { x: 0, y: 0 } }
    // right exit: x = 100 + 128 = 228; y = 100 + 64 - 64 = 100
    expect(computeSnapPosition(videoSource, videoTarget, 'right')).toEqual({ x: 228, y: 100 })
  })
```
- [ ] Step 2: Run it, confirm it fails: `npm test -- computeSnapPosition`. Expected failure: without a `video` entry, `BLOCK_SIZES['video']` is `undefined`, so the fallback `160`/`80` is used, producing `{ x: 260, y: 100 }` instead of `{ x: 228, y: 100 }`.
- [ ] Step 3: Minimal implementation — in `src/utils/computeSnapPosition.js`, edit `BLOCK_SIZES`:
```js
// Default block dimensions per node type, used when React Flow has not yet
// measured a node (node.measured is absent on first render).
export const BLOCK_SIZES = {
  process: { w: 128, h: 128 },
  condition: { w: 128, h: 128 },
  image: { w: 128, h: 128 },
  video: { w: 128, h: 128 },
  stageLabel: { w: 120, h: 40 },
}
```
- [ ] Step 4: Run it, confirm it passes: `npm test -- computeSnapPosition`. All tests (including the new one) green.
- [ ] Step 5: Manual verification: N/A (verified visually once the Video block exists on the canvas, in Task 10's manual step — correct sizing shows as a 128x128 box matching the Image block).
- [ ] Step 6: Commit:
```bash
git add src/utils/computeSnapPosition.js src/utils/computeSnapPosition.test.js
git commit -m "feat(roadmap): register 128x128 default size for the video block type"
```

---
### Task 8: `VideoPickerModal` — asset picker for video

**Files:** `src/components/roadmap/VideoPickerModal.jsx` (new), `src/components/roadmap/VideoPickerModal.test.jsx` (new)
**Interfaces:** `export default function VideoPickerModal({ nodeId, onClose })`.

- [ ] Step 1: Write the failing test — create `src/components/roadmap/VideoPickerModal.test.jsx`:
```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../firebase', () => ({ storage: {} }))
vi.mock('firebase/storage', () => ({
  ref: (_s, p) => ({ path: p }),
  getDownloadURL: vi.fn(),
}))
vi.mock('../../utils/storageOps', () => ({
  listFlat: vi.fn(),
  uploadAsset: vi.fn(),
}))

let authState
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))
let updateNodeDataSpy
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel({ updateNodeData: (...args) => updateNodeDataSpy(...args) }),
}))

const { default: VideoPickerModal } = await import('./VideoPickerModal')
const { listFlat } = await import('../../utils/storageOps')

describe('VideoPickerModal', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    updateNodeDataSpy = vi.fn()
    listFlat.mockResolvedValue([])
  })

  it('lists previous uploads from the roadmap-video/ prefix, not roadmap/', async () => {
    render(<VideoPickerModal nodeId="n1" onClose={vi.fn()} />)
    await waitFor(() => expect(listFlat).toHaveBeenCalledWith('users/u1/roadmap-video/'))
  })

  it('picking an uploaded video replaces data.url and closes the modal', async () => {
    const { getDownloadURL } = await import('firebase/storage')
    listFlat.mockResolvedValue([{ path: 'x', ref: {} }])
    getDownloadURL.mockResolvedValue('https://cdn/clip.mp4')
    const onClose = vi.fn()
    render(<VideoPickerModal nodeId="n1" onClose={onClose} />)

    const thumb = await screen.findByRole('button', { name: 'เลือกวิดีโอนี้' })
    fireEvent.click(thumb)

    expect(updateNodeDataSpy).toHaveBeenCalledWith('n1', { url: 'https://cdn/clip.mp4' })
    expect(onClose).toHaveBeenCalled()
  })

  it('has no App images section (unlike ImagePickerModal)', () => {
    render(<VideoPickerModal nodeId="n1" onClose={vi.fn()} />)
    expect(screen.queryByText('App images')).toBeNull()
  })
})
```
- [ ] Step 2: Run it, confirm it fails: `npm test -- VideoPickerModal`. Expected failure: `Failed to resolve import "./VideoPickerModal"`.
- [ ] Step 3: Minimal implementation — create `src/components/roadmap/VideoPickerModal.jsx`:
```jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getDownloadURL } from 'firebase/storage'
import { X, Upload, Loader } from 'lucide-react'
import { listFlat, uploadAsset } from '../../utils/storageOps'
import { useAuthStore } from '../../stores/useAuthStore'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

// Asset picker for a Video block: previously uploaded roadmap videos and a
// fresh upload. Unlike ImagePickerModal there is no "App images" tab (no
// app-provided video equivalent to a profile photo/university logo), and
// picking a video REPLACES data.url and closes the modal — a Video block
// holds exactly one video, not an album, so there's nothing to keep the
// modal open for.
export default function VideoPickerModal({ nodeId, onClose }) {
  const uid = useAuthStore((s) => s.user?.uid)
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)

  const [uploads, setUploads] = useState([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  // Videos live under a separate `roadmap-video/` prefix from images so this
  // folder's contents are always safe to render with a <video> element — an
  // images-and-videos-mixed folder would need per-file type sniffing.
  useEffect(() => {
    if (!uid) return
    let alive = true
    listFlat(`users/${uid}/roadmap-video/`)
      .then((entries) => Promise.all(entries.map(({ ref }) => getDownloadURL(ref))))
      .then((urls) => { if (alive) setUploads(urls) })
      .catch(() => { if (alive) setUploads([]) })
    return () => { alive = false }
  }, [uid])

  const pick = useCallback((url) => {
    updateNodeData(nodeId, { url })
    onClose()
  }, [nodeId, updateNodeData, onClose])

  const onFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uid) return
    setUploading(true)
    try {
      const url = await uploadAsset(`users/${uid}/roadmap-video/${nodeId}-${Date.now()}`, file, { contentType: file.type })
      updateNodeData(nodeId, { url })
      onClose()
    } catch {
      setUploading(false)
      e.target.value = ''
    }
  }, [uid, nodeId, updateNodeData, onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm aspect-square max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <p className="pixel-font text-[11px] font-bold text-gray-800">Choose video</p>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:scale-95 transition-all"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <Section title="My uploads">
            {uploads.length === 0
              ? <Empty>No uploads yet</Empty>
              : uploads.map((url) => <Thumb key={url} url={url} onClick={() => pick(url)} />)}
          </Section>

          <button
            onClick={() => !uploading && inputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand/40 text-brand hover:bg-brand/5 active:scale-95 transition-all"
          >
            {uploading
              ? <Loader size={18} className="animate-spin" />
              : <><Upload size={16} /><span className="pixel-font text-[10px]">Upload new</span></>}
          </button>
          <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={onFileChange} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="pixel-font text-[9px] text-gray-400">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Thumb({ url, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="เลือกวิดีโอนี้"
      className="w-16 h-16 rounded-xl border-2 border-gray-100 overflow-hidden hover:border-brand active:scale-95 transition-all relative bg-black"
    >
      <video src={url} className="w-full h-full object-cover pointer-events-none" muted />
    </button>
  )
}

function Empty({ children }) {
  return <span className="pixel-font text-[8px] text-gray-300">{children}</span>
}
```
- [ ] Step 4: Run it, confirm it passes: `npm test -- VideoPickerModal`. All 3 tests green.
- [ ] Step 5: Manual verification: covered together with Task 9's manual step (needs `VideoNode` to trigger it).
- [ ] Step 6: Commit:
```bash
git add src/components/roadmap/VideoPickerModal.jsx src/components/roadmap/VideoPickerModal.test.jsx
git commit -m "feat(roadmap): add VideoPickerModal for the Video block"
```

---
### Task 9: `VideoNode` — the new Video block

**Files:** `src/components/roadmap/VideoNode.jsx` (new), `src/components/roadmap/VideoNode.test.jsx` (new)
**Interfaces:** `export default function VideoNode({ id, data, selected })`, `data` shape `{ url }`.

- [ ] Step 1: Write the failing test — create `src/components/roadmap/VideoNode.test.jsx`:
```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('./ConnectionDot', () => ({ default: () => null }))
vi.mock('./VideoPickerModal', () => ({
  default: ({ nodeId }) => <div data-testid="picker" data-node-id={nodeId} />,
}))
vi.mock('./MediaLightbox', () => ({
  default: ({ items }) => <div data-testid="lightbox" data-count={items.length} data-type={items[0]?.type} />,
}))

const { default: VideoNode } = await import('./VideoNode')

describe('VideoNode', () => {
  it('shows the empty state and opens the picker when tapped', () => {
    render(<VideoNode id="n1" data={{}} selected={false} />)
    expect(screen.getByText('tap to choose')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Choose video' }))
    expect(screen.getByTestId('picker').dataset.nodeId).toBe('n1')
  })

  it('renders the video element once a url is set', () => {
    render(<VideoNode id="n1" data={{ url: 'clip.mp4' }} selected={false} />)
    const video = document.querySelector('video')
    expect(video.src).toContain('clip.mp4')
  })

  it('opens the lightbox with a single video item', () => {
    render(<VideoNode id="n1" data={{ url: 'clip.mp4' }} selected={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'ขยายวิดีโอ' }))
    expect(screen.getByTestId('lightbox').dataset.count).toBe('1')
    expect(screen.getByTestId('lightbox').dataset.type).toBe('video')
  })
})
```
- [ ] Step 2: Run it, confirm it fails: `npm test -- components/roadmap/VideoNode`. Expected failure: `Failed to resolve import "./VideoNode"`.
- [ ] Step 3: Minimal implementation — create `src/components/roadmap/VideoNode.jsx`:
```jsx
import { useState } from 'react'
import { Position } from '@xyflow/react'
import { Video as VideoIcon, Pencil, Maximize2 } from 'lucide-react'
import VideoPickerModal from './VideoPickerModal'
import MediaLightbox from './MediaLightbox'
import ConnectionDot from './ConnectionDot'

const SIDES = [Position.Top, Position.Bottom, Position.Left, Position.Right]

// Modeled on ImageNode.jsx's picker-trigger-when-empty + portal-modal
// pattern, but for a single video: no album (a node holds exactly one
// video) and no pan-to-reposition control (that only makes sense for a
// cover-filled image, not a <video> element).
export default function VideoNode({ id, data, selected }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const hasVideo = Boolean(data?.url)

  return (
    <div className="relative w-32 h-32">
      <div
        className={`w-full h-full rounded-2xl border-2 bg-black shadow-md overflow-hidden flex items-center justify-center transition-all cursor-pointer ${
          selected ? 'border-brand shadow-brand/30 shadow-lg' : 'border-brand/40'
        }`}
        onClick={hasVideo ? undefined : () => setPickerOpen(true)}
        role="button"
        aria-label="Choose video"
      >
        {hasVideo ? (
          <video src={data.url} controls className="nodrag w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-brand/50">
            <VideoIcon size={28} strokeWidth={1.5} />
            <span className="pixel-font text-[7px] text-gray-300">tap to choose</span>
          </div>
        )}
      </div>

      {/* Re-open the picker to replace the video; `nodrag` + stopPropagation
          keep this tap from being swallowed by canvas dragging. */}
      {hasVideo && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setPickerOpen(true)}
          aria-label="เปลี่ยนวิดีโอ"
          className="nodrag absolute top-1 right-1 w-6 h-6 rounded-lg bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-brand active:scale-95 transition-all"
        >
          <Pencil size={13} />
        </button>
      )}

      {/* Expand into the full-screen lightbox. */}
      {hasVideo && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setLightboxOpen(true) }}
          aria-label="ขยายวิดีโอ"
          className="nodrag absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-brand active:scale-95 transition-all"
        >
          <Maximize2 size={13} />
        </button>
      )}

      {SIDES.map((pos) => (
        <ConnectionDot key={pos} id={pos} type="source" position={pos} />
      ))}

      {pickerOpen && <VideoPickerModal nodeId={id} onClose={() => setPickerOpen(false)} />}
      {lightboxOpen && (
        <MediaLightbox
          items={[{ type: 'video', url: data.url }]}
          initialIndex={0}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}
```
- [ ] Step 4: Run it, confirm it passes: `npm test -- components/roadmap/VideoNode`. All 3 tests green.
- [ ] Step 5: Manual verification: covered together with Task 10 (needs the toolbar button to add a Video block to the canvas).
- [ ] Step 6: Commit:
```bash
git add src/components/roadmap/VideoNode.jsx src/components/roadmap/VideoNode.test.jsx
git commit -m "feat(roadmap): add VideoNode, the new single-video block"
```

---
### Task 10: Wire the Video block into `RoadmapPage`

**Files:** `src/pages/RoadmapPage.jsx` (edit)
**Interfaces:** `nodeTypes.video = VideoNode`; new toolbar button calling `addAtCenter('video')`.

- [ ] Step 1: Write the failing test — this task is wiring inside a page component that has no existing test file (`RoadmapPage.jsx` is React-Flow-canvas-heavy and not unit-tested elsewhere in this repo); skip an automated test and rely on Step 5's manual verification, consistent with this plan's "Tests" section (anything requiring real drag gestures / full canvas rendering gets a manual-verification step instead). No test file is created for this task.
- [ ] Step 2: N/A (no automated test for this task — see Step 1).
- [ ] Step 3: Minimal implementation — three edits to `src/pages/RoadmapPage.jsx`:

  Edit 1 — add the import (directly below the existing `ImageNode` import):
  ```
  Find:
  import ImageNode from '../components/roadmap/ImageNode'

  Replace with:
  import ImageNode from '../components/roadmap/ImageNode'
  import VideoNode from '../components/roadmap/VideoNode'
  ```

  Edit 2 — register the node type:
  ```
  Find:
  const nodeTypes = { process: ProcessNode, condition: ConditionNode, stageLabel: StageLabelNode, image: ImageNode }

  Replace with:
  const nodeTypes = { process: ProcessNode, condition: ConditionNode, stageLabel: StageLabelNode, image: ImageNode, video: VideoNode }
  ```

  Edit 3 — add the toolbar button, right after the existing Image button and before the "Mobile select mode toggle" comment:
  ```
  Find:
              <button
                onClick={() => addAtCenter('image')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Image block"
              >
                <div className="w-8 h-8 rounded-xl bg-brand/10 border-2 border-brand/30 flex items-center justify-center">
                  <span className="text-[14px]">🖼️</span>
                </div>
                <span className="pixel-font text-[8px] text-ink">Image</span>
              </button>
              {/* Mobile select mode toggle */}

  Replace with:
              <button
                onClick={() => addAtCenter('image')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Image block"
              >
                <div className="w-8 h-8 rounded-xl bg-brand/10 border-2 border-brand/30 flex items-center justify-center">
                  <span className="text-[14px]">🖼️</span>
                </div>
                <span className="pixel-font text-[8px] text-ink">Image</span>
              </button>
              <button
                onClick={() => addAtCenter('video')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Video block"
              >
                <div className="w-8 h-8 rounded-xl bg-brand/10 border-2 border-brand/30 flex items-center justify-center">
                  <span className="text-[14px]">🎬</span>
                </div>
                <span className="pixel-font text-[8px] text-ink">Video</span>
              </button>
              {/* Mobile select mode toggle */}
  ```
- [ ] Step 4: N/A (no automated test — see Step 1/2).
- [ ] Step 5: Manual verification in `npm run dev`:
  1. Open the Roadmap. Confirm a new "Video" button (🎬 icon) appears in the top toolbar after "Image".
  2. Click it: confirm a new empty Video block appears centered in the viewport, same 128x128 size as an Image block.
  3. Click the empty Video block: confirm the "Choose video" picker modal opens with "My uploads" and "Upload new" sections only (no "App images" section).
  4. Upload a short video file. Confirm the modal closes automatically (single-select replace behavior, unlike the Image picker) and the block now shows the video with native controls.
  5. Click the pencil icon and upload a different video: confirm it replaces the first one.
  6. Click the expand icon: confirm the lightbox opens showing the video large with controls and autoplay; confirm closing it (X, backdrop, or Escape key) works.
  7. Resize the browser to a narrow/mobile width (or open dev tools device toolbar): confirm the lightbox fills the full viewport at narrow widths and is centered with visible black margin at desktop widths.
  8. Drag a Video block near a Process block's exit handle: confirm it snaps into place exactly like an Image block (128x128 sizing wired correctly).
- [ ] Step 6: Commit:
```bash
git add src/pages/RoadmapPage.jsx
git commit -m "feat(roadmap): register the Video block and add its toolbar button"
```

---
### Task 11: Full-suite verification pass

**Files:** none (verification only)
**Interfaces:** none

- [ ] Step 1: N/A — this task runs the whole suite rather than adding a new test.
- [ ] Step 2: N/A.
- [ ] Step 3: N/A.
- [ ] Step 4: Run the entire unit test suite and confirm nothing outside this plan's files regressed: `npm test`. Expected: all suites pass, including every new file from Tasks 1–9 and the pre-existing suites (`AuthPage.test.jsx`, `computeImageOffset.test.js`, `computeSnapPosition.test.js`, `storageOps.test.js`, etc.).
- [ ] Step 5: Manual verification in `npm run dev` — a combined smoke test exercising both blocks together:
  1. Build a small board: one Image block with a 3-image album, one Video block with a video, connected side by side.
  2. Export the board (Download icon in the header). Open the downloaded `roadmap.json` in a text editor and confirm the Image node's `data` contains `images`/`activeIndex` and the Video node's `data` contains `url`, proving `roadmapExport.js` round-trips both shapes untouched.
  3. Refresh the page (or import that same JSON back in via the Upload icon into a blank board) and confirm both blocks render identically — proving `normalizeImageNodeData` and the plain `{ url }` Video shape both survive reload/import.
  4. Open the lightbox from the Image block's album, page through all 3 images, close it, then open the lightbox from the Video block and confirm it plays — proving `MediaLightbox` is correctly shared between both node types.
- [ ] Step 6: No commit for this task (verification only); if Step 4 or 5 surfaces a regression, fix it under the relevant task above and amend that task's commit history with a new fix commit, then re-run this task.
