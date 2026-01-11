import type { LLMClient } from '@/lib/types/llm'
import type { ScriptGenerationRequest, Script } from '@/lib/types/script'
import type { GenerationResult } from '@/lib/types/generation'
import { PromptBuilder } from '@/lib/prompt-builder'
import { HearingPromptBuilder } from '@/lib/hearing/hearing-prompt-builder'
import { validateScript } from '@/lib/validator'
import { RetryStrategy, determineRetryAction } from '@/lib/retry/retry-strategy'

/**
 * 台本生成のユースケース
 *
 * 設計意図：
 * - LLMを使って台本を生成する
 * - 生成された台本をバリデーションする
 * - バリデーションエラー時はリトライを試みる
 * - NGならエラーを返す
 */
export class ScriptGenerator {
  private llmClient: LLMClient
  private promptBuilder: PromptBuilder
  private hearingPromptBuilder: HearingPromptBuilder
  private retryStrategy: RetryStrategy

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient
    this.promptBuilder = new PromptBuilder()
    this.hearingPromptBuilder = new HearingPromptBuilder()
    this.retryStrategy = new RetryStrategy()
  }

  /**
   * 台本を生成する（リトライ付き）
   */
  async generate(request: ScriptGenerationRequest): Promise<GenerationResult> {
    // 1. 初回プロンプトを構築
    let prompt = this.buildPrompt(request)
    let attempt = 0

    while (this.retryStrategy.canRetry(attempt)) {
      attempt++

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

      if (validationResult.valid) {
        // 5. 成功
        return {
          success: true,
          script: llmResponse.script,
        }
      }

      // 6. リトライ判定
      const currentLength = this.calculateScriptLength(llmResponse.script)
      const retryDecision = determineRetryAction(validationResult.errors, currentLength)

      if (retryDecision.action === 'request_more_info') {
        // 再ヒアリングが必要な場合はエラーを返す（UIで再ヒアリングを促す）
        return {
          success: false,
          errors: validationResult.errors,
          needsMoreInfo: true,
        }
      }

      if (retryDecision.action === 'retry_with_prompt' && this.retryStrategy.canRetry(attempt)) {
        // プロンプトを調整してリトライ
        prompt = this.retryStrategy.adjustPrompt(prompt, validationResult.errors, currentLength)
        continue
      }

      // リトライ不可能な場合はエラーを返す
      return {
        success: false,
        errors: validationResult.errors,
      }
    }

    // 最大リトライ回数に達した
    return {
      success: false,
      llmError: 'リトライ回数の上限に達しました。再度お試しください。',
    }
  }

  /**
   * プロンプトを構築する
   */
  private buildPrompt(request: ScriptGenerationRequest): string {
    if (request.history && request.history.length > 0) {
      return this.hearingPromptBuilder.build({
        topic: request.topic,
        history: request.history,
        ctaPurpose: request.ctaPurpose,
      })
    }
    return this.promptBuilder.build(request)
  }

  /**
   * 台本の文字数を計算する
   */
  private calculateScriptLength(script: Script): number {
    let length = 0
    length += script.hook.length
    length += script.body.length
    length += script.cta.length
    if (script.context) length += script.context.length
    if (script.proof) length += script.proof.length
    if (script.transition) length += script.transition.length
    return length
  }
}
