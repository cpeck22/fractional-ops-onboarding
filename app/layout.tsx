import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import { QuestionnaireProvider } from '@/components/QuestionnaireProvider'
import { Toaster } from 'react-hot-toast'

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins'
})

export const metadata: Metadata = {
  title: 'Fractional Ops - Client Onboarding',
  description: 'Streamlined client onboarding for Fractional Ops revenue services',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/Fractional-Ops_Symbol_Main.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: ['/icon.svg', '/Fractional-Ops_Symbol_Main.png'],
    apple: ['/Fractional-Ops_Symbol_Main.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={poppins.className}>
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
