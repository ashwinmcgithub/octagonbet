import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import GithubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [GithubProvider({
          clientId: process.env.GITHUB_ID,
          clientSecret: process.env.GITHUB_SECRET,
        })]
      : []),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) return null

        const match = await bcrypt.compare(credentials.password, user.password)
        if (!match) return null

        return user
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      // Refresh balance from DB on each token refresh
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { balance: true, role: true, name: true, image: true },
        })
        if (dbUser) {
          token.balance = dbUser.balance
          token.role = dbUser.role
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.balance = token.balance as number
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      // Generate unique referral code
      const base = (user.name ?? 'USER').split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8)
      let referralCode = `${base}${Math.floor(100 + Math.random() * 900)}`
      while (await prisma.user.findUnique({ where: { referralCode } })) {
        referralCode = `${base}${Math.floor(100 + Math.random() * 900)}`
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode },
      })

      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'initial',
          amount: 1000,
          description: 'Welcome bonus — 1,000 ApexCoins to get you started!',
        },
      })
    },
  },
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
      balance: number
    }
  }
}
