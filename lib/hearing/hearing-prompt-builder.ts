import type { HearingContext, HearingMessage } from '@/lib/types/hearing'
import type { CtaPurpose } from '@/lib/types/script'

/**
 * ヒアリング情報を含む台本生成プロンプトを構築するクラス
 *
 * 設計意図：
 * ヒアリングで収集した情報を台本生成プロンプトに反映し、
 * AIが推測ではなく実際のユーザー要望に基づいて台本を生成するようにする。
 */
export class HearingPromptBuilder {
  private readonly CTA_INSTRUCTIONS: Record<CtaPurpose, string> = {
    longVideo:
      '「長尺」「本編」「フル」のいずれかのワードを含めて、長尺動画への誘導を行ってください。',
    like: '「いいね」「高評価」「グッド」のいずれかのワードを含めて、高評価を促してください。',
    comment:
      '「コメント」「感想」「教えて」のいずれかのワードを含めて、コメントを促してください。',
  }

  /**
   * ヒアリング情報を含むプロンプトを構築
   */
  build(context: HearingContext): string {
    if (context.history.length === 0) {
      throw new Error('ヒアリング情報がありません')
    }

    const hearingInfo = this.formatHearingInfo(context.history)
    const ctaInstruction = this.CTA_INSTRUCTIONS[context.ctaPurpose]

    return `あなたはYouTube Shorts用の台本を作成する専門家です。

## トピック
${context.topic}

## ヒアリングで収集した情報
${hearingInfo}

## 台本の構成要素
以下の構成要素で台本を作成してください：

### 必須要素
- hook: 冒頭で視聴者の注意を引くフレーズ（最初の1-2秒で興味を引く）
- body: 本編の内容（価値提供）
- cta: 行動喚起（${ctaInstruction}）

### 任意要素（必要に応じて含める）
- context: 前提や状況説明
- proof: 理由や具体例
- transition: 話の切り替えや強調

## 制約
- 絵文字は使用しないでください
- 全体で250〜400文字に収めてください
- ヒアリングで収集した情報を必ず反映してください

## 出力形式
以下のJSON形式で出力してください。必須要素は必ず含め、任意要素は適切な場合のみ含めてください。
{
  "hook": "...",
  "context": "...",
  "body": "...",
  "proof": "...",
  "transition": "...",
  "cta": "..."
}`
  }

  /**
   * ヒアリング履歴を読みやすい形式に整形
   */
  private formatHearingInfo(history: HearingMessage[]): string {
    const lines: string[] = []

    for (let i = 0; i < history.length; i += 2) {
      const question = history[i]
      const answer = history[i + 1]

      if (question && answer) {
        lines.push(`Q: ${question.content}`)
        lines.push(`A: ${answer.content}`)
        lines.push('')
      }
    }

    return lines.join('\n').trim()
  }
}
