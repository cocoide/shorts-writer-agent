import type { LLMClient, LLMResponse } from '@/lib/types/llm'
import type { Script } from '@/lib/types/script'
import type { HearingAIResponse } from '@/lib/types/hearing'

/**
 * テスト用のFake LLMクライアント
 *
 * 設計意図：
 * テストで使用するための固定レスポンスを返すLLMクライアント。
 * カスタム台本やエラーをシミュレートできる。
 */
export class FakeLLM implements LLMClient {
  private script?: Script
  private error?: string
  private customResponse?: HearingAIResponse

  constructor(script?: Script, error?: string) {
    this.script = script
    this.error = error
  }

  /**
   * ヒアリング用カスタムレスポンスを設定
   */
  setCustomResponse(response: HearingAIResponse): void {
    this.customResponse = response
  }

  /**
   * 設定されたカスタムレスポンスを取得
   */
  getCustomResponse(): HearingAIResponse | undefined {
    return this.customResponse
  }

  /**
   * エラーを設定
   */
  setError(error: string): void {
    this.error = error
  }

  async generateScript(_prompt: string): Promise<LLMResponse> {
    if (this.error) {
      return {
        error: this.error,
        rawOutput: `FakeLLM Error: ${this.error}`,
      }
    }

    const responseScript = this.script ?? this.getDefaultScript()

    return {
      script: responseScript,
      rawOutput: 'FakeLLM Response',
    }
  }

  /**
   * デフォルトの台本（バリデーションを通過する内容）
   */
  private getDefaultScript(): Script {
    return {
      hook: 'これを知らないと損をします。今日お伝えする内容は、多くの人が見落としている重要なポイントです。',
      body:
        '実は成功している人たちには共通点があります。それは毎日の小さな習慣を大切にしていること。' +
        '具体的には、朝起きたら最初に今日の目標を3つ書き出す。これだけで1日の生産性が劇的に変わります。' +
        '科学的な研究でも、目標を書き出す人はそうでない人と比べて達成率が42%も高いことがわかっています。',
      cta: 'この方法を試してみたいと思ったらいいねボタンを押してください。他にも役立つ情報を発信しています。',
    }
  }
}
