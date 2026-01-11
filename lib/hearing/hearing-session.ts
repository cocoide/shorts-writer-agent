import type {
  HearingState,
  HearingMessage,
  CanGenerateResult,
  HearingContext,
} from '@/lib/types/hearing'
import type { CtaPurpose } from '@/lib/types/script'

/**
 * ヒアリングセッションを管理するクラス
 *
 * 設計意図：
 * AIが推測で台本を生成することを防ぐため、
 * ヒアリングが完了するまで台本生成を禁止する。
 * 会話履歴を保持し、台本生成時に参照できるようにする。
 */
export class HearingSession {
  private state: HearingState = 'not_started'
  private topic: string = ''
  private history: HearingMessage[] = []
  private ctaPurpose: CtaPurpose = 'longVideo'

  /**
   * 現在のヒアリング状態を取得
   */
  getState(): HearingState {
    return this.state
  }

  /**
   * トピックを設定
   */
  setTopic(topic: string): void {
    this.topic = topic
  }

  /**
   * トピックを取得
   */
  getTopic(): string {
    return this.topic
  }

  /**
   * CTA目的を設定
   */
  setCtaPurpose(purpose: CtaPurpose): void {
    this.ctaPurpose = purpose
  }

  /**
   * ヒアリングを開始
   */
  start(): void {
    this.state = 'in_progress'
  }

  /**
   * ヒアリングを完了
   */
  complete(): void {
    this.state = 'completed'
  }

  /**
   * メッセージを追加
   */
  addMessage(message: HearingMessage): void {
    this.history.push(message)
  }

  /**
   * 会話履歴を取得
   */
  getHistory(): HearingMessage[] {
    return [...this.history]
  }

  /**
   * 台本生成が可能かどうかを判定
   */
  canGenerate(): CanGenerateResult {
    if (this.state === 'not_started') {
      return {
        allowed: false,
        reason: 'HEARING_NOT_STARTED',
      }
    }

    if (this.state === 'in_progress') {
      return {
        allowed: false,
        reason: 'HEARING_NOT_COMPLETED',
      }
    }

    return {
      allowed: true,
    }
  }

  /**
   * 台本生成用のコンテキストを取得
   * ヒアリングが完了していない場合はエラー
   */
  getContextForGeneration(): HearingContext {
    if (this.state !== 'completed') {
      throw new Error('ヒアリングが完了していません')
    }

    return {
      topic: this.topic,
      history: [...this.history],
      ctaPurpose: this.ctaPurpose,
    }
  }
}
