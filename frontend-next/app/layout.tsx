import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/components/NavBar'
import DisclaimerFooter from '@/components/DisclaimerFooter'

export const metadata: Metadata = {
  title: 'Best Friend Ashare | 最佳股友',
  description: 'China A-share stock analysis platform with K-line charts, technical indicators, and Monte Carlo simulation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen flex flex-col antialiased">
        <NavBar />
        <main className="flex-1">
          {children}
        </main>
        <DisclaimerFooter />
      </body>
    </html>
  )
}
