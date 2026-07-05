import { shapes } from '../lib/db'

/**
 * Pure migration check: given a plain users/{uid} doc (already fetched) and a
 * pre-generated sheetId, decide whether the legacy single-document Roadmap
 * needs to become "sheet #1, named Roadmap".
 *
 * Returns null when no migration is needed (no legacy `roadmap` field, or
 * `roadmapSheetIds` already exists). Otherwise returns the new sheet doc
 * (write to roadmapSheets/{sheetId}) and the user-doc patch (merge into
 * users/{uid}) while keeping the legacy `roadmap` field untouched.
 */
export function migrateLegacyRoadmap(userDoc, sheetId) {
  if (!userDoc?.roadmap) return null
  if (Array.isArray(userDoc.roadmapSheetIds) && userDoc.roadmapSheetIds.length > 0) return null

  const { nodes = [], edges = [] } = userDoc.roadmap
  const sheetDoc = shapes.newRoadmapSheet({
    ownerUid: userDoc.uid,
    name: 'Roadmap',
    nodes,
    edges,
    order: 0,
  })

  return {
    sheetId,
    sheetDoc,
    userDocPatch: { roadmapSheetIds: [sheetId] },
  }
}
