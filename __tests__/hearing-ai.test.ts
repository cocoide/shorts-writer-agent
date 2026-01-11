import { describe, it, expect } from 'vitest'
import { HearingAI } from '@/lib/hearing/hearing-ai'
import { FakeLLM } from '@/lib/llm/fake-llm'
import type { HearingMessage } from '@/lib/types/hearing'

/**
 * フェーズ3: AI質問生成・完了判定のテスト
 *
 * 設計意図：
 * AIがヒアリングを主導し、必要な情報を収集する。
 * 十分な情報が集まったら完了を判定する。
 */

describe('HearingAI', () => {
  describe('質問生成', () => {
    it('トピックから最初の質問を生成できる', async () => {
      const fakeLLM = new FakeLLM()
      fakeLLM.setCustomResponse({
        type: 'question',
        content: 'このショート動画は誰に向けたものですか？',
      })

      const hearingAI = new HearingAI(fakeLLM)
      const result = await hearingAI.generateNextQuestion(
        '朝活のメリット',
        []
      )

      expect(result.type).toBe('question')
      expect(result.content).toBeTruthy()
    })

    it('会話履歴を踏まえて次の質問を生成できる', async () => {
      const fakeLLM = new FakeLLM()
      fakeLLM.setCustomResponse({
        type: 'question',
        content: '朝活を始めて何か変化はありましたか？',
      })

      const hearingAI = new HearingAI(fakeLLM)
      const history: HearingMessage[] = [
        { role: 'assistant', content: '誰向けですか？' },
        { role: 'user', content: '会社員向けです' },
      ]

      const result = await hearingAI.generateNextQuestion(
        '朝活のメリット',
        history
      )

      expect(result.type).toBe('question')
      expect(result.content).toBeTruthy()
    })
  })

  describe('完了判定', () => {
    it('十分な情報が集まったら完了を返す', async () => {
      const fakeLLM = new FakeLLM()
      fakeLLM.setCustomResponse({
        type: 'complete',
        content: '十分な情報が集まりました',
      })

      const hearingAI = new HearingAI(fakeLLM)
      const history: HearingMessage[] = [
        { role: 'assistant', content: '誰向けですか？' },
        { role: 'user', content: '20代会社員' },
        { role: 'assistant', content: '伝えたいメッセージは？' },
        { role: 'user', content: '朝活で人生が変わる' },
        { role: 'assistant', content: '具体的なエピソードは？' },
        { role: 'user', content: '朝活始めて3ヶ月で昇進した' },
      ]

      const result = await hearingAI.generateNextQuestion(
        '朝活のメリット',
        history
      )

      expect(result.type).toBe('complete')
    })

    it('情報不足なら追加質問を返す', async () => {
      const fakeLLM = new FakeLLM()
      fakeLLM.setCustomResponse({
        type: 'question',
        content: '具体的にどんなメリットを伝えたいですか？',
      })

      const hearingAI = new HearingAI(fakeLLM)
      const history: HearingMessage[] = [
        { role: 'assistant', content: '誰向けですか？' },
        { role: 'user', content: '会社員' },
      ]

      const result = await hearingAI.generateNextQuestion(
        '朝活のメリット',
        history
      )

      expect(result.type).toBe('question')
    })
  })

  describe('エラーハンドリング', () => {
    it('LLMエラー時はエラーを返す', async () => {
      const fakeLLM = new FakeLLM()
      fakeLLM.setError('LLM Error')

      const hearingAI = new HearingAI(fakeLLM)
      const result = await hearingAI.generateNextQuestion('朝活', [])

      expect(result.type).toBe('error')
      expect(result.error).toBeTruthy()
    })
  })
})

describe('FakeLLM ヒアリング拡張', () => {
  it('カスタムヒアリングレスポンスを設定できる', () => {
    const fakeLLM = new FakeLLM()
    fakeLLM.setCustomResponse({
      type: 'question',
      content: 'テスト質問',
    })

    const response = fakeLLM.getCustomResponse()
    expect(response).toEqual({
      type: 'question',
      content: 'テスト質問',
    })
  })
})
