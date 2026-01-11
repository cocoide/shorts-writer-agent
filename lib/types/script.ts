/**
 * YouTube Shorts 台本の構成要素
 */
export interface Script {
  /** フック・冒頭（必須） */
  hook: string
  /** 前提・誰向けか・状況説明（任意） */
  context?: string
  /** 本編・価値提供（必須） */
  body: string
  /** 理由・具体例・根拠（任意） */
  proof?: string
  /** 話の切り替え・強調（任意） */
  transition?: string
  /** 行動喚起（必須） */
  cta: string
}

/**
 * CTA目的の種類
 * subscribe は禁止
 */
export type CtaPurpose = 'longVideo' | 'like' | 'comment'

/**
 * ヒアリングメッセージ（インポート循環を避けるため再定義）
 */
export interface HearingMessageForRequest {
  role: 'user' | 'assistant'
  content: string
}

/**
 * 台本生成のリクエスト
 */
export interface ScriptGenerationRequest {
  topic: string
  ctaPurpose: CtaPurpose
  /** ヒアリング情報（任意） */
  history?: HearingMessageForRequest[]
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * バリデーションエラー
 */
export interface ValidationError {
  code: ValidationErrorCode
  message: string
}

/**
 * バリデーションエラーコード
 */
export type ValidationErrorCode =
  | 'MISSING_HOOK'
  | 'MISSING_BODY'
  | 'MISSING_CTA'
  | 'INVALID_ORDER'
  | 'CONTAINS_EMOJI'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'CTA_MISMATCH_LONG_VIDEO'
  | 'CTA_MISMATCH_LIKE'
  | 'CTA_MISMATCH_COMMENT'
