import { describe, it, expect } from 'vitest'
import { HOTBAR_ITEMS, BAG_ONLY_ITEMS } from './hotbarItems'
import atlas from '../../public/assets/rc/icons.json'

const all = { ...HOTBAR_ITEMS, ...BAG_ONLY_ITEMS }

describe('item registry', () => {
  it('has exactly the seven hotbar items in default order of ids', () => {
    expect(Object.keys(HOTBAR_ITEMS).sort()).toEqual(['focus', 'letter', 'plan', 'shop', 'tasks', 'wardrobe', 'warp'])
  })

  it('has no id in both registries', () => {
    for (const id of Object.keys(BAG_ONLY_ITEMS)) expect(HOTBAR_ITEMS[id]).toBeUndefined()
  })

  it.each(Object.entries(all))('%s has a label, an icon on the sheet and exactly one target', (id, item) => {
    expect(item.id).toBe(id)
    expect(item.labelTh.length).toBeGreaterThan(0)
    expect(atlas.sprites[item.icon], `icon ${item.icon}`).toBeTruthy()
    expect(['view', 'sheet', 'popup'].filter((k) => item[k]).length).toBe(1)
    expect(typeof item.ready).toBe('boolean')
  })

  it('plan is not ready yet', () => {
    expect(HOTBAR_ITEMS.plan.ready).toBe(false)
  })

  it('covers every destination the old nav and menu had', () => {
    for (const id of ['tasks', 'letter', 'wardrobe', 'calendar', 'mastery', 'roadmap', 'school', 'news', 'music', 'friends']) {
      expect(all[id], id).toBeTruthy()
    }
  })
})
