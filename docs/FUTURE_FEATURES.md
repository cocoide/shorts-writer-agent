# 将来実装予定の機能

## YouTube動画の台本抽出（音声→テキスト）

現状の参考動画機能はタイトルからの推測のみ。
実際の内容を取得するには以下のフローが必要：

```
YouTube動画
   ↓
音声ダウンロード（非公式 or 自前処理）
   ↓
Whisper API / Speech-to-Text API
   ↓
テキスト（原稿）
   ↓
ChatGPT APIで台本化・再構成
```

### 音声→文字変換API候補

| API | 特徴 |
|-----|------|
| OpenAI Whisper API | 高精度、多言語対応 |
| Google Speech-to-Text | GCP連携、リアルタイム対応 |
| AWS Transcribe | AWS連携、話者識別 |

### 実装時の注意点

- YouTube音声ダウンロードは利用規約違反の可能性
- yt-dlp等の非公式ツールに依存
- 字幕API（YouTube Data API）で字幕取得が可能な動画もある

### 優先度

低（現状はタイトル分析で十分なMVP）
