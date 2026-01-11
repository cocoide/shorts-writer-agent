import type {
  VideoInfo,
  VideoAnalysis,
  YouTubeUrlValidationResult,
  YouTubeAnalyzeResult,
} from '@/lib/types/youtube'

/**
 * YouTube URLを検証する
 *
 * 設計意図：
 * 無効なURLやYouTube以外のURLを早期に検出し、
 * 適切なエラーメッセージを返す。
 */
export function validateYouTubeUrl(url: string): YouTubeUrlValidationResult {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'INVALID_URL' }
  }

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    // YouTubeドメインをチェック
    const isYouTube =
      hostname === 'youtube.com' ||
      hostname === 'www.youtube.com' ||
      hostname === 'youtu.be' ||
      hostname === 'm.youtube.com'

    if (!isYouTube) {
      return { valid: false, error: 'NOT_YOUTUBE' }
    }

    const videoId = extractVideoId(url)
    if (!videoId) {
      return { valid: false, error: 'INVALID_URL' }
    }

    return { valid: true, videoId }
  } catch {
    return { valid: false, error: 'INVALID_URL' }
  }
}

/**
 * YouTube URLから動画IDを抽出する
 */
export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    // youtu.be/VIDEO_ID
    if (hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1)
      return isValidVideoId(id) ? id : null
    }

    // youtube.com/watch?v=VIDEO_ID
    if (parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v')
      return id && isValidVideoId(id) ? id : null
    }

    // youtube.com/shorts/VIDEO_ID
    if (parsed.pathname.startsWith('/shorts/')) {
      const id = parsed.pathname.split('/')[2]
      return id && isValidVideoId(id) ? id : null
    }

    // youtube.com/embed/VIDEO_ID
    if (parsed.pathname.startsWith('/embed/')) {
      const id = parsed.pathname.split('/')[2]
      return id && isValidVideoId(id) ? id : null
    }

    return null
  } catch {
    return null
  }
}

/**
 * 動画IDの形式が有効かチェック（11文字、英数字とハイフン、アンダースコア）
 */
function isValidVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id)
}

/**
 * テスト用のFake YouTubeクライアント
 */
export class FakeYouTubeClient {
  private videoInfo?: VideoInfo
  private error?: string
  private analysis?: VideoAnalysis

  setVideoInfo(info: VideoInfo): void {
    this.videoInfo = info
  }

  getVideoInfo(): VideoInfo | undefined {
    return this.videoInfo
  }

  setError(error: string): void {
    this.error = error
  }

  getError(): string | undefined {
    return this.error
  }

  setAnalysis(analysis: VideoAnalysis): void {
    this.analysis = analysis
  }

  getAnalysis(): VideoAnalysis | undefined {
    return this.analysis
  }

  async fetchVideoInfo(_videoId: string): Promise<VideoInfo | null> {
    if (this.error) {
      return null
    }
    return this.videoInfo ?? null
  }

  async analyzeVideo(_info: VideoInfo): Promise<VideoAnalysis | null> {
    if (this.error) {
      return null
    }
    return this.analysis ?? null
  }
}

/**
 * YouTube動画を解析するクラス
 *
 * 設計意図：
 * 参考動画から構成・トーン・フック手法を分析し、
 * 台本生成に活用できる情報を抽出する。
 */
export class YouTubeAnalyzer {
  private client: FakeYouTubeClient

  constructor(client: FakeYouTubeClient) {
    this.client = client
  }

  async analyze(videoId: string): Promise<YouTubeAnalyzeResult> {
    const error = this.client.getError()
    if (error) {
      return { success: false, error }
    }

    const videoInfo = await this.client.fetchVideoInfo(videoId)
    if (!videoInfo) {
      return { success: false, error: '動画情報の取得に失敗しました' }
    }

    const analysis = await this.client.analyzeVideo(videoInfo)

    return {
      success: true,
      videoInfo,
      analysis: analysis ?? undefined,
    }
  }
}
