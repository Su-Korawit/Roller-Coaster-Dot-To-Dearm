// Validate an uploaded map. Hard errors block; warnings are advisory.
// Messages are Thai-facing (shown in the dashboard).

export function validateMap({ meta, unmatchedTilesets = [], existingMapKeys = [] }) {
  const errors = []
  const warnings = []

  if (!meta.spawns || meta.spawns.length === 0) {
    errors.push('ไม่พบ Spawns layer หรือไม่มีจุด spawn — ผู้เล่นจะไม่มีที่เกิด')
  } else if (!meta.defaultSpawnName) {
    errors.push('ไม่มีจุด spawn ที่เป็น default')
  }

  for (const name of unmatchedTilesets) {
    errors.push(`Tileset "${name}" ยังหา asset ไม่เจอ — เลือกหรืออัปโหลดก่อน`)
  }

  if (!meta.portals || meta.portals.length === 0) {
    warnings.push('แมพนี้ไม่มี Portals layer (เป็นแมพปลายทางอย่างเดียว — ออกไม่ได้)')
  }
  for (const p of meta.portals || []) {
    if (!p.target) {
      warnings.push('มี portal ที่ยังไม่ได้ตั้ง target')
    } else if (!existingMapKeys.includes(p.target)) {
      warnings.push(`portal ชี้ไปแมพ "${p.target}" ที่ยังไม่มี (อัปโหลดทีหลังได้)`)
    }
  }

  return { errors, warnings }
}
