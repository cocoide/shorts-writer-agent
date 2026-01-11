import { describe, it, expect, vi } from 'vitest'
import type { LLMClient, LLMResponse } from '@/lib/types/llm'
import { FakeLLM } from '@/lib/llm/fake-llm'
import { AnthropicLLM } from '@/lib/llm/anthropic-llm'

describe('FakeLLM', () => {
  it('固定の台本を返す', async () => {
    const fakeLLM = new FakeLLM()
    const response = await fakeLLM.generateScript('テスト用プロンプト')

    expect(response.script).toBeDefined()
    expect(response.script?.hook).toBeDefined()
    expect(response.script?.body).toBeDefined()
    expect(response.script?.cta).toBeDefined()
    expect(response.error).toBeUndefined()
  })

  it('カスタム台本を設定できる', async () => {
    const customScript = {
      hook: 'カスタムフック',
      body: 'カスタムボディ',
      cta: 'カスタムCTA',
    }
    const fakeLLM = new FakeLLM(customScript)
    const response = await fakeLLM.generateScript('テスト用プロンプト')

    expect(response.script).toEqual(customScript)
  })

  it('エラーをシミュレートできる', async () => {
    const fakeLLM = new FakeLLM(undefined, 'テスト用エラー')
    const response = await fakeLLM.generateScript('テスト用プロンプト')

    expect(response.script).toBeUndefined()
    expect(response.error).toBe('テスト用エラー')
  })

  it('rawOutputにプロンプトが含まれる', async () => {
    const fakeLLM = new FakeLLM()
    const response = await fakeLLM.generateScript('テスト用プロンプト')

    expect(response.rawOutput).toContain('FakeLLM')
  })
})

describe('LLMClient Interface', () => {
  it('FakeLLMがLLMClientインターフェースを満たす', () => {
    const fakeLLM: LLMClient = new FakeLLM()
    expect(typeof fakeLLM.generateScript).toBe('function')
  })

  it('AnthropicLLMがLLMClientインターフェースを満たす', () => {
    const anthropicLLM: LLMClient = new AnthropicLLM('test-api-key')
    expect(typeof anthropicLLM.generateScript).toBe('function')
  })
})

describe('AnthropicLLM', () => {
  it('有効なJSON形式のレスポンスをパースできる', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            hook: 'テストフック',
            body: 'テストボディ',
            cta: 'テストCTA',
          }),
        },
      ],
    }

    const anthropicLLM = new AnthropicLLM('test-api-key')
    // モックを設定
    vi.spyOn(anthropicLLM as any, 'callAPI').mockResolvedValue(mockResponse)

    const response = await anthropicLLM.generateScript('テストプロンプト')

    expect(response.script).toBeDefined()
    expect(response.script?.hook).toBe('テストフック')
    expect(response.script?.body).toBe('テストボディ')
    expect(response.script?.cta).toBe('テストCTA')
  })

  it('無効なJSON形式のレスポンスはエラーを返す', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: '無効なJSON形式の文字列',
        },
      ],
    }

    const anthropicLLM = new AnthropicLLM('test-api-key')
    vi.spyOn(anthropicLLM as any, 'callAPI').mockResolvedValue(mockResponse)

    const response = await anthropicLLM.generateScript('テストプロンプト')

    expect(response.script).toBeUndefined()
    expect(response.error).toBeDefined()
    expect(response.rawOutput).toBe('無効なJSON形式の文字列')
  })

  it('APIエラー時はエラーを返す', async () => {
    const anthropicLLM = new AnthropicLLM('test-api-key')
    vi.spyOn(anthropicLLM as any, 'callAPI').mockRejectedValue(
      new Error('API Error')
    )

    const response = await anthropicLLM.generateScript('テストプロンプト')

    expect(response.script).toBeUndefined()
    expect(response.error).toContain('API Error')
  })

  it('必須フィールドが欠けているレスポンスはエラーを返す', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            hook: 'テストフック',
            // bodyが欠けている
            cta: 'テストCTA',
          }),
        },
      ],
    }

    const anthropicLLM = new AnthropicLLM('test-api-key')
    vi.spyOn(anthropicLLM as any, 'callAPI').mockResolvedValue(mockResponse)

    const response = await anthropicLLM.generateScript('テストプロンプト')

    expect(response.script).toBeUndefined()
    expect(response.error).toContain('body')
  })
})
