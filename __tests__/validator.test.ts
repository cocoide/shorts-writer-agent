import { describe, it, expect } from 'vitest'
import type { Script, CtaPurpose } from '@/lib/types/script'
import { validateScript } from '@/lib/validator'

/**
 * フェーズ1：失敗ケースのテスト
 *
 * 設計意図：
 * これらのテストは「台本として成立しない」ケースを検出する安全柵である。
 * 面白さや表現力は判定せず、最低限の構造的整合性のみを保証する。
 */

describe('ScriptValidator - 構造の失敗ケース', () => {
  /**
   * 失敗ケース：hook が存在しない
   * 理由：フックがない台本は視聴者の注意を引けない
   */
  it('hook が空文字の場合、MISSING_HOOK エラーを返す', () => {
    const script: Script = {
      hook: '',
      body: 'これは本編です。',
      cta: 'いいねお願いします。',
    }
    const result = validateScript(script, 'like')
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({
      code: 'MISSING_HOOK',
      message: expect.any(String),
    })
  })

  /**
   * 失敗ケース：body が存在しない
   * 理由：本編がない台本は価値を提供できない
   */
  it('body が空文字の場合、MISSING_BODY エラーを返す', () => {
    const script: Script = {
      hook: 'これはフックです。',
      body: '',
      cta: 'いいねお願いします。',
    }
    const result = validateScript(script, 'like')
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({
      code: 'MISSING_BODY',
      message: expect.any(String),
    })
  })

  /**
   * 失敗ケース：cta が存在しない
   * 理由：CTAがない台本は行動を促せない
   */
  it('cta が空文字の場合、MISSING_CTA エラーを返す', () => {
    const script: Script = {
      hook: 'これはフックです。',
      body: 'これは本編です。',
      cta: '',
    }
    const result = validateScript(script, 'like')
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({
      code: 'MISSING_CTA',
      message: expect.any(String),
    })
  })

  /**
   * 成功ケース：すべての必須要素が存在する
   * 任意要素（context, proof, transition）は存在しなくても成功
   */
  it('hook, body, cta がすべて存在する場合、構造エラーは発生しない', () => {
    const script: Script = {
      hook: 'これはフックです。視聴者の注意を引きます。',
      body: 'これは本編です。価値ある情報を提供します。' +
            'さらに詳しく説明していきます。' +
            '具体的な例を挙げると...',
      cta: 'この動画が参考になったら、いいねボタンを押してください。',
    }
    const result = validateScript(script, 'like')
    // 構造エラーがないことを確認（他のエラーは許容）
    const structureErrors = result.errors.filter(e =>
      ['MISSING_HOOK', 'MISSING_BODY', 'MISSING_CTA', 'INVALID_ORDER'].includes(e.code)
    )
    expect(structureErrors).toHaveLength(0)
  })
})

describe('ScriptValidator - 制約違反の失敗ケース', () => {
  /**
   * 失敗ケース：絵文字が含まれている
   * 理由：読み上げ用途として不適切
   */
  it('台本内に絵文字が含まれている場合、CONTAINS_EMOJI エラーを返す', () => {
    const script: Script = {
      hook: 'これはフックです😊',
      body: 'これは本編です。',
      cta: 'いいねお願いします。',
    }
    const result = validateScript(script, 'like')
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({
      code: 'CONTAINS_EMOJI',
      message: expect.any(String),
    })
  })

  it('body に絵文字が含まれている場合、CONTAINS_EMOJI エラーを返す', () => {
    const script: Script = {
      hook: 'これはフックです。',
      body: 'これは本編です🎉内容が盛りだくさん！',
      cta: 'いいねお願いします。',
    }
    const result = validateScript(script, 'like')
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({
      code: 'CONTAINS_EMOJI',
      message: expect.any(String),
    })
  })

  it('cta に絵文字が含まれている場合、CONTAINS_EMOJI エラーを返す', () => {
    const script: Script = {
      hook: 'これはフックです。',
      body: 'これは本編です。',
      cta: 'いいねお願いします👍',
    }
    const result = validateScript(script, 'like')
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({
      code: 'CONTAINS_EMOJI',
      message: expect.any(String),
    })
  })

  /**
   * 失敗ケース：文字数が少なすぎる（250文字未満）
   * 理由：30秒想定の台本として内容が薄すぎる
   */
  it('合計文字数が250文字未満の場合、TOO_SHORT エラーを返す', () => {
    const script: Script = {
      hook: 'フック',
      body: '本編',
      cta: 'いいね',
    }
    const result = validateScript(script, 'like')
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({
      code: 'TOO_SHORT',
      message: expect.any(String),
    })
  })

  /**
   * 失敗ケース：文字数が多すぎる（400文字超）
   * 理由：30秒想定の台本として長すぎる
   */
  it('合計文字数が400文字を超える場合、TOO_LONG エラーを返す', () => {
    const script: Script = {
      hook: 'これはとても長いフックです。'.repeat(10),
      body: 'これはとても長い本編です。'.repeat(20),
      cta: 'これはとても長いCTAです。'.repeat(5),
    }
    const result = validateScript(script, 'like')
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({
      code: 'TOO_LONG',
      message: expect.any(String),
    })
  })

  /**
   * 成功ケース：文字数が250〜400文字の範囲内
   */
  it('合計文字数が250〜400文字の場合、文字数エラーは発生しない', () => {
    // 約300文字の台本
    const script: Script = {
      hook: 'この動画を見れば、あなたも明日から変われます。たった3分で人生が変わる方法、知りたくないですか？今日から実践できる内容です。',
      body: '実は多くの人が間違った方法で努力しています。正しい方法は非常にシンプルです。' +
            '毎日たった5分でいいんです。朝起きたら最初にやること、それは自分の目標を声に出すこと。' +
            'これを続けるだけで、脳が自然と目標達成モードになります。' +
            '科学的にも証明されている方法なんです。実際に多くの成功者がこの方法を実践しています。',
      cta: 'この方法をもっと詳しく知りたい方は、長尺動画で完全解説しています。概要欄のリンクからどうぞ。',
    }
    const result = validateScript(script, 'longVideo')
    const lengthErrors = result.errors.filter(e =>
      ['TOO_SHORT', 'TOO_LONG'].includes(e.code)
    )
    expect(lengthErrors).toHaveLength(0)
  })
})

describe('ScriptValidator - CTA目的との不整合', () => {
  // 適切な長さの台本ベースを作成するヘルパー
  const createBaseScript = (cta: string): Script => ({
    hook: 'この動画を見れば、あなたも明日から変われます。たった3分で人生が変わる方法、知りたくないですか？',
    body: '実は多くの人が間違った方法で努力しています。正しい方法は非常にシンプルです。' +
          '毎日たった5分でいいんです。朝起きたら最初にやること、それは自分の目標を声に出すこと。' +
          'これを続けるだけで、脳が自然と目標達成モードになります。',
    cta,
  })

  /**
   * 失敗ケース：CTA目的が longVideo なのに誘導ワードがない
   * 判定方法：部分一致
   */
  it('CTA目的が longVideo なのに長尺動画への誘導ワードがない場合、CTA_MISMATCH_LONG_VIDEO エラーを返す', () => {
    const script = createBaseScript('この動画が参考になったら教えてください。')
    const result = validateScript(script, 'longVideo')
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({
      code: 'CTA_MISMATCH_LONG_VIDEO',
      message: expect.any(String),
    })
  })

  it('CTA目的が longVideo で「長尺」が含まれている場合、CTA_MISMATCH_LONG_VIDEO エラーは発生しない', () => {
    const script = createBaseScript('もっと詳しく知りたい方は長尺動画をご覧ください。')
    const result = validateScript(script, 'longVideo')
    expect(result.errors.find(e => e.code === 'CTA_MISMATCH_LONG_VIDEO')).toBeUndefined()
  })

  it('CTA目的が longVideo で「本編」が含まれている場合、CTA_MISMATCH_LONG_VIDEO エラーは発生しない', () => {
    const script = createBaseScript('詳細は本編動画で解説しています。')
    const result = validateScript(script, 'longVideo')
    expect(result.errors.find(e => e.code === 'CTA_MISMATCH_LONG_VIDEO')).toBeUndefined()
  })

  it('CTA目的が longVideo で「フル」が含まれている場合、CTA_MISMATCH_LONG_VIDEO エラーは発生しない', () => {
    const script = createBaseScript('フルバージョンは概要欄のリンクから見れます。')
    const result = validateScript(script, 'longVideo')
    expect(result.errors.find(e => e.code === 'CTA_MISMATCH_LONG_VIDEO')).toBeUndefined()
  })

  /**
   * 失敗ケース：CTA目的が like なのに誘導ワードがない
   */
  it('CTA目的が like なのに高評価を促すワードがない場合、CTA_MISMATCH_LIKE エラーを返す', () => {
    const script = createBaseScript('この動画について、ご意見をお聞かせください。')
    const result = validateScript(script, 'like')
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({
      code: 'CTA_MISMATCH_LIKE',
      message: expect.any(String),
    })
  })

  it('CTA目的が like で「いいね」が含まれている場合、CTA_MISMATCH_LIKE エラーは発生しない', () => {
    const script = createBaseScript('この動画が参考になったらいいねお願いします。')
    const result = validateScript(script, 'like')
    expect(result.errors.find(e => e.code === 'CTA_MISMATCH_LIKE')).toBeUndefined()
  })

  it('CTA目的が like で「高評価」が含まれている場合、CTA_MISMATCH_LIKE エラーは発生しない', () => {
    const script = createBaseScript('高評価ボタンを押してもらえると嬉しいです。')
    const result = validateScript(script, 'like')
    expect(result.errors.find(e => e.code === 'CTA_MISMATCH_LIKE')).toBeUndefined()
  })

  it('CTA目的が like で「グッド」が含まれている場合、CTA_MISMATCH_LIKE エラーは発生しない', () => {
    const script = createBaseScript('グッドボタンで応援してください。')
    const result = validateScript(script, 'like')
    expect(result.errors.find(e => e.code === 'CTA_MISMATCH_LIKE')).toBeUndefined()
  })

  /**
   * 失敗ケース：CTA目的が comment なのに誘導ワードがない
   */
  it('CTA目的が comment なのにコメントを促すワードがない場合、CTA_MISMATCH_COMMENT エラーを返す', () => {
    const script = createBaseScript('この動画が参考になったら高評価お願いします。')
    const result = validateScript(script, 'comment')
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({
      code: 'CTA_MISMATCH_COMMENT',
      message: expect.any(String),
    })
  })

  it('CTA目的が comment で「コメント」が含まれている場合、CTA_MISMATCH_COMMENT エラーは発生しない', () => {
    const script = createBaseScript('あなたの体験談をコメントで教えてください。')
    const result = validateScript(script, 'comment')
    expect(result.errors.find(e => e.code === 'CTA_MISMATCH_COMMENT')).toBeUndefined()
  })

  it('CTA目的が comment で「感想」が含まれている場合、CTA_MISMATCH_COMMENT エラーは発生しない', () => {
    const script = createBaseScript('感想を聞かせてください。')
    const result = validateScript(script, 'comment')
    expect(result.errors.find(e => e.code === 'CTA_MISMATCH_COMMENT')).toBeUndefined()
  })

  it('CTA目的が comment で「教えて」が含まれている場合、CTA_MISMATCH_COMMENT エラーは発生しない', () => {
    const script = createBaseScript('あなたはどう思いますか？ぜひ教えてください。')
    const result = validateScript(script, 'comment')
    expect(result.errors.find(e => e.code === 'CTA_MISMATCH_COMMENT')).toBeUndefined()
  })
})

describe('ScriptValidator - 任意要素の扱い', () => {
  const createValidScript = (): Script => ({
    hook: 'この動画を見れば、あなたも明日から変われます。たった3分で人生が変わる方法、知りたくないですか？',
    body: '実は多くの人が間違った方法で努力しています。正しい方法は非常にシンプルです。' +
          '毎日たった5分でいいんです。朝起きたら最初にやること、それは自分の目標を声に出すこと。' +
          'これを続けるだけで、脳が自然と目標達成モードになります。',
    cta: 'この動画が参考になったらいいねボタンを押してください。',
  })

  it('context が存在しても、存在しなくても構造エラーにならない', () => {
    const withContext = { ...createValidScript(), context: '忙しいビジネスマンの皆さんへ。' }
    const withoutContext = createValidScript()

    const resultWith = validateScript(withContext, 'like')
    const resultWithout = validateScript(withoutContext, 'like')

    expect(resultWith.errors.find(e => e.code === 'MISSING_CONTEXT')).toBeUndefined()
    expect(resultWithout.errors.find(e => e.code === 'MISSING_CONTEXT')).toBeUndefined()
  })

  it('proof が存在しても、存在しなくても構造エラーにならない', () => {
    const withProof = { ...createValidScript(), proof: '実際に私も3ヶ月で結果が出ました。' }
    const withoutProof = createValidScript()

    const resultWith = validateScript(withProof, 'like')
    const resultWithout = validateScript(withoutProof, 'like')

    expect(resultWith.errors.find(e => e.code === 'MISSING_PROOF')).toBeUndefined()
    expect(resultWithout.errors.find(e => e.code === 'MISSING_PROOF')).toBeUndefined()
  })

  it('transition が存在しても、存在しなくても構造エラーにならない', () => {
    const withTransition = { ...createValidScript(), transition: 'ここからが重要です。' }
    const withoutTransition = createValidScript()

    const resultWith = validateScript(withTransition, 'like')
    const resultWithout = validateScript(withoutTransition, 'like')

    expect(resultWith.errors.find(e => e.code === 'MISSING_TRANSITION')).toBeUndefined()
    expect(resultWithout.errors.find(e => e.code === 'MISSING_TRANSITION')).toBeUndefined()
  })

  it('任意要素に絵文字が含まれている場合も CONTAINS_EMOJI エラーを返す', () => {
    const withEmojiContext = { ...createValidScript(), context: '皆さんへ✨' }
    const result = validateScript(withEmojiContext, 'like')
    expect(result.errors).toContainEqual({
      code: 'CONTAINS_EMOJI',
      message: expect.any(String),
    })
  })

  it('任意要素も文字数カウントに含まれる', () => {
    // 必須要素だけだと300文字ギリギリの台本
    const baseScript: Script = {
      hook: 'この動画を見れば変われます。',
      body: '実は正しい方法は簡単です。毎日5分でいいんです。' +
            '朝起きたら目標を声に出すこと。これを続けるだけです。',
      cta: 'いいねお願いします。',
    }

    // 任意要素を追加して450文字を超える台本
    const longScript: Script = {
      ...baseScript,
      context: 'これは非常に長いコンテキストです。'.repeat(10),
      proof: 'これは非常に長い根拠です。'.repeat(10),
      transition: 'これは非常に長いトランジションです。'.repeat(5),
    }

    const result = validateScript(longScript, 'like')
    expect(result.errors.find(e => e.code === 'TOO_LONG')).toBeDefined()
  })
})

describe('ScriptValidator - 完全に有効な台本', () => {
  it('すべての条件を満たす台本は valid: true を返す', () => {
    // 約280文字の台本（250〜400文字の範囲内）
    const script: Script = {
      hook: 'この動画を見れば、あなたも明日から変われます。たった3分で人生が変わる方法、知りたくないですか？今日から実践できる簡単な内容です。',
      body: '実は多くの人が間違った方法で努力しています。正しい方法は非常にシンプルです。' +
            '毎日たった5分でいいんです。朝起きたら最初にやること、それは自分の目標を声に出すこと。' +
            'これを続けるだけで、脳が自然と目標達成モードになります。科学的にも証明されています。' +
            'この習慣を3週間続ければ、驚くほど変化を実感できますよ。',
      cta: 'この動画が参考になったらいいねボタンを押してください。チャンネル登録もお待ちしています。',
    }
    const result = validateScript(script, 'like')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
