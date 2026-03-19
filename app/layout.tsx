import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import DynamicHead from '@/components/DynamicHead'
import { SpeedInsights } from '@vercel/speed-insights/next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Website Order - Pesan Jasa Pembuatan Website',
  description: 'Platform pemesanan jasa pembuatan website profesional',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <DynamicHead />
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
