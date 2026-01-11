/**
 * YouTube動画の情報
 */
export interface VideoInfo {
  title: string
  description: string
  channelTitle: string
  /** 字幕（取得できた場合） */
  captions?: string
}

/**
 * 動画分析結果
 */
export interface VideoAnalysis {
  /** フックのスタイル（例：衝撃・驚き系、質問系、数字系） */
  hookStyle: string
  /** トーン（例：カジュアル、フォーマル、エモーショナル） */
  tone: string
  /** 構成パターン（例：ストーリー形式、リスト形式、比較形式） */
  structure: string
}

/**
 * YouTube URL検証結果
 */
export interface YouTubeUrlValidationResult {
  valid: boolean
  videoId?: string
  error?: 'INVALID_URL' | 'NOT_YOUTUBE'
}

/**
 * YouTube解析結果
 */
export interface YouTubeAnalyzeResult {
  success: boolean
  videoInfo?: VideoInfo
  analysis?: VideoAnalysis
  error?: string
}
