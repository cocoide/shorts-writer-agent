import Anthropic from '@anthropic-ai/sdk'
import type { LLMClient, LLMResponse } from '@/lib/types/llm'
import type { Script } from '@/lib/types/script'

/**
 * Anthropic Claude APIを使用するLLMクライアント
 *
 * 設計意図：
 * LLMの出力は信用せず、必ずパースとバリデーションを行う。
 * JSON形式で出力を要求し、パースエラーや必須フィールドの欠落を検出する。
 */
export class AnthropicLLM implements LLMClient {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async generateScript(prompt: string): Promise<LLMResponse> {
    try {
      const response = await this.callAPI(prompt)
      return this.parseResponse(response)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      return {
        error: errorMessage,
        rawOutput: '',
      }
    }
  }

  /**
   * Anthropic APIを呼び出す（テスト時にモック可能）
   */
  protected async callAPI(prompt: string): Promise<Anthropic.Message> {
    return await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })
  }

  /**
   * APIレスポンスをパースしてScriptに変換する
   */
  private parseResponse(response: Anthropic.Message): LLMResponse {
    const textContent = response.content.find(
      (block) => block.type === 'text'
    ) as Anthropic.TextBlock | undefined

    if (!textContent) {
      return {
        error: 'APIレスポンスにテキストが含まれていません',
        rawOutput: JSON.stringify(response.content),
      }
    }

    const rawOutput = textContent.text
    const jsonString = this.extractJson(rawOutput)

    try {
      const parsed = JSON.parse(jsonString)
      const validationError = this.validateParsedScript(parsed)

      if (validationError) {
        return {
          error: validationError,
          rawOutput,
        }
      }

      const script: Script = {
        hook: parsed.hook,
        body: parsed.body,
        cta: parsed.cta,
        context: parsed.context,
        proof: parsed.proof,
        transition: parsed.transition,
      }

      return {
        script,
        rawOutput,
      }
    } catch {
      return {
        error: 'JSONのパースに失敗しました',
        rawOutput,
      }
    }
  }

  /**
   * レスポンスからJSON文字列を抽出する
   * ```json ... ``` で囲まれている場合は中身を抽出
   */
  private extractJson(text: string): string {
    // ```json ... ``` または ``` ... ``` で囲まれている場合
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim()
    }

    // { で始まり } で終わる部分を抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return jsonMatch[0]
    }

    return text.trim()
  }

  /**
   * パースされたオブジェクトが必須フィールドを持っているか検証する
   */
  private validateParsedScript(parsed: unknown): string | null {
    if (typeof parsed !== 'object' || parsed === null) {
      return 'パース結果がオブジェクトではありません'
    }

    const obj = parsed as Record<string, unknown>
    const requiredFields = ['hook', 'body', 'cta'] as const

    for (const field of requiredFields) {
      if (typeof obj[field] !== 'string' || obj[field] === '') {
        return `必須フィールド「${field}」が欠けているか空です`
      }
    }

    return null
  }
}
