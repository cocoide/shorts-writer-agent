import type {
  Script,
  CtaPurpose,
  ValidationResult,
  ValidationError,
  ValidationErrorCode,
} from './types/script'

/** 文字数の下限 */
const MIN_LENGTH = 250
/** 文字数の上限 */
const MAX_LENGTH = 400

/** CTA目的ごとの誘導ワード（部分一致） */
const CTA_KEYWORDS: Record<CtaPurpose, string[]> = {
  longVideo: ['長尺', '本編', 'フル'],
  like: ['いいね', '高評価', 'グッド'],
  comment: ['コメント', '感想', '教えて'],
}

/** CTA目的ごとのエラーコード */
const CTA_ERROR_CODES: Record<CtaPurpose, ValidationErrorCode> = {
  longVideo: 'CTA_MISMATCH_LONG_VIDEO',
  like: 'CTA_MISMATCH_LIKE',
  comment: 'CTA_MISMATCH_COMMENT',
}

/**
 * 絵文字を検出する正規表現
 * Unicode絵文字の一般的なパターンを検出
 */
const EMOJI_REGEX =
  /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/u

/**
 * 台本のバリデーションを行う
 *
 * 設計意図：
 * LLMの出力は信用せず、必ずバリデーションを通す。
 * このvalidatorが「失敗」と判定したケースは、
 * プロンプトを変更しても絶対に通過しない安全柵となる。
 */
export function validateScript(
  script: Script,
  ctaPurpose: CtaPurpose
): ValidationResult {
  const errors: ValidationError[] = []

  // 構造チェック：必須要素の存在確認
  validateStructure(script, errors)

  // 制約チェック：絵文字検出
  validateNoEmoji(script, errors)

  // 制約チェック：文字数
  validateLength(script, errors)

  // CTA目的との整合性チェック
  validateCtaPurpose(script, ctaPurpose, errors)

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 構造チェック：hook, body, cta が存在するか確認
 */
function validateStructure(script: Script, errors: ValidationError[]): void {
  if (!script.hook || script.hook.trim() === '') {
    errors.push({
      code: 'MISSING_HOOK',
      message: 'フック（hook）が存在しません。視聴者の注意を引く冒頭が必要です。',
    })
  }

  if (!script.body || script.body.trim() === '') {
    errors.push({
      code: 'MISSING_BODY',
      message: '本編（body）が存在しません。価値を提供する本編が必要です。',
    })
  }

  if (!script.cta || script.cta.trim() === '') {
    errors.push({
      code: 'MISSING_CTA',
      message: 'CTA（cta）が存在しません。行動を促す呼びかけが必要です。',
    })
  }
}

/**
 * 絵文字チェック：すべての要素に絵文字が含まれていないか確認
 */
function validateNoEmoji(script: Script, errors: ValidationError[]): void {
  const allText = [
    script.hook,
    script.context,
    script.body,
    script.proof,
    script.transition,
    script.cta,
  ]
    .filter(Boolean)
    .join('')

  if (EMOJI_REGEX.test(allText)) {
    errors.push({
      code: 'CONTAINS_EMOJI',
      message: '台本に絵文字が含まれています。読み上げ用途として不適切です。',
    })
  }
}

/**
 * 文字数チェック：250〜400文字の範囲内か確認
 */
function validateLength(script: Script, errors: ValidationError[]): void {
  const totalLength = [
    script.hook,
    script.context,
    script.body,
    script.proof,
    script.transition,
    script.cta,
  ]
    .filter(Boolean)
    .join('').length

  if (totalLength < MIN_LENGTH) {
    errors.push({
      code: 'TOO_SHORT',
      message: `台本が短すぎます。${MIN_LENGTH}文字以上必要です（現在: ${totalLength}文字）。`,
    })
  }

  if (totalLength > MAX_LENGTH) {
    errors.push({
      code: 'TOO_LONG',
      message: `台本が長すぎます。${MAX_LENGTH}文字以下にしてください（現在: ${totalLength}文字）。`,
    })
  }
}

/**
 * CTA目的との整合性チェック：指定された目的に対応するワードが含まれているか確認
 */
function validateCtaPurpose(
  script: Script,
  ctaPurpose: CtaPurpose,
  errors: ValidationError[]
): void {
  const keywords = CTA_KEYWORDS[ctaPurpose]
  const cta = script.cta || ''

  // 部分一致：いずれかのキーワードが含まれていればOK
  const hasKeyword = keywords.some((keyword) => cta.includes(keyword))

  if (!hasKeyword) {
    const errorCode = CTA_ERROR_CODES[ctaPurpose]
    const purposeDescriptions: Record<CtaPurpose, string> = {
      longVideo: '長尺動画への誘導',
      like: '高評価の促進',
      comment: 'コメントの促進',
    }

    errors.push({
      code: errorCode,
      message: `CTA目的「${purposeDescriptions[ctaPurpose]}」に対応するワード（${keywords.join('、')}のいずれか）が含まれていません。`,
    })
  }
}
