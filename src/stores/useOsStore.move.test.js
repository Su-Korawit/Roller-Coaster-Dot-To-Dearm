import { describe, it, expect, beforeEach } from 'vitest'
import { useOsStore } from './useOsStore'
import { OS_APPS } from '../os/apps'
import { layoutTokens } from '../os/homeLayout'

const reset = () => useOsStore.setState({ installed: ['goal', 'habit', 'reading', 'community'], order: [], folders: [], files: [] })
beforeEach(reset)

const tokens = () => { const s = useOsStore.getState(); return layoutTokens({ ...s, apps: OS_APPS }) }

describe('dropToken (drag on Home)', () => {
  it('reorders any app, built-ins included', () => {
    useOsStore.getState().dropToken('community', 'goal')
    expect(tokens().slice(0, 4)).toEqual(['store', 'settings', 'community', 'goal'])
    useOsStore.getState().dropToken('store', 'reading')
    expect(tokens()).toContain('store')
    expect(tokens().indexOf('store')).toBeGreaterThan(tokens().indexOf('goal'))
  })
  it('dropping on empty space sends it to the end; unknown ids change nothing', () => {
    useOsStore.getState().dropToken('goal', null)
    expect(tokens().at(-1)).toBe('goal')
    const before = useOsStore.getState().order
    useOsStore.getState().dropToken('nope', 'habit')
    expect(useOsStore.getState().order).toBe(before)
  })
})

describe('folders', () => {
  it('middle-drop of two apps makes a folder; apps inside leave the grid', () => {
    useOsStore.getState().dropToken('goal', 'habit', 'folder')
    const { folders } = useOsStore.getState()
    expect(folders).toHaveLength(1)
    expect(folders[0].appIds.sort()).toEqual(['goal', 'habit'])
    expect(tokens()).not.toContain('goal')
    expect(tokens()).toContain(`f:${folders[0].id}`)
  })
  it('dropping an app on a folder adds it; taking out puts it back; deleting returns apps', () => {
    const st = useOsStore.getState()
    st.newFolder()
    const id = useOsStore.getState().folders[0].id
    useOsStore.getState().dropToken('reading', `f:${id}`)
    expect(useOsStore.getState().folders[0].appIds).toEqual(['reading'])
    expect(tokens()).not.toContain('reading')
    useOsStore.getState().takeOutOfFolder(id, 'reading')
    expect(tokens().at(-1)).toBe('reading')
    useOsStore.getState().dropToken('reading', `f:${id}`)
    useOsStore.getState().deleteFolder(id)
    expect(tokens()).toContain('reading')
  })
  it('uninstalling an app removes it from its folder too', () => {
    useOsStore.getState().dropToken('goal', 'habit', 'folder')
    useOsStore.getState().uninstallApp('goal')
    expect(useOsStore.getState().folders[0].appIds).toEqual(['habit'])
  })
})
