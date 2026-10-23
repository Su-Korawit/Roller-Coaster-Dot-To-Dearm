import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { validateAvatar, sanitizeAvatar, AVATAR_SLOTS, EMPTY_AVATAR } from './avatar'
import fixtures from './avatarFixtures.json'

const require = createRequire(import.meta.url)
const server = require('../../functions/avatarLogic.js')
const codesOf = (r) => [...new Set(r.errors.map((e) => e.code))].sort()

describe('validateAvatar (client)', () => {
  it.each(fixtures.cases.map((c) => [c.name, c]))('%s', (_n, c) => {
    const r = validateAvatar({ avatar: c.avatar, catalog: fixtures.catalog, inventory: c.inventory })
    expect(codesOf(r)).toEqual([...c.codes].sort())
    expect(r.ok).toBe(c.codes.length === 0)
  })

  it('agrees with the server module on every fixture', () => {
    for (const c of fixtures.cases) {
      const input = { avatar: c.avatar, catalog: fixtures.catalog, inventory: c.inventory }
      expect(server.validateAvatar(input)).toEqual(validateAvatar(input))
    }
  })

  it('exposes the four slots and an empty avatar', () => {
    expect(AVATAR_SLOTS).toEqual(['head', 'face', 'neck', 'back'])
    expect(server.AVATAR_SLOTS).toEqual(AVATAR_SLOTS)
    expect(EMPTY_AVATAR).toEqual({ accessories: {}, outfitHue: null })
    expect(validateAvatar({ avatar: EMPTY_AVATAR, catalog: {}, inventory: {} }).ok).toBe(true)
  })
})

describe('sanitizeAvatar (reading what is stored)', () => {
  it('keeps valid slots and a valid hue', () => {
    expect(sanitizeAvatar({ accessories: { head: 'acc_cap', back: 'acc_wings' }, outfitHue: 200 })).toEqual({ accessories: { head: 'acc_cap', back: 'acc_wings' }, outfitHue: 200 })
  })
  it('drops unknown slots, non-string ids and a bad hue instead of throwing', () => {
    expect(sanitizeAvatar({ accessories: { hand: 'x', head: 5, face: null, neck: 'acc_scarf' }, outfitHue: 400 })).toEqual({ accessories: { neck: 'acc_scarf' }, outfitHue: null })
  })
  it('turns anything that is not an avatar into the empty one', () => {
    for (const v of [undefined, null, 'x', 5, [], { accessories: [] }]) expect(sanitizeAvatar(v)).toEqual(EMPTY_AVATAR)
  })
  it('never shares the empty avatar object', () => {
    expect(sanitizeAvatar(null)).not.toBe(EMPTY_AVATAR)
    expect(sanitizeAvatar(null).accessories).not.toBe(EMPTY_AVATAR.accessories)
  })
})
