import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { STARTER_LAYOUT } from './defaultLayout'
import { validateLayout } from './placement'
import { ROOM_CATALOG, STARTER_ITEMS } from '../data/roomCatalogSeed'

const require = createRequire(import.meta.url)
const server = require('../../functions/roomLogic.js')

describe('STARTER_LAYOUT', () => {
  it('is the same room the server writes for a new account', () => {
    expect(STARTER_LAYOUT).toEqual(server.STARTER_LAYOUT)
  })

  it('is valid for the starter inventory', () => {
    expect(validateLayout({ layout: STARTER_LAYOUT, catalog: ROOM_CATALOG, inventory: STARTER_ITEMS })).toEqual({ ok: true, errors: [] })
  })
})
