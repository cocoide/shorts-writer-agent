import type { Script, ValidationError } from './script'

/**
 * 台本生成の結果
 */
export interface GenerationResult {
  /** 生成成功かどうか */
  success: boolean
  /** 生成された台本（成功時のみ） */
  script?: Script
  /** バリデーションエラー（バリデーション失敗時のみ） */
  errors?: ValidationError[]
  /** LLMエラー（LLM呼び出し失敗時のみ） */
  llmError?: string
  /** 追加情報が必要（再ヒアリングを促す） */
  needsMoreInfo?: boolean
}
