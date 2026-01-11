import { NextRequest, NextResponse } from 'next/server'
import { ScriptGenerator } from '@/lib/use-case/script-generator'
import { AnthropicLLM } from '@/lib/llm/anthropic-llm'
import type { CtaPurpose, HearingMessageForRequest } from '@/lib/types/script'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic, ctaPurpose, history } = body as {
      topic: string
      ctaPurpose: CtaPurpose
      history?: HearingMessageForRequest[]
    }

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { success: false, llmError: 'トピックが指定されていません' },
        { status: 400 }
      )
    }

    const validCtaPurposes: CtaPurpose[] = ['longVideo', 'like', 'comment']
    if (!validCtaPurposes.includes(ctaPurpose)) {
      return NextResponse.json(
        { success: false, llmError: '無効なCTA目的が指定されました' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, llmError: 'APIキーが設定されていません' },
        { status: 500 }
      )
    }

    const llm = new AnthropicLLM(apiKey)
    const generator = new ScriptGenerator(llm)
    const result = await generator.generate({ topic, ctaPurpose, history })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json(
      { success: false, llmError: '台本生成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
