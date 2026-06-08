import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { getSiteOrigin } from '@/lib/site-url'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: 'Clarifi — Join the Waitlist',
  description: 'The undetectable AI co-pilot for meetings. Launching August 24.',
  icons: {
    icon: [{ url: '/clarifi-logo.png', type: 'image/png' }],
    apple: [{ url: '/clarifi-logo.png', type: 'image/png' }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
