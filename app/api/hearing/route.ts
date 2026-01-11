import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { HearingMessage } from '@/lib/types/hearing'
import { extractJson } from '@/lib/utils/json-parser'

/**
 * ヒアリングAPIエンドポイント
 *
 * POSTリクエストでトピックと会話履歴を受け取り、
 * 次の質問または完了判定を返す。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic, history } = body as {
      topic: string
      history: HearingMessage[]
    }

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { type: 'error', error: 'トピックが指定されていません' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { type: 'error', error: 'APIキーが設定されていません' },
        { status: 500 }
      )
    }

    const client = new Anthropic({ apiKey })
    const response = await generateHearingResponse(client, topic, history)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Hearing error:', error)
    return NextResponse.json(
      { type: 'error', error: 'ヒアリング中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

async function generateHearingResponse(
  client: Anthropic,
  topic: string,
  history: HearingMessage[]
): Promise<{ type: 'question' | 'complete'; content: string }> {
  const systemPrompt = `あなたはYouTube Shorts用の台本を作成するためのヒアリングを行うアシスタントです。

## 目的
ユーザーから必要な情報を収集し、質の高い台本を作成するための準備を行います。

## 収集すべき情報
- ターゲット視聴者（誰向けか）
- 伝えたいメッセージ
- 具体的なエピソードや数字
- 視聴者に取ってほしい行動

## ルール
- 1回に1つの質問のみ行う
- 質問は簡潔で答えやすいものにする
- 会話は日本語で行う
- 3〜5回の質問で十分な情報を収集する

## 出力形式
以下のJSON形式で出力してください：
- まだ質問が必要な場合: {"type": "question", "content": "質問内容"}
- 十分な情報が集まった場合: {"type": "complete", "content": "ヒアリング完了のメッセージ"}`

  const userMessage = buildUserMessage(topic, history)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const textContent = response.content.find(
    (block) => block.type === 'text'
  ) as Anthropic.TextBlock | undefined

  if (!textContent) {
    return { type: 'question', content: 'もう少し詳しく教えてください。' }
  }

  try {
    // LLMがコードブロックで囲んで返す場合に対応
    const jsonString = extractJson(textContent.text)
    const parsed = JSON.parse(jsonString)
    return {
      type: parsed.type === 'complete' ? 'complete' : 'question',
      content: parsed.content || textContent.text,
    }
  } catch {
    // JSONパース失敗時は質問として扱う
    return { type: 'question', content: textContent.text }
  }
}

function buildUserMessage(topic: string, history: HearingMessage[]): string {
  if (history.length === 0) {
    return `トピック: ${topic}

このトピックについてヒアリングを開始してください。最初の質問をお願いします。`
  }

  const conversationHistory = history
    .map((m) => `${m.role === 'assistant' ? 'AI' : 'ユーザー'}: ${m.content}`)
    .join('\n')

  return `トピック: ${topic}

これまでの会話:
${conversationHistory}

上記の会話を踏まえて、次の質問をするか、十分な情報が集まったと判断してください。`
}
