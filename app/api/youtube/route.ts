import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateYouTubeUrl, extractVideoId } from '@/lib/youtube/youtube-analyzer'
import type { VideoAnalysis } from '@/lib/types/youtube'

/**
 * YouTube動画解析APIエンドポイント
 *
 * POSTリクエストでYouTube URLを受け取り、
 * 動画の構成・トーン・フック手法を分析して返す。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body as { url: string }

    // URL検証
    const validation = validateYouTubeUrl(url)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error:
            validation.error === 'NOT_YOUTUBE'
              ? 'YouTube以外のURLは使用できません'
              : '無効なURLです',
        },
        { status: 400 }
      )
    }

    const videoId = extractVideoId(url)
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: '動画IDを抽出できません' },
        { status: 400 }
      )
    }

    // OEmbed APIで動画タイトルを取得
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const oembedResponse = await fetch(oembedUrl)

    if (!oembedResponse.ok) {
      return NextResponse.json({
        success: false,
        error: '動画情報を取得できませんでした。非公開または削除された動画の可能性があります。',
      })
    }

    const oembedData = await oembedResponse.json()
    const title = oembedData.title as string
    const channelTitle = oembedData.author_name as string

    // APIキーがあればLLMで分析
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        videoInfo: { title, channelTitle, description: '' },
        analysis: null,
      })
    }

    // LLMで分析
    const analysis = await analyzeWithLLM(apiKey, title, channelTitle)

    return NextResponse.json({
      success: true,
      videoInfo: { title, channelTitle, description: '' },
      analysis,
    })
  } catch (error) {
    console.error('YouTube analysis error:', error)
    return NextResponse.json(
      { success: false, error: '動画解析中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

async function analyzeWithLLM(
  apiKey: string,
  title: string,
  channelTitle: string
): Promise<VideoAnalysis | null> {
  try {
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `以下のYouTube動画のタイトルとチャンネル名から、この動画の特徴を分析してください。

タイトル: ${title}
チャンネル: ${channelTitle}

以下のJSON形式で回答してください：
{
  "hookStyle": "フックのスタイル（例：衝撃・驚き系、質問系、数字系、ストーリー系）",
  "tone": "トーン（例：カジュアル、フォーマル、エモーショナル、教育的）",
  "structure": "構成パターン（例：ストーリー形式、リスト形式、比較形式、How-to形式）"
}`,
        },
      ],
    })

    const textContent = response.content.find(
      (block) => block.type === 'text'
    ) as Anthropic.TextBlock | undefined

    if (!textContent) return null

    const parsed = JSON.parse(textContent.text)
    return {
      hookStyle: parsed.hookStyle || '不明',
      tone: parsed.tone || '不明',
      structure: parsed.structure || '不明',
    }
  } catch {
    return null
  }
}
