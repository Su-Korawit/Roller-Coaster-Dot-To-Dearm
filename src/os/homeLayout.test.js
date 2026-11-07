import { describe, it, expect } from 'vitest'
import {
  layoutTokens, moveToken, folderFromDrop, addToFolder, removeFromFolder, renameFolder, dropAction, acceptFiles, parseToken, MAX_FILES,
} from './homeLayout'

const apps = [
  { id: 'store', builtIn: true },
  { id: 'settings', builtIn: true },
  { id: 'a', installable: true },
  { id: 'b', installable: true },
  { id: 'c', installable: true },
]

describe('layoutTokens', () => {
  it('defaults to built-ins, installed apps, folders, files', () => {
    const t = layoutTokens({ installed: ['b', 'a'], folders: [{ id: '1', appIds: [] }], files: [{ id: 'x' }], apps })
    expect(t).toEqual(['store', 'settings', 'b', 'a', 'f:1', 'file:x'])
  })
  it('follows the saved order, drops stale tokens, appends new ones', () => {
    const t = layoutTokens({ order: ['a', 'gone', 'store', 'f:nope'], installed: ['a', 'b'], apps })
    expect(t).toEqual(['a', 'store', 'settings', 'b'])
  })
  it('hides apps that live in a folder', () => {
    const t = layoutTokens({ installed: ['a', 'b'], folders: [{ id: '1', appIds: ['a'] }], apps })
    expect(t).toEqual(['store', 'settings', 'b', 'f:1'])
  })
  it('ignores apps that are not installed', () => {
    expect(layoutTokens({ installed: ['a'], apps })).not.toContain('b')
  })
})

describe('moveToken', () => {
  const t = ['a', 'b', 'c', 'd']
  it('moves before the target when going backwards, after it when going forwards', () => {
    expect(moveToken(t, 'd', 'b')).toEqual(['a', 'd', 'b', 'c'])
    expect(moveToken(t, 'a', 'c')).toEqual(['b', 'c', 'a', 'd'])
  })
  it('null target = end; bad ids = unchanged', () => {
    expect(moveToken(t, 'a', null)).toEqual(['b', 'c', 'd', 'a'])
    expect(moveToken(t, 'x', 'a')).toBe(t)
    expect(moveToken(t, 'a', 'a')).toBe(t)
  })
})

describe('folders', () => {
  it('dropping an app on an app makes a folder in the target slot', () => {
    const r = folderFromDrop({ tokens: ['a', 'b', 'c'], folders: [], from: 'a', onto: 'c', id: 'F' })
    expect(r.order).toEqual(['b', 'f:F'])
    expect(r.folders).toEqual([{ id: 'F', name: 'โฟลเดอร์', appIds: ['c', 'a'] }])
  })
  it('refuses folders/files and self-drops', () => {
    expect(folderFromDrop({ tokens: [], folders: [], from: 'f:1', onto: 'a', id: 'F' })).toBeNull()
    expect(folderFromDrop({ tokens: [], folders: [], from: 'a', onto: 'a', id: 'F' })).toBeNull()
  })
  it('adds, removes and renames', () => {
    let f = [{ id: '1', name: 'x', appIds: ['a'] }, { id: '2', name: 'y', appIds: [] }]
    f = addToFolder(f, '2', 'a')
    expect(f.map((x) => x.appIds)).toEqual([[], ['a']])
    f = removeFromFolder(f, '2', 'a')
    expect(f[1].appIds).toEqual([])
    expect(renameFolder(f, '1', '  งาน  ')[0].name).toBe('งาน')
    expect(renameFolder(f, '1', '   ')[0].name).toBe('โฟลเดอร์')
  })
})

describe('dropAction', () => {
  it('app on folder adds; app on app folds only in folder mode; otherwise moves', () => {
    expect(dropAction({ from: 'a', onto: 'f:1', mode: 'reorder' }).action).toBe('folder-add')
    expect(dropAction({ from: 'a', onto: 'b', mode: 'folder' }).action).toBe('folder-create')
    expect(dropAction({ from: 'a', onto: 'b', mode: 'reorder' }).action).toBe('move')
    expect(dropAction({ from: 'f:1', onto: 'b', mode: 'folder' }).action).toBe('move')
    expect(dropAction({ from: 'a', onto: null }).action).toBe('move')
  })
})

describe('acceptFiles', () => {
  it('rejects empty, huge and over-limit files', () => {
    const r = acceptFiles([{ name: 'ok', size: 10 }, { name: 'big', size: 6 * 1024 * 1024 }, { name: 'zero', size: 0 }])
    expect(r.ok.map((f) => f.name)).toEqual(['ok'])
    expect(r.rejected.map((x) => x.name)).toEqual(['big', 'zero'])
    expect(acceptFiles([{ name: 'n', size: 1 }], MAX_FILES).rejected).toHaveLength(1)
  })
})

describe('parseToken', () => {
  it('reads the three kinds', () => {
    expect(parseToken('goal')).toEqual({ kind: 'app', id: 'goal' })
    expect(parseToken('f:9')).toEqual({ kind: 'folder', id: '9' })
    expect(parseToken('file:7')).toEqual({ kind: 'file', id: '7' })
  })
})
