import { describe, it, expect, vi } from 'vitest'

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_, ...path) => ({ _col: path.join('/') })),
  doc: vi.fn((_, ...path) => ({ _path: path.join('/') })),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: () => ({ _type: 'serverTimestamp' }),
}))

const { shapes, refs, cols, queries, prefixUpperBound } = await import('./db')
const { orderBy } = await import('firebase/firestore')

describe('welcome refs/cols', () => {
  it('points doc refs at welcomeConfig singletons', () => {
    expect(refs.welcomeGamePreview()).toEqual({ _path: 'welcomeConfig/gamePreview' })
    expect(refs.welcomeStats()).toEqual({ _path: 'welcomeConfig/stats' })
  })

  it('points list cols at welcomeConfig/<section>/items subcollections', () => {
    expect(cols.welcomeNews).toEqual({ _col: 'welcomeConfig/news/items' })
    expect(cols.welcomeFaq).toEqual({ _col: 'welcomeConfig/faq/items' })
    expect(cols.welcomeTestimonials).toEqual({ _col: 'welcomeConfig/testimonials/items' })
  })
})

describe('shapes.readProfile', () => {
  it('reads canonical nested profile.* fields', () => {
    const userDoc = {
      profile: { mbti: 'INTJ', program: 'CS', career: 'eng', masteryTrack: 'advanced', university: 'CU' },
    }
    expect(shapes.readProfile(userDoc)).toEqual({
      mbti: 'INTJ',
      program: 'CS',
      career: 'eng',
      masteryTrack: 'advanced',
      university: 'CU',
    })
  })

  it('falls back to legacy top-level fields, mapping mastery to masteryTrack', () => {
    const legacyDoc = { mbti: 'ENFP', program: 'Med', university: 'MU', mastery: 'beginner' }
    const r = shapes.readProfile(legacyDoc)
    expect(r.mbti).toBe('ENFP')
    expect(r.program).toBe('Med')
    expect(r.university).toBe('MU')
    expect(r.masteryTrack).toBe('beginner')
  })

  it('prefers nested over legacy when both exist', () => {
    const doc = { mbti: 'OLD', profile: { mbti: 'NEW' } }
    expect(shapes.readProfile(doc).mbti).toBe('NEW')
  })
})

describe('shapes.profileFields', () => {
  it('keeps only non-empty fields and maps mastery to masteryTrack', () => {
    expect(shapes.profileFields({ mbti: 'INTJ', career: '', mastery: 'advanced', university: null, program: 'CS' }))
      .toEqual({ mbti: 'INTJ', masteryTrack: 'advanced', program: 'CS' })
  })
})

describe('refs.map', () => {
  it('builds a maps/{uid} document ref', () => {
    expect(refs.map('uid-abc')).toEqual({ _path: 'maps/uid-abc' })
  })
})

describe('cols.maps', () => {
  it('is the maps collection ref', () => {
    expect(cols.maps).toEqual({ _col: 'maps' })
  })
})

describe('refs.mapConfig', () => {
  it('builds a mapConfigs/{key} document ref', () => {
    expect(refs.mapConfig('test3')).toEqual({ _path: 'mapConfigs/test3' })
  })
})

describe('refs.musicConfig', () => {
  it('builds a musicConfig/{docId} document ref', () => {
    expect(refs.musicConfig('background')).toEqual({ _path: 'musicConfig/background' })
  })
})

describe('refs.assetFolder', () => {
  it('builds an assetFolders/{id} document ref', () => {
    expect(refs.assetFolder('folder-1')).toEqual({ _path: 'assetFolders/folder-1' })
  })
})

describe('cols.farmPlants/farmItems/farmShops/mapConfigs/assetFolders', () => {
  it('are their respective collection refs', () => {
    expect(cols.farmPlants).toEqual({ _col: 'farmPlants' })
    expect(cols.farmItems).toEqual({ _col: 'farmItems' })
    expect(cols.farmShops).toEqual({ _col: 'farmShops' })
    expect(cols.mapConfigs).toEqual({ _col: 'mapConfigs' })
    expect(cols.assetFolders).toEqual({ _col: 'assetFolders' })
  })
})

describe('refs.farmItem/farmPlant/farmShop/appUpdate', () => {
  it('build their respective document refs', () => {
    expect(refs.farmItem('item-1')).toEqual({ _path: 'farmItems/item-1' })
    expect(refs.farmPlant('plant-1')).toEqual({ _path: 'farmPlants/plant-1' })
    expect(refs.farmShop('shop-1')).toEqual({ _path: 'farmShops/shop-1' })
    expect(refs.appUpdate('update-1')).toEqual({ _path: 'appUpdates/update-1' })
  })
})

describe('cols.appUpdates', () => {
  it('is the appUpdates collection ref', () => {
    expect(cols.appUpdates).toEqual({ _col: 'appUpdates' })
  })
})

describe('queries.appUpdatesByDate', () => {
  it('queries appUpdates ordered by createdAt desc', () => {
    queries.appUpdatesByDate()
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc')
  })
})

describe('prefixUpperBound', () => {
  it('appends U+F8FF for Firestore prefix range upper bound', () => {
    expect(prefixUpperBound('test')).toBe('test')
  })

  it('appends U+F8FF to empty string', () => {
    expect(prefixUpperBound('')).toBe('')
  })
})