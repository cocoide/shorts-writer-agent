import { describe, it, expect } from 'vitest'
import { PromptBuilder } from '@/lib/prompt-builder'
import type { CtaPurpose } from '@/lib/types/script'

describe('PromptBuilder', () => {
  describe('基本構造', () => {
    it('生成されるプロンプトにトピックが含まれる', () => {
      const builder = new PromptBuilder()
      const prompt = builder.build({
        topic: 'プログラミング学習',
        ctaPurpose: 'like',
      })

      expect(prompt).toContain('プログラミング学習')
    })

    it('必須セクション（hook, body, cta）を明示的に指示する', () => {
      const builder = new PromptBuilder()
      const prompt = builder.build({
        topic: 'テスト',
        ctaPurpose: 'like',
      })

      expect(prompt).toContain('hook')
      expect(prompt).toContain('body')
      expect(prompt).toContain('cta')
    })

    it('出力形式としてJSONを指定する', () => {
      const builder = new PromptBuilder()
      const prompt = builder.build({
        topic: 'テスト',
        ctaPurpose: 'like',
      })

      expect(prompt).toContain('JSON')
    })
  })

  describe('CTA目的別のプロンプト', () => {
    it('CTA目的がlongVideoの場合、長尺動画への誘導を指示する', () => {
      const builder = new PromptBuilder()
      const prompt = builder.build({
        topic: 'テスト',
        ctaPurpose: 'longVideo',
      })

      expect(prompt).toMatch(/長尺|本編|フル/)
    })

    it('CTA目的がlikeの場合、高評価を促す指示が含まれる', () => {
      const builder = new PromptBuilder()
      const prompt = builder.build({
        topic: 'テスト',
        ctaPurpose: 'like',
      })

      expect(prompt).toMatch(/いいね|高評価|グッド/)
    })

    it('CTA目的がcommentの場合、コメントを促す指示が含まれる', () => {
      const builder = new PromptBuilder()
      const prompt = builder.build({
        topic: 'テスト',
        ctaPurpose: 'comment',
      })

      expect(prompt).toMatch(/コメント|感想|教えて/)
    })
  })

  describe('制約の明示', () => {
    it('絵文字を使用しないことを指示する', () => {
      const builder = new PromptBuilder()
      const prompt = builder.build({
        topic: 'テスト',
        ctaPurpose: 'like',
      })

      expect(prompt).toMatch(/絵文字.*(使用しない|禁止|含めない)/)
    })

    it('文字数の目安を指示する', () => {
      const builder = new PromptBuilder()
      const prompt = builder.build({
        topic: 'テスト',
        ctaPurpose: 'like',
      })

      expect(prompt).toMatch(/250|400|文字/)
    })
  })

  describe('任意セクション', () => {
    it('context, proof, transitionを任意項目として言及する', () => {
      const builder = new PromptBuilder()
      const prompt = builder.build({
        topic: 'テスト',
        ctaPurpose: 'like',
      })

      // 任意セクションについて言及があること
      expect(prompt).toMatch(/context|proof|transition/)
    })
  })
})
