import type { CtaPurpose, ScriptGenerationRequest } from '@/lib/types/script'

/**
 * CTA目的ごとの誘導指示
 */
const CTA_INSTRUCTIONS: Record<CtaPurpose, string> = {
  longVideo:
    'CTAでは長尺動画・本編・フル動画への誘導を行ってください。「長尺」「本編」「フル」などのワードを必ず含めてください。',
  like: 'CTAでは高評価・いいねを促してください。「いいね」「高評価」「グッド」などのワードを必ず含めてください。',
  comment:
    'CTAではコメントを促してください。「コメント」「感想」「教えて」などのワードを必ず含めてください。',
}

/**
 * YouTube Shorts台本生成用のプロンプトを構築する
 *
 * 設計意図：
 * - 必須セクション（hook, body, cta）を明示的に指示
 * - 任意セクション（context, proof, transition）の存在を認識
 * - JSON形式で出力を指示し、パース可能な構造を保証
 * - 制約（絵文字禁止、文字数）を明示
 */
export class PromptBuilder {
  /**
   * プロンプトを構築する
   */
  build(request: ScriptGenerationRequest): string {
    const ctaInstruction = CTA_INSTRUCTIONS[request.ctaPurpose]

    return `あなたはYouTube Shorts向けの台本を作成する専門家です。

以下のトピックについて、30秒程度で読み上げられる台本を作成してください。

【トピック】
${request.topic}

【必須セクション】
以下の3つは必ず含めてください：
- hook: 視聴者の注意を引く冒頭（フック）
- body: 価値を提供する本編
- cta: 行動を促す呼びかけ

【任意セクション】
必要に応じて以下を追加できます：
- context: 前提・誰向けか・状況説明
- proof: 理由・具体例・根拠
- transition: 話の切り替え・強調

【CTA指示】
${ctaInstruction}

【制約】
- 絵文字は絶対に使用しないでください（読み上げ用途のため）
- 合計文字数は250文字以上400文字以下を目安にしてください
- 自然な話し言葉で書いてください

【出力形式】
以下のJSON形式で出力してください。他の文章は一切含めないでください。

{
  "hook": "フックのテキスト",
  "context": "前提のテキスト（任意）",
  "body": "本編のテキスト",
  "proof": "根拠のテキスト（任意）",
  "transition": "切り替えのテキスト（任意）",
  "cta": "CTAのテキスト"
}

任意セクションを含めない場合は、そのキーを省略してください。`
  }
}
