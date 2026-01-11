import type { ValidationError, ValidationErrorCode } from '@/lib/types/script'

const MIN_CHARS = 250
const MAX_CHARS = 400
const MAX_RETRIES = 3

// リトライ可能な閾値
const SHORTFALL_THRESHOLD_FOR_RETRY = 50 // これ以下ならプロンプト調整でリトライ
const EXCESS_THRESHOLD_FOR_RETRY = 50 // これ以下ならプロンプト調整でリトライ

export type RetryAction = 'retry_with_prompt' | 'request_more_info' | 'no_retry'

export interface RetryDecision {
  action: RetryAction
  shortfall?: number // MIN_CHARSに対する不足文字数
  excess?: number // MAX_CHARSに対する超過文字数
  reason?: string
}

/**
 * バリデーションエラーに基づいてリトライアクションを決定する
 *
 * 設計意図：
 * - 少しの調整で修正可能なエラーはプロンプト調整でリトライ
 * - 大幅な変更が必要なエラーは再ヒアリングを提案
 */
export function determineRetryAction(
  errors: ValidationError[],
  currentLength: number
): RetryDecision {
  // TOO_SHORTエラーをチェック
  const tooShortError = errors.find((e) => e.code === 'TOO_SHORT')
  if (tooShortError) {
    const shortfall = MIN_CHARS - currentLength
    if (shortfall <= SHORTFALL_THRESHOLD_FOR_RETRY) {
      return { action: 'retry_with_prompt', shortfall }
    } else {
      return { action: 'request_more_info', shortfall }
    }
  }

  // TOO_LONGエラーをチェック
  const tooLongError = errors.find((e) => e.code === 'TOO_LONG')
  if (tooLongError) {
    const excess = currentLength - MAX_CHARS
    if (excess <= EXCESS_THRESHOLD_FOR_RETRY) {
      return { action: 'retry_with_prompt', excess }
    } else {
      return { action: 'request_more_info', excess }
    }
  }

  // その他のエラー（絵文字、CTA不整合、構造エラー）はプロンプト調整でリトライ
  const retryableErrors: ValidationErrorCode[] = [
    'CONTAINS_EMOJI',
    'CTA_MISMATCH_LONG_VIDEO',
    'CTA_MISMATCH_LIKE',
    'CTA_MISMATCH_COMMENT',
    'MISSING_HOOK',
    'MISSING_BODY',
    'MISSING_CTA',
    'INVALID_ORDER',
  ]

  if (errors.some((e) => retryableErrors.includes(e.code))) {
    return { action: 'retry_with_prompt' }
  }

  return { action: 'no_retry' }
}

/**
 * リトライ戦略クラス
 *
 * 設計意図：
 * バリデーションエラーに応じてプロンプトを調整し、
 * 成功するまでリトライを行う。
 */
export class RetryStrategy {
  /**
   * リトライ可能かどうかを判定
   */
  canRetry(currentAttempt: number): boolean {
    return currentAttempt < MAX_RETRIES
  }

  /**
   * エラーに基づいてプロンプトを調整する
   */
  adjustPrompt(
    originalPrompt: string,
    errors: ValidationError[],
    currentLength: number
  ): string {
    const adjustments: string[] = []

    for (const error of errors) {
      switch (error.code) {
        case 'TOO_SHORT': {
          const shortfall = MIN_CHARS - currentLength
          adjustments.push(
            `【重要】前回の台本は${shortfall}文字ほど短すぎました。` +
              `もう少し詳しく説明を追加して、全体で${MIN_CHARS}〜${MAX_CHARS}文字になるように長くしてください。`
          )
          break
        }

        case 'TOO_LONG': {
          const excess = currentLength - MAX_CHARS
          adjustments.push(
            `【重要】前回の台本は${excess}文字ほど長すぎました。` +
              `内容を簡潔にまとめて、全体で${MIN_CHARS}〜${MAX_CHARS}文字になるように短くしてください。`
          )
          break
        }

        case 'CONTAINS_EMOJI':
          adjustments.push(
            '【重要】絵文字は絶対に使用しないでください。絵文字を含めないでください。'
          )
          break

        case 'CTA_MISMATCH_LONG_VIDEO':
          adjustments.push(
            '【重要】CTAには必ず「長尺」「本編」「フル」のいずれかのワードを含めてください。'
          )
          break

        case 'CTA_MISMATCH_LIKE':
          adjustments.push(
            '【重要】CTAには必ず「いいね」「高評価」「グッド」のいずれかのワードを含めてください。'
          )
          break

        case 'CTA_MISMATCH_COMMENT':
          adjustments.push(
            '【重要】CTAには必ず「コメント」「感想」「教えて」のいずれかのワードを含めてください。'
          )
          break

        case 'MISSING_HOOK':
          adjustments.push(
            '【重要】hookフィールドが空でした。視聴者の注意を引く冒頭フレーズを必ず含めてください。'
          )
          break

        case 'MISSING_BODY':
          adjustments.push(
            '【重要】bodyフィールドが空でした。本編の内容を必ず含めてください。'
          )
          break

        case 'MISSING_CTA':
          adjustments.push(
            '【重要】ctaフィールドが空でした。行動喚起を必ず含めてください。'
          )
          break
      }
    }

    if (adjustments.length === 0) {
      return originalPrompt
    }

    return `${originalPrompt}\n\n---\n## 修正指示\n${adjustments.join('\n')}`
  }
}
