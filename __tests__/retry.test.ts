import { describe, it, expect } from 'vitest'
import { RetryStrategy, determineRetryAction } from '@/lib/retry/retry-strategy'
import type { ValidationError } from '@/lib/types/script'

/**
 * リトライ処理のテスト
 *
 * 設計意図：
 * バリデーションエラー時に適切なリトライ戦略を選択する。
 * - 少し足りない場合：プロンプト調整でリトライ
 * - 大幅に足りない場合：再ヒアリングを提案
 */

describe('determineRetryAction', () => {
  describe('TOO_SHORT エラー時のリトライ判定', () => {
    it('10文字以下の不足ならプロンプト調整でリトライ', () => {
      const errors: ValidationError[] = [
        { code: 'TOO_SHORT', message: '台本が短すぎます。250文字以上必要です（現在: 242文字）。' }
      ]

      const result = determineRetryAction(errors, 242)

      expect(result.action).toBe('retry_with_prompt')
      expect(result.shortfall).toBe(8) // 250 - 242
    })

    it('30文字以下の不足ならプロンプト調整でリトライ', () => {
      const errors: ValidationError[] = [
        { code: 'TOO_SHORT', message: '台本が短すぎます。250文字以上必要です（現在: 220文字）。' }
      ]

      const result = determineRetryAction(errors, 220)

      expect(result.action).toBe('retry_with_prompt')
      expect(result.shortfall).toBe(30)
    })

    it('50文字以上の不足なら再ヒアリングを提案', () => {
      const errors: ValidationError[] = [
        { code: 'TOO_SHORT', message: '台本が短すぎます。250文字以上必要です（現在: 180文字）。' }
      ]

      const result = determineRetryAction(errors, 180)

      expect(result.action).toBe('request_more_info')
      expect(result.shortfall).toBe(70)
    })
  })

  describe('TOO_LONG エラー時のリトライ判定', () => {
    it('20文字以下の超過ならプロンプト調整でリトライ', () => {
      const errors: ValidationError[] = [
        { code: 'TOO_LONG', message: '台本が長すぎます。400文字以下にしてください（現在: 415文字）。' }
      ]

      const result = determineRetryAction(errors, 415)

      expect(result.action).toBe('retry_with_prompt')
      expect(result.excess).toBe(15)
    })

    it('50文字以上の超過なら再ヒアリングを提案', () => {
      const errors: ValidationError[] = [
        { code: 'TOO_LONG', message: '台本が長すぎます。400文字以下にしてください（現在: 480文字）。' }
      ]

      const result = determineRetryAction(errors, 480)

      expect(result.action).toBe('request_more_info')
      expect(result.excess).toBe(80)
    })
  })

  describe('その他のエラー', () => {
    it('絵文字エラーはプロンプト調整でリトライ', () => {
      const errors: ValidationError[] = [
        { code: 'CONTAINS_EMOJI', message: '台本に絵文字が含まれています。' }
      ]

      const result = determineRetryAction(errors, 300)

      expect(result.action).toBe('retry_with_prompt')
    })

    it('CTA不整合エラーはプロンプト調整でリトライ', () => {
      const errors: ValidationError[] = [
        { code: 'CTA_MISMATCH_LONG_VIDEO', message: 'CTA目的と内容が一致しません。' }
      ]

      const result = determineRetryAction(errors, 300)

      expect(result.action).toBe('retry_with_prompt')
    })

    it('構造エラー（MISSING_HOOK等）はプロンプト調整でリトライ', () => {
      const errors: ValidationError[] = [
        { code: 'MISSING_HOOK', message: 'hookが存在しません。' }
      ]

      const result = determineRetryAction(errors, 300)

      expect(result.action).toBe('retry_with_prompt')
    })
  })
})

describe('RetryStrategy', () => {
  describe('リトライ用プロンプト生成', () => {
    it('TOO_SHORTの場合、文字数を増やすよう指示を追加', () => {
      const strategy = new RetryStrategy()
      const originalPrompt = 'トピック: 朝活のメリット'
      const errors: ValidationError[] = [
        { code: 'TOO_SHORT', message: '250文字以上必要です（現在: 230文字）。' }
      ]

      const newPrompt = strategy.adjustPrompt(originalPrompt, errors, 230)

      expect(newPrompt).toContain('朝活のメリット')
      expect(newPrompt).toContain('20文字')
      expect(newPrompt).toMatch(/長く|詳しく|追加/)
    })

    it('TOO_LONGの場合、文字数を減らすよう指示を追加', () => {
      const strategy = new RetryStrategy()
      const originalPrompt = 'トピック: 朝活のメリット'
      const errors: ValidationError[] = [
        { code: 'TOO_LONG', message: '400文字以下にしてください（現在: 420文字）。' }
      ]

      const newPrompt = strategy.adjustPrompt(originalPrompt, errors, 420)

      expect(newPrompt).toContain('朝活のメリット')
      expect(newPrompt).toContain('20文字')
      expect(newPrompt).toMatch(/短く|簡潔|削/)
    })

    it('CONTAINS_EMOJIの場合、絵文字禁止を強調', () => {
      const strategy = new RetryStrategy()
      const originalPrompt = 'トピック: 朝活のメリット'
      const errors: ValidationError[] = [
        { code: 'CONTAINS_EMOJI', message: '絵文字が含まれています。' }
      ]

      const newPrompt = strategy.adjustPrompt(originalPrompt, errors, 300)

      expect(newPrompt).toContain('絵文字')
      expect(newPrompt).toMatch(/禁止|使用しない|含めない/)
    })

    it('CTA不整合の場合、CTA目的を強調', () => {
      const strategy = new RetryStrategy()
      const originalPrompt = 'トピック: 朝活のメリット'
      const errors: ValidationError[] = [
        { code: 'CTA_MISMATCH_LONG_VIDEO', message: 'CTA目的と内容が一致しません。' }
      ]

      const newPrompt = strategy.adjustPrompt(originalPrompt, errors, 300)

      expect(newPrompt).toMatch(/長尺|本編|フル/)
    })
  })

  describe('リトライ回数制限', () => {
    it('最大3回までリトライ可能', () => {
      const strategy = new RetryStrategy()

      expect(strategy.canRetry(0)).toBe(true)
      expect(strategy.canRetry(1)).toBe(true)
      expect(strategy.canRetry(2)).toBe(true)
      expect(strategy.canRetry(3)).toBe(false)
    })
  })
})
