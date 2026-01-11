import { describe, it, expect } from 'vitest'
import { extractJson } from '@/lib/utils/json-parser'

/**
 * JSONパーサーのテスト
 *
 * 設計意図：
 * LLMは純粋なJSONではなく、マークダウンコードブロックで囲んだり、
 * 説明文を追加したりすることがある。
 * これらのケースに対応してJSONを抽出する。
 */

describe('extractJson', () => {
  describe('マークダウンコードブロックからの抽出', () => {
    it('```json ... ``` で囲まれたJSONを抽出できる', () => {
      const input = `\`\`\`json
{
  "type": "question",
  "content": "誰向けですか？"
}
\`\`\``

      const result = extractJson(input)
      expect(result).toBe('{\n  "type": "question",\n  "content": "誰向けですか？"\n}')
    })

    it('``` ... ``` で囲まれたJSONを抽出できる', () => {
      const input = `\`\`\`
{"type": "complete", "content": "完了しました"}
\`\`\``

      const result = extractJson(input)
      expect(result).toBe('{"type": "complete", "content": "完了しました"}')
    })

    it('コードブロック前後に説明文があっても抽出できる', () => {
      const input = `以下がJSONレスポンスです：

\`\`\`json
{
  "type": "question",
  "content": "ターゲットは誰ですか？"
}
\`\`\`

上記の質問に回答してください。`

      const result = extractJson(input)
      expect(result).toBe('{\n  "type": "question",\n  "content": "ターゲットは誰ですか？"\n}')
    })
  })

  describe('純粋なJSONの処理', () => {
    it('純粋なJSONはそのまま返す', () => {
      const input = '{"type": "question", "content": "質問です"}'

      const result = extractJson(input)
      expect(result).toBe('{"type": "question", "content": "質問です"}')
    })

    it('整形されたJSONもそのまま返す', () => {
      const input = `{
  "hook": "冒頭",
  "body": "本文",
  "cta": "行動喚起"
}`

      const result = extractJson(input)
      expect(result).toBe(input.trim())
    })
  })

  describe('説明文付きJSONの処理', () => {
    it('JSON前の説明文を除去できる', () => {
      const input = `回答します。
{"type": "question", "content": "誰向け？"}`

      const result = extractJson(input)
      expect(result).toBe('{"type": "question", "content": "誰向け？"}')
    })

    it('JSON後の説明文を除去できる', () => {
      const input = `{"type": "complete", "content": "完了"}
以上が回答です。`

      const result = extractJson(input)
      expect(result).toBe('{"type": "complete", "content": "完了"}')
    })
  })

  describe('エッジケース', () => {
    it('空文字列は空文字列を返す', () => {
      const result = extractJson('')
      expect(result).toBe('')
    })

    it('JSONを含まないテキストはそのまま返す', () => {
      const input = 'これはJSONではありません'
      const result = extractJson(input)
      expect(result).toBe('これはJSONではありません')
    })

    it('ネストしたオブジェクトも抽出できる', () => {
      const input = `\`\`\`json
{
  "type": "question",
  "content": "質問",
  "metadata": {
    "count": 1
  }
}
\`\`\``

      const result = extractJson(input)
      const parsed = JSON.parse(result)
      expect(parsed.metadata.count).toBe(1)
    })
  })
})
