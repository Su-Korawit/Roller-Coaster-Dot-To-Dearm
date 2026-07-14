# 0016 — File Bag Scope and Data Model

**Status:** accepted
**Date:** 2026-07-14

## Context

The IR Board idea "ทำ Feature File Bag" asks for `bag.ilovetcas.com`: a personal
file manager that aggregates uploads (roadmap images/videos/files, exports, and
bag-native uploads), with folders, free-canvas placement, quotas, and paid
storage upgrades. See `docs/plans/2026-07-14-file-bag.md`.

ADR-0012 makes feature subdomains guest-usable (local-first). File Bag has nothing
meaningful to show without a signed-in user's prior uploads, so guest mode does not
apply.

## Decision

1. **Auth-gated exception to ADR-0012.** `bag.ilovetcas.com` is wrapped in
   `RequireAuth` **and** `FeatureLayout`. No guest/local-first mode.

2. **Top-level owned collections.** `fileBagItems` and `fileBagFolders` are
   top-level Firestore collections with `ownerUid` (same pattern as
   `roadmapSheets`), not `users/{uid}/files` subcollections — unbounded owned
   docs stay consistent with existing `refs`/`cols`/`queries` factories.

3. **React Flow canvas, not `@hello-pangea/dnd`.** Free (x,y) placement and
   folder-as-desktop navigation need unbound drag; dnd is axis-constrained list
   reorder. Bag nodes use `BagFileNode` / `BagFolderNode` with no edges/handles.
   Below `md`, a grid/list view replaces the free canvas.

4. **Duplicate = reference, not Storage copy.** Ctrl+D / paste creates a new
   `fileBagItems` doc pointing at the same `storagePath`. No new Storage bytes;
   reference duplicates do **not** consume quota.

5. **Quota via Cloud Functions.** `reserveBagUpload(sizeBytes)` reserves
   `users/{uid}.fileBagUsageBytes` before upload. Base 1GB + entitlement
   `extraBytes`; admins get 1TB. Paid 5GB/25GB plans are `entitlementCatalog`
   items (`kind: 'storage-quota'`).

## Considered options

- Guest mode like Roadmap/School — rejected (nothing to aggregate signed-out).
- Subcollection under `users/{uid}` — rejected (diverges from owned-collection
  pattern; harder to query across the same factory shape).
- Live-list Storage prefixes without Firestore docs — rejected (items can't be
  renamed/moved/foldered as first-class Bag objects).
- Physical file copy on duplicate — rejected (doubles quota and Storage cost).

## Consequences

- New site key `bag` in `SITES` / routing.
- New rules for `fileBagItems` / `fileBagFolders` / `bagSettings`, Storage
  `users/{uid}/bag/**`, and Functions-owned `fileBagUsageBytes`.
- Roadmap/Notebook uploads gain an additive `fileBagItems` write after success.
- Deploys of rules/Functions are queued via `/iloveskill/pending-deploys.json`,
  not applied from the Cursor implementer session.
