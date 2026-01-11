'use client'

import { useState } from 'react'
import type { Script, CtaPurpose, ValidationError } from '@/lib/types/script'
import type { HearingMessage } from '@/lib/types/hearing'
import type { VideoAnalysis } from '@/lib/types/youtube'

type GenerationResponse = {
  success: boolean
  script?: Script
  errors?: ValidationError[]
  llmError?: string
}

type HearingResponse = {
  type: 'question' | 'complete' | 'error'
  content?: string
  error?: string
}

type YouTubeAnalysisResponse = {
  success: boolean
  videoInfo?: { title: string; channelTitle: string }
  analysis?: VideoAnalysis
  error?: string
}

type AppState = 'input' | 'hearing' | 'ready' | 'generating' | 'result'

export default function Home() {
  const [topic, setTopic] = useState('')
  const [ctaPurpose, setCtaPurpose] = useState<CtaPurpose>('longVideo')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [videoAnalysis, setVideoAnalysis] = useState<YouTubeAnalysisResponse | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [appState, setAppState] = useState<AppState>('input')
  const [history, setHistory] = useState<HearingMessage[]>([])
  const [userInput, setUserInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<GenerationResponse | null>(null)

  // YouTube動画を分析
  const analyzeYouTube = async () => {
    if (!youtubeUrl.trim()) return

    setIsAnalyzing(true)
    setVideoAnalysis(null)

    try {
      const response = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl }),
      })
      const data: YouTubeAnalysisResponse = await response.json()
      setVideoAnalysis(data)
    } catch {
      setVideoAnalysis({ success: false, error: 'ネットワークエラー' })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ヒアリング開始
  const startHearing = async () => {
    if (!topic.trim()) return

    setIsLoading(true)
    setAppState('hearing')
    setHistory([])

    try {
      const response = await fetch('/api/hearing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, history: [] }),
      })
      const data: HearingResponse = await response.json()

      if (data.type === 'error') {
        setAppState('input')
        return
      }

      if (data.content) {
        setHistory([{ role: 'assistant', content: data.content }])
      }
    } catch {
      setAppState('input')
    } finally {
      setIsLoading(false)
    }
  }

  // ユーザー回答を送信
  const sendResponse = async () => {
    if (!userInput.trim()) return

    const newHistory: HearingMessage[] = [
      ...history,
      { role: 'user', content: userInput },
    ]
    setHistory(newHistory)
    setUserInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/hearing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, history: newHistory }),
      })
      const data: HearingResponse = await response.json()

      if (data.type === 'complete') {
        if (data.content) {
          setHistory([
            ...newHistory,
            { role: 'assistant', content: data.content },
          ])
        }
        setAppState('ready')
      } else if (data.type === 'question' && data.content) {
        setHistory([
          ...newHistory,
          { role: 'assistant', content: data.content },
        ])
      }
    } catch {
      // エラー時は何もしない
    } finally {
      setIsLoading(false)
    }
  }

  // 台本生成
  const generateScript = async () => {
    setIsLoading(true)
    setAppState('generating')

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, ctaPurpose, history }),
      })
      const data: GenerationResponse = await response.json()
      setResult(data)
      setAppState('result')
    } catch {
      setResult({
        success: false,
        llmError: 'ネットワークエラーが発生しました',
      })
      setAppState('result')
    } finally {
      setIsLoading(false)
    }
  }

  // やり直し
  const reset = () => {
    setAppState('input')
    setHistory([])
    setResult(null)
    setUserInput('')
  }

  // ヒアリングに戻る
  const backToHearing = () => {
    setAppState('hearing')
    setResult(null)
  }

  return (
    <main className="container">
      <h1>YouTube Shorts 台本生成</h1>

      {/* トピック入力画面 */}
      {appState === 'input' && (
        <div>
          <div className="form-group">
            <label htmlFor="youtubeUrl">参考動画URL（任意）</label>
            <div className="url-input-group">
              <input
                type="text"
                id="youtubeUrl"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={isAnalyzing}
              />
              <button
                type="button"
                onClick={analyzeYouTube}
                disabled={isAnalyzing || !youtubeUrl.trim()}
                className="analyze-btn"
              >
                {isAnalyzing ? '分析中...' : '分析'}
              </button>
            </div>
          </div>

          {videoAnalysis && (
            <div className={`analysis-result ${videoAnalysis.success ? 'success' : 'error'}`}>
              {videoAnalysis.success ? (
                <>
                  <div className="video-title">
                    <strong>{videoAnalysis.videoInfo?.title}</strong>
                    <span className="channel-name">
                      by {videoAnalysis.videoInfo?.channelTitle}
                    </span>
                  </div>
                  {videoAnalysis.analysis && (
                    <div className="analysis-details">
                      <div className="analysis-item">
                        <span className="label">フック:</span>
                        <span>{videoAnalysis.analysis.hookStyle}</span>
                      </div>
                      <div className="analysis-item">
                        <span className="label">トーン:</span>
                        <span>{videoAnalysis.analysis.tone}</span>
                      </div>
                      <div className="analysis-item">
                        <span className="label">構成:</span>
                        <span>{videoAnalysis.analysis.structure}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="error-text">{videoAnalysis.error}</p>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="topic">トピック</label>
            <input
              type="text"
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例: 朝活のメリット"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ctaPurpose">CTA目的</label>
            <select
              id="ctaPurpose"
              value={ctaPurpose}
              onChange={(e) => setCtaPurpose(e.target.value as CtaPurpose)}
              disabled={isLoading}
            >
              <option value="longVideo">長尺動画への誘導</option>
              <option value="like">高評価</option>
              <option value="comment">コメント</option>
            </select>
          </div>

          <button
            onClick={startHearing}
            disabled={isLoading || !topic.trim()}
          >
            {isLoading ? 'ヒアリング開始中...' : 'ヒアリングを開始'}
          </button>
        </div>
      )}

      {/* ヒアリング画面 */}
      {(appState === 'hearing' || appState === 'ready') && (
        <div>
          <div className="topic-display">
            <strong>トピック:</strong> {topic}
          </div>

          <div className="chat-container">
            {history.map((message, index) => (
              <div
                key={index}
                className={`chat-message ${message.role === 'assistant' ? 'assistant' : 'user'}`}
              >
                <div className="message-role">
                  {message.role === 'assistant' ? 'AI' : 'あなた'}
                </div>
                <div className="message-content">{message.content}</div>
              </div>
            ))}
          </div>

          {appState === 'hearing' && (
            <div className="input-area">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="回答を入力..."
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendResponse()
                  }
                }}
              />
              <button onClick={sendResponse} disabled={isLoading || !userInput.trim()}>
                {isLoading ? '送信中...' : '送信'}
              </button>
            </div>
          )}

          {appState === 'ready' && (
            <div className="ready-area">
              <p className="ready-message">ヒアリング完了！台本を生成できます。</p>
              <button onClick={generateScript} disabled={isLoading}>
                台本を生成
              </button>
              <button onClick={reset} className="secondary" disabled={isLoading}>
                やり直す
              </button>
            </div>
          )}
        </div>
      )}

      {/* 生成中 */}
      {appState === 'generating' && (
        <div className="generating">
          <p>台本を生成中...</p>
        </div>
      )}

      {/* 結果表示 */}
      {appState === 'result' && result && (
        <div>
          {result.success && result.script && (
            <div className="result">
              <h2>生成結果</h2>
              <div className="script-section">
                <h3>Hook</h3>
                <p>{result.script.hook}</p>
              </div>
              {result.script.context && (
                <div className="script-section">
                  <h3>Context</h3>
                  <p>{result.script.context}</p>
                </div>
              )}
              <div className="script-section">
                <h3>Body</h3>
                <p>{result.script.body}</p>
              </div>
              {result.script.proof && (
                <div className="script-section">
                  <h3>Proof</h3>
                  <p>{result.script.proof}</p>
                </div>
              )}
              {result.script.transition && (
                <div className="script-section">
                  <h3>Transition</h3>
                  <p>{result.script.transition}</p>
                </div>
              )}
              <div className="script-section">
                <h3>CTA</h3>
                <p>{result.script.cta}</p>
              </div>
            </div>
          )}

          {!result.success && (
            <div className="error">
              <h2>エラー</h2>
              {result.llmError && <p>{result.llmError}</p>}
              {result.errors && result.errors.length > 0 && (
                <ul>
                  {result.errors.map((error, index) => (
                    <li key={index}>
                      [{error.code}] {error.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="result-actions">
            <button onClick={generateScript} disabled={isLoading}>
              再生成
            </button>
            <button onClick={backToHearing} className="secondary" disabled={isLoading}>
              ヒアリングに戻る
            </button>
            <button onClick={reset} className="secondary" disabled={isLoading}>
              最初からやり直す
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
