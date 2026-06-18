// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { isEditableTarget } from './isEditableTarget'

describe('isEditableTarget', () => {
  it('returns true for INPUT', () => {
    const el = document.createElement('input')
    expect(isEditableTarget(el)).toBe(true)
  })

  it('returns true for TEXTAREA', () => {
    const el = document.createElement('textarea')
    expect(isEditableTarget(el)).toBe(true)
  })

  it('returns true for contenteditable element', () => {
    const el = document.createElement('div')
    el.setAttribute('contenteditable', 'true')
    expect(isEditableTarget(el)).toBe(true)
  })

  it('returns false for plain div', () => {
    const el = document.createElement('div')
    expect(isEditableTarget(el)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isEditableTarget(null)).toBe(false)
  })

  it('returns false for SELECT element', () => {
    const el = document.createElement('select')
    expect(isEditableTarget(el)).toBe(false)
  })
})
