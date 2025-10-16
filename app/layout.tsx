import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QuestionnaireProvider } from '@/components/QuestionnaireProvider'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fractional Ops - Client Onboarding',
  description: 'Streamlined client onboarding for Fractional Ops revenue services',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: ['/icon.svg'],
    apple: ['/icon.svg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QuestionnaireProvider>
          <div className="min-h-screen bg-gradient-to-br from-fo-light to-white">
            {children}
          </div>
          <Toaster position="top-right" />
        </QuestionnaireProvider>
      </body>
    </html>
  )
}
