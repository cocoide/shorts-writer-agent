import { describe, it, expect } from 'vitest'
import { ScriptGenerator } from '@/lib/use-case/script-generator'
import { FakeLLM } from '@/lib/llm/fake-llm'
import type { Script, ScriptGenerationRequest } from '@/lib/types/script'

describe('ScriptGenerator UseCase', () => {
  describe('正常系', () => {
    it('有効な台本を生成して返す', async () => {
      // バリデーションを通過する台本（250〜400文字）
      const validScript: Script = {
        hook: 'これを知らないと損をします。今日お伝えする内容は、多くの人が見落としている重要なポイントです。ぜひ最後までご覧ください。',
        body:
          '実は成功している人たちには共通点があります。それは毎日の小さな習慣を大切にしていること。' +
          '具体的には、朝起きたら最初に今日の目標を3つ書き出す。これだけで1日の生産性が劇的に変わります。' +
          '科学的な研究でも、目標を書き出す人はそうでない人と比べて達成率が42%も高いことがわかっています。' +
          '私自身も3年間この習慣を続けていますが、本当に効果を実感しています。',
        cta: 'この方法を試してみたいと思ったらいいねボタンを押してください。他にも役立つ情報を発信しています。',
      }

      const fakeLLM = new FakeLLM(validScript)
      const generator = new ScriptGenerator(fakeLLM)

      const request: ScriptGenerationRequest = {
        topic: '生産性向上',
        ctaPurpose: 'like',
      }

      const result = await generator.generate(request)

      expect(result.success).toBe(true)
      expect(result.script).toEqual(validScript)
      expect(result.errors).toBeUndefined()
    })
  })

  describe('バリデーション失敗', () => {
    it('hookが欠けている台本はエラーを返す', async () => {
      const invalidScript: Script = {
        hook: '', // 空
        body: 'テストボディ'.repeat(20),
        cta: 'いいねボタンを押してください',
      }

      const fakeLLM = new FakeLLM(invalidScript)
      const generator = new ScriptGenerator(fakeLLM)

      const result = await generator.generate({
        topic: 'テスト',
        ctaPurpose: 'like',
      })

      expect(result.success).toBe(false)
      expect(result.script).toBeUndefined()
      expect(result.errors).toBeDefined()
      expect(result.errors?.some((e) => e.code === 'MISSING_HOOK')).toBe(true)
    })

    it('絵文字を含む台本はエラーを返す', async () => {
      const invalidScript: Script = {
        hook: 'これはテストです😊',
        body: 'テストボディ'.repeat(20),
        cta: 'いいねボタンを押してください',
      }

      const fakeLLM = new FakeLLM(invalidScript)
      const generator = new ScriptGenerator(fakeLLM)

      const result = await generator.generate({
        topic: 'テスト',
        ctaPurpose: 'like',
      })

      expect(result.success).toBe(false)
      expect(result.errors?.some((e) => e.code === 'CONTAINS_EMOJI')).toBe(true)
    })

    it('CTA目的と不一致の台本はエラーを返す', async () => {
      const invalidScript: Script = {
        hook: 'これはテストです。重要な情報をお伝えします。',
        body: 'テストボディ'.repeat(20),
        cta: 'チャンネル登録お願いします', // likeキーワードがない
      }

      const fakeLLM = new FakeLLM(invalidScript)
      const generator = new ScriptGenerator(fakeLLM)

      const result = await generator.generate({
        topic: 'テスト',
        ctaPurpose: 'like',
      })

      expect(result.success).toBe(false)
      expect(result.errors?.some((e) => e.code === 'CTA_MISMATCH_LIKE')).toBe(
        true
      )
    })

    it('文字数が少なすぎる台本はエラーを返す', async () => {
      const invalidScript: Script = {
        hook: '短い',
        body: '短い',
        cta: 'いいね',
      }

      const fakeLLM = new FakeLLM(invalidScript)
      const generator = new ScriptGenerator(fakeLLM)

      const result = await generator.generate({
        topic: 'テスト',
        ctaPurpose: 'like',
      })

      expect(result.success).toBe(false)
      expect(result.errors?.some((e) => e.code === 'TOO_SHORT')).toBe(true)
    })
  })

  describe('LLMエラー', () => {
    it('LLMがエラーを返した場合はエラーを返す', async () => {
      const fakeLLM = new FakeLLM(undefined, 'LLM接続エラー')
      const generator = new ScriptGenerator(fakeLLM)

      const result = await generator.generate({
        topic: 'テスト',
        ctaPurpose: 'like',
      })

      expect(result.success).toBe(false)
      expect(result.llmError).toBe('LLM接続エラー')
    })
  })
})
