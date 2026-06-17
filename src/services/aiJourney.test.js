import { describe, it, expect, vi, beforeEach } from 'vitest'

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }))

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent }
    }
  },
}))

const { generateJourney } = await import('./aiJourney')

describe('generateJourney', () => {
  beforeEach(() => {
    generateContent.mockReset()
  })

  it('maps a valid JSON array to journey steps with {title, desc}', async () => {
    generateContent.mockResolvedValue({
      response: { text: () => '[{"title":"Step 1","description":"Do X"}]' },
    })

    const result = await generateJourney({ aiLanguage: 'English' })

    expect(result).toEqual([{ title: 'Step 1', desc: 'Do X' }])
  })

  it('throws AI_BAD_FORMAT when the model returns a non-array', async () => {
    generateContent.mockResolvedValue({
      response: { text: () => '{"title":"not an array"}' },
    })

    await expect(generateJourney({ aiLanguage: 'English' })).rejects.toThrow('AI_BAD_FORMAT')
  })

  it('throws AI_BAD_FORMAT when the response is not valid JSON', async () => {
    generateContent.mockResolvedValue({
      response: { text: () => 'sorry, I cannot help with that' },
    })

    await expect(generateJourney({ aiLanguage: 'English' })).rejects.toThrow('AI_BAD_FORMAT')
  })

  it('strips markdown fences and falls back for missing fields', async () => {
    generateContent.mockResolvedValue({
      response: { text: () => '```json\n[{"description":"only a desc"}]\n```' },
    })

    const result = await generateJourney({ aiLanguage: 'English' })

    expect(result).toEqual([{ title: 'Step', desc: 'only a desc' }])
  })
})
