import type { LLMClient } from '@/lib/types/llm'
import type { ScriptGenerationRequest } from '@/lib/types/script'
import type { GenerationResult } from '@/lib/types/generation'
import { PromptBuilder } from '@/lib/prompt-builder'
import { HearingPromptBuilder } from '@/lib/hearing/hearing-prompt-builder'
import { validateScript } from '@/lib/validator'

/**
 * 台本生成のユースケース
 *
 * 設計意図：
 * - LLMを使って台本を生成する
 * - 生成された台本をバリデーションする
 * - NGならエラーを返す
 */
export class ScriptGenerator {
  private llmClient: LLMClient
  private promptBuilder: PromptBuilder
  private hearingPromptBuilder: HearingPromptBuilder

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient
    this.promptBuilder = new PromptBuilder()
    this.hearingPromptBuilder = new HearingPromptBuilder()
  }

  /**
   * 台本を生成する
   */
  async generate(request: ScriptGenerationRequest): Promise<GenerationResult> {
    // 1. プロンプトを構築（ヒアリング情報があればHearingPromptBuilderを使用）
    let prompt: string
    if (request.history && request.history.length > 0) {
      prompt = this.hearingPromptBuilder.build({
        topic: request.topic,
        history: request.history,
        ctaPurpose: request.ctaPurpose,
      })
    } else {
      prompt = this.promptBuilder.build(request)
    }

    // 2. LLMで台本を生成
    const llmResponse = await this.llmClient.generateScript(prompt)

    // 3. LLMエラーをチェック
    if (llmResponse.error || !llmResponse.script) {
      return {
        success: false,
        llmError: llmResponse.error ?? '台本の生成に失敗しました',
      }
    }

    // 4. バリデーション
    const validationResult = validateScript(llmResponse.script, request.ctaPurpose)

    if (!validationResult.valid) {
      return {
        success: false,
        errors: validationResult.errors,
      }
    }

    // 5. 成功
    return {
      success: true,
      script: llmResponse.script,
    }
  }
}
