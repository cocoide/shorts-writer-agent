/**
 * LLMレスポンスからJSON文字列を抽出するユーティリティ
 *
 * 設計意図：
 * LLMは純粋なJSONではなく、以下のような形式で返すことがある：
 * - ```json ... ``` で囲まれたコードブロック
 * - ``` ... ``` で囲まれたコードブロック
 * - JSON前後に説明文が付いている
 *
 * これらのケースに対応してJSONを抽出する。
 */
export function extractJson(text: string): string {
  if (!text || text.trim() === '') {
    return ''
  }

  const trimmed = text.trim()

  // ```json ... ``` または ``` ... ``` で囲まれている場合
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // { で始まり } で終わる部分を抽出（最初の { から最後の } まで）
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  return trimmed
}

/**
 * LLMレスポンスをパースしてオブジェクトを返す
 * パース失敗時はnullを返す
 */
export function parseJsonResponse<T>(text: string): T | null {
  try {
    const jsonString = extractJson(text)
    return JSON.parse(jsonString) as T
  } catch {
    return null
  }
}
