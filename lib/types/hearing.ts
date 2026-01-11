import type { CtaPurpose } from './script'

/**
 * ヒアリングセッションの状態
 *
 * - not_started: ヒアリング未開始
 * - in_progress: ヒアリング中
 * - completed: ヒアリング完了
 */
export type HearingState = 'not_started' | 'in_progress' | 'completed'

/**
 * ヒアリング中のメッセージ
 */
export type HearingMessage = {
  role: 'user' | 'assistant'
  content: string
}

/**
 * 台本生成可否の判定結果
 */
export type CanGenerateResult = {
  allowed: boolean
  reason?: 'HEARING_NOT_STARTED' | 'HEARING_NOT_COMPLETED'
}

/**
 * 台本生成に使用するヒアリングコンテキスト
 */
export type HearingContext = {
  topic: string
  history: HearingMessage[]
  ctaPurpose: CtaPurpose
}

/**
 * ヒアリングAIのレスポンス
 */
export type HearingAIResponse = {
  type: 'question' | 'complete' | 'error'
  content?: string
  error?: string
}
