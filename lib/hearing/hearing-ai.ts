import type { FakeLLM } from '@/lib/llm/fake-llm'
import type { HearingMessage, HearingAIResponse } from '@/lib/types/hearing'

/**
 * ヒアリングを行うAIクラス
 *
 * 設計意図：
 * LLMを使って質問を生成し、十分な情報が集まったら完了を判定する。
 * FakeLLMを使用することでテストが容易になる。
 */
export class HearingAI {
  private llm: FakeLLM

  constructor(llm: FakeLLM) {
    this.llm = llm
  }

  /**
   * 次の質問を生成するか、完了を判定する
   */
  async generateNextQuestion(
    topic: string,
    history: HearingMessage[]
  ): Promise<HearingAIResponse> {
    // FakeLLMの場合はカスタムレスポンスを返す
    const customResponse = this.llm.getCustomResponse()
    if (customResponse) {
      return customResponse
    }

    // エラーチェック
    try {
      const result = await this.llm.generateScript('')
      if (result.error) {
        return {
          type: 'error',
          error: result.error,
        }
      }
    } catch (error) {
      return {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    // デフォルトは質問を返す
    return {
      type: 'question',
      content: this.getDefaultQuestion(topic, history),
    }
  }

  /**
   * デフォルトの質問を生成
   */
  private getDefaultQuestion(
    topic: string,
    history: HearingMessage[]
  ): string {
    if (history.length === 0) {
      return `「${topic}」についてのショート動画を作成しますね。まず、この動画は誰に向けたものですか？`
    }

    const questionCount = history.filter((m) => m.role === 'assistant').length
    const questions = [
      '具体的にどんなメッセージを伝えたいですか？',
      '視聴者にどんな行動を取ってほしいですか？',
      '何か具体的なエピソードや数字はありますか？',
    ]

    return questions[questionCount % questions.length]
  }
}
