import type { Script } from './script'

/**
 * LLMクライアントの共通インターフェース
 */
export interface LLMClient {
  /**
   * プロンプトを送信して台本を生成する
   */
  generateScript(prompt: string): Promise<LLMResponse>
}

/**
 * LLMからの応答
 */
export interface LLMResponse {
  /** 生成成功時の台本 */
  script?: Script
  /** パースエラー時のエラーメッセージ */
  error?: string
  /** 生の出力（デバッグ用） */
  rawOutput: string
}
