import { describe, it, expect } from 'vitest'
import {
  validateYouTubeUrl,
  extractVideoId,
  YouTubeAnalyzer,
  FakeYouTubeClient,
} from '@/lib/youtube/youtube-analyzer'
import type { VideoInfo } from '@/lib/types/youtube'

/**
 * フェーズ4: YouTube URL解析の失敗ケース
 *
 * 設計意図：
 * 参考動画のURLから情報を取得し、台本生成に活用する。
 * 無効なURLや取得失敗時のフォールバックを確実に行う。
 */

describe('validateYouTubeUrl', () => {
  describe('無効なURLを入力したらエラー', () => {
    it('空文字はエラー', () => {
      const result = validateYouTubeUrl('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('INVALID_URL')
    })

    it('不正な形式のURLはエラー', () => {
      const result = validateYouTubeUrl('not-a-url')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('INVALID_URL')
    })

    it('URLとして有効でもYouTubeでなければエラー', () => {
      const result = validateYouTubeUrl('https://example.com/watch?v=abc123')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('NOT_YOUTUBE')
    })
  })

  describe('YouTube以外のURLを入力したらエラー', () => {
    it('Vimeo URLはエラー', () => {
      const result = validateYouTubeUrl('https://vimeo.com/123456789')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('NOT_YOUTUBE')
    })

    it('Twitter URLはエラー', () => {
      const result = validateYouTubeUrl('https://twitter.com/user/status/123')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('NOT_YOUTUBE')
    })

    it('TikTok URLはエラー', () => {
      const result = validateYouTubeUrl('https://tiktok.com/@user/video/123')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('NOT_YOUTUBE')
    })
  })

  describe('有効なYouTube URLは成功', () => {
    it('標準的なwatch URL', () => {
      const result = validateYouTubeUrl(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      )
      expect(result.valid).toBe(true)
      expect(result.videoId).toBe('dQw4w9WgXcQ')
    })

    it('短縮URL (youtu.be)', () => {
      const result = validateYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')
      expect(result.valid).toBe(true)
      expect(result.videoId).toBe('dQw4w9WgXcQ')
    })

    it('Shorts URL', () => {
      const result = validateYouTubeUrl(
        'https://www.youtube.com/shorts/dQw4w9WgXcQ'
      )
      expect(result.valid).toBe(true)
      expect(result.videoId).toBe('dQw4w9WgXcQ')
    })

    it('埋め込みURL', () => {
      const result = validateYouTubeUrl(
        'https://www.youtube.com/embed/dQw4w9WgXcQ'
      )
      expect(result.valid).toBe(true)
      expect(result.videoId).toBe('dQw4w9WgXcQ')
    })
  })
})

describe('extractVideoId', () => {
  it('watch URLからIDを抽出', () => {
    expect(
      extractVideoId('https://www.youtube.com/watch?v=abc123XYZ_-')
    ).toBe('abc123XYZ_-')
  })

  it('短縮URLからIDを抽出', () => {
    expect(extractVideoId('https://youtu.be/abc123XYZ_-')).toBe('abc123XYZ_-')
  })

  it('Shorts URLからIDを抽出', () => {
    expect(
      extractVideoId('https://www.youtube.com/shorts/abc123XYZ_-')
    ).toBe('abc123XYZ_-')
  })

  it('追加パラメータがあっても抽出可能', () => {
    expect(
      extractVideoId(
        'https://www.youtube.com/watch?v=abc123XYZ_-&t=120'
      )
    ).toBe('abc123XYZ_-')
  })

  it('無効なURLはnullを返す', () => {
    expect(extractVideoId('https://example.com')).toBeNull()
  })
})

describe('YouTubeAnalyzer', () => {
  describe('動画情報が取得できない場合はフォールバック', () => {
    it('取得失敗時はエラーを返す', async () => {
      const fakeClient = new FakeYouTubeClient()
      fakeClient.setError('動画が見つかりません')

      const analyzer = new YouTubeAnalyzer(fakeClient)
      const result = await analyzer.analyze('dQw4w9WgXcQ')

      expect(result.success).toBe(false)
      expect(result.error).toBe('動画が見つかりません')
    })

    it('取得成功時は動画情報を返す', async () => {
      const fakeClient = new FakeYouTubeClient()
      fakeClient.setVideoInfo({
        title: 'テスト動画',
        description: 'これはテスト動画の説明です',
        channelTitle: 'テストチャンネル',
      })

      const analyzer = new YouTubeAnalyzer(fakeClient)
      const result = await analyzer.analyze('dQw4w9WgXcQ')

      expect(result.success).toBe(true)
      expect(result.videoInfo?.title).toBe('テスト動画')
    })
  })

  describe('分析結果の生成', () => {
    it('動画情報から分析結果を生成できる', async () => {
      const fakeClient = new FakeYouTubeClient()
      fakeClient.setVideoInfo({
        title: '【衝撃】朝活で人生が変わった話',
        description:
          '今回は朝活のメリットについて解説します。\n\n#朝活 #生産性向上',
        channelTitle: 'ライフハックチャンネル',
      })
      fakeClient.setAnalysis({
        hookStyle: '衝撃・驚き系',
        tone: 'カジュアル',
        structure: 'ストーリー形式',
      })

      const analyzer = new YouTubeAnalyzer(fakeClient)
      const result = await analyzer.analyze('dQw4w9WgXcQ')

      expect(result.success).toBe(true)
      expect(result.analysis).toBeDefined()
      expect(result.analysis?.hookStyle).toBe('衝撃・驚き系')
    })
  })
})

describe('FakeYouTubeClient', () => {
  it('カスタム動画情報を設定できる', () => {
    const client = new FakeYouTubeClient()
    const videoInfo: VideoInfo = {
      title: 'カスタムタイトル',
      description: 'カスタム説明',
      channelTitle: 'カスタムチャンネル',
    }

    client.setVideoInfo(videoInfo)
    expect(client.getVideoInfo()).toEqual(videoInfo)
  })

  it('エラーを設定できる', () => {
    const client = new FakeYouTubeClient()
    client.setError('カスタムエラー')
    expect(client.getError()).toBe('カスタムエラー')
  })
})
