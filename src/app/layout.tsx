import type { Metadata } from 'next'
import './globals.css'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import SessionProvider from '@/components/SessionProvider'
import Navbar from '@/components/Navbar'
import LoadingScreen from '@/components/LoadingScreen'

export const metadata: Metadata = {
  title: 'ApexWager — Live Sports Betting',
  description: 'Premium sports betting with live odds and real-time updates. UFC, MMA and more.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <SessionProvider session={session}>
          <LoadingScreen />
          <Navbar />
          <main>{children}</main>
        </SessionProvider>
      </body>
    </html>
  )
}
