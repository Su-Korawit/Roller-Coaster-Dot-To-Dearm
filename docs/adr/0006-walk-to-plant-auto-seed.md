---
status: accepted
---

# Walk-to-plant: auto-seed on tile entry from selected Hotbar slot

## Context

The previous planting flow required three explicit steps: stand on a FarmGround tile → tap the FarmActionButton ("ปลูก") → pick a seed from the SeedPicker dialog. This three-step sequence is borrowed from desktop farming games but breaks mobile flow — a thumb has to travel from the joystick to a button to a dialog picker on every single tile.

Mobile 2D farming games (e.g. Harvest Town, Pocket Harvest) handle this with a single gesture: equip the seed in the active item slot, walk over the tile, done.

## Decision

When the player enters an empty FarmGround tile (`farmTileChanged` Phaser event fires with a non-null tile), a `useEffect` in `GameCanvas` immediately calls `plantSeed` using the seed in the currently-selected Hotbar slot. If the selected slot is empty or holds a non-seed item, nothing happens — the player walks freely. The explicit "ปลูก" button and `SeedPicker` dialog are removed. Harvest ("เก็บเกี่ยว") retains its explicit `FarmActionButton` because harvest is irreversible and intentional — silent auto-harvest would surprise players with full inventories.

Slot selection is tracked in `selectedHotbarIndex` state in `GameCanvas`, wired to `Hotbar` via `onSelectSlot`. A `selectedHotbarIndexRef` keeps the latest value readable inside the effect without adding it as a dependency (which would re-trigger the effect on every slot change rather than only on tile entry).

## Alternatives considered

- **Long-press to select seed, then auto-plant:** Adds tap-and-hold latency on a core action that repeats every few seconds. Rejected.
- **Auto-open SeedPicker on tile entry (no button):** Removes the button tap but keeps a blocking dialog — still interrupts flow when moving across multiple tiles. Rejected.
- **Keep SeedPicker, bind to a dedicated "plant" gesture:** Adds a new gesture vocabulary players have to discover. Unnecessary complexity. Rejected.

## Consequences

- Planting is a single gesture (walk with the right slot selected). Seeds deplete silently if the player has a non-seed slot active; players must manage Hotbar selection deliberately.
- `SeedPicker.jsx` is no longer rendered by `GameCanvas`; it remains in the file tree for now and can be deleted in a future cleanup pass if no other caller appears.
- The `FarmActionButton` component is narrowed to harvest-only, which simplifies its label logic.
