import { describe, it, expect } from 'vitest'
import { HearingSession } from '@/lib/hearing/hearing-session'
import type { HearingState, HearingMessage } from '@/lib/types/hearing'

/**
 * フェーズ3: チャット形式ヒアリングの失敗ケース
 *
 * 設計意図：
 * トピックだけでは情報不足でAIが勝手に推測してしまう問題を防ぐ。
 * ヒアリングが完了していない状態での台本生成を禁止し、
 * 必要な情報収集を強制する。
 */

describe('HearingSession', () => {
  describe('ヒアリングなしで台本生成しようとしたらエラー', () => {
    it('セッション開始前に台本生成を試みるとエラーを返す', () => {
      const session = new HearingSession()

      expect(session.getState()).toBe('not_started')

      const result = session.canGenerate()
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('HEARING_NOT_STARTED')
    })

    it('トピック設定のみでヒアリング未開始の場合もエラー', () => {
      const session = new HearingSession()
      session.setTopic('朝活のメリット')

      expect(session.getState()).toBe('not_started')

      const result = session.canGenerate()
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('HEARING_NOT_STARTED')
    })
  })

  describe('ヒアリング未完了で生成しようとしたらエラー', () => {
    it('ヒアリング開始後、完了前に生成しようとするとエラー', () => {
      const session = new HearingSession()
      session.setTopic('朝活のメリット')
      session.start()

      expect(session.getState()).toBe('in_progress')

      const result = session.canGenerate()
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('HEARING_NOT_COMPLETED')
    })

    it('1回の質問応答後もまだ未完了ならエラー', () => {
      const session = new HearingSession()
      session.setTopic('朝活のメリット')
      session.start()

      // AIからの質問を追加
      session.addMessage({
        role: 'assistant',
        content: 'このショート動画は誰に向けたものですか？',
      })

      // ユーザーの回答を追加
      session.addMessage({
        role: 'user',
        content: '会社員向けです',
      })

      // まだヒアリング中
      expect(session.getState()).toBe('in_progress')

      const result = session.canGenerate()
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('HEARING_NOT_COMPLETED')
    })

    it('ヒアリング完了後は生成可能', () => {
      const session = new HearingSession()
      session.setTopic('朝活のメリット')
      session.start()

      // 十分な質問応答を行う
      session.addMessage({
        role: 'assistant',
        content: 'このショート動画は誰に向けたものですか？',
      })
      session.addMessage({ role: 'user', content: '会社員向けです' })

      session.addMessage({
        role: 'assistant',
        content: '何を伝えたいですか？',
      })
      session.addMessage({ role: 'user', content: '朝活で人生が変わること' })

      // ヒアリング完了を宣言
      session.complete()

      expect(session.getState()).toBe('completed')

      const result = session.canGenerate()
      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
    })
  })

  describe('会話履歴の管理', () => {
    it('会話履歴が正しく保持される', () => {
      const session = new HearingSession()
      session.setTopic('朝活のメリット')
      session.start()

      session.addMessage({
        role: 'assistant',
        content: '誰に向けた動画ですか？',
      })
      session.addMessage({ role: 'user', content: '20代向け' })

      const history = session.getHistory()
      expect(history).toHaveLength(2)
      expect(history[0]).toEqual({
        role: 'assistant',
        content: '誰に向けた動画ですか？',
      })
      expect(history[1]).toEqual({ role: 'user', content: '20代向け' })
    })

    it('トピックが保持される', () => {
      const session = new HearingSession()
      session.setTopic('朝活のメリット')

      expect(session.getTopic()).toBe('朝活のメリット')
    })
  })

  describe('会話履歴が台本生成に反映される', () => {
    it('getContextForGenerationが会話履歴を含む', () => {
      const session = new HearingSession()
      session.setTopic('朝活のメリット')
      session.start()

      session.addMessage({
        role: 'assistant',
        content: '誰向けですか？',
      })
      session.addMessage({ role: 'user', content: '会社員' })
      session.addMessage({
        role: 'assistant',
        content: '伝えたいメッセージは？',
      })
      session.addMessage({
        role: 'user',
        content: '朝活で生産性が上がる',
      })

      session.complete()

      const context = session.getContextForGeneration()

      expect(context.topic).toBe('朝活のメリット')
      expect(context.history).toHaveLength(4)
      expect(context.history[1].content).toBe('会社員')
      expect(context.history[3].content).toBe('朝活で生産性が上がる')
    })

    it('未完了のセッションではgetContextForGenerationがエラー', () => {
      const session = new HearingSession()
      session.setTopic('朝活のメリット')
      session.start()

      expect(() => session.getContextForGeneration()).toThrow(
        'ヒアリングが完了していません'
      )
    })

    it('未開始のセッションでもgetContextForGenerationがエラー', () => {
      const session = new HearingSession()

      expect(() => session.getContextForGeneration()).toThrow(
        'ヒアリングが完了していません'
      )
    })
  })
})

describe('HearingPromptBuilder', () => {
  /**
   * 設計意図：
   * 会話履歴を台本生成プロンプトに反映し、
   * AIが推測ではなく収集した情報に基づいて台本を生成するようにする。
   */
  describe('会話履歴のプロンプト反映', () => {
    it('会話履歴がプロンプトに含まれる', async () => {
      // この実装はPromptBuilderの拡張として行う
      // テストではモックを使用
      const { HearingPromptBuilder } = await import(
        '@/lib/hearing/hearing-prompt-builder'
      )
      const builder = new HearingPromptBuilder()

      const context = {
        topic: '朝活のメリット',
        history: [
          { role: 'assistant' as const, content: '誰向けですか？' },
          { role: 'user' as const, content: '会社員向け' },
          { role: 'assistant' as const, content: '伝えたいことは？' },
          { role: 'user' as const, content: '朝活で人生が変わる' },
        ],
        ctaPurpose: 'longVideo' as const,
      }

      const prompt = builder.build(context)

      expect(prompt).toContain('朝活のメリット')
      expect(prompt).toContain('会社員向け')
      expect(prompt).toContain('朝活で人生が変わる')
    })

    it('会話履歴がない場合はエラー', async () => {
      const { HearingPromptBuilder } = await import(
        '@/lib/hearing/hearing-prompt-builder'
      )
      const builder = new HearingPromptBuilder()

      const context = {
        topic: '朝活のメリット',
        history: [],
        ctaPurpose: 'longVideo' as const,
      }

      expect(() => builder.build(context)).toThrow(
        'ヒアリング情報がありません'
      )
    })
  })
})
