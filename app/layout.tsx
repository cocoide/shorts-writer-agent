import './globals.css'

export const metadata = {
  title: 'YouTube Shorts 台本生成',
  description: 'YouTube Shorts 向け台本を生成するAIエージェント',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
