import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Введите email и пароль")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          throw new Error("Пользователь не найден")
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error("Неверный пароль")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      } else if (token.id) {
        // Sync role from database on every request (handles role changes by admin)
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          })
          if (dbUser) {
            token.role = dbUser.role
          } else {
            // User confirmed deleted from DB — invalidate token
            // This prevents redirect loop: middleware won't treat as authenticated
            token.id = null
            token.role = null
          }
        } catch {
          // DB error (timeout, pool exhausted) — keep existing token
          // Don't invalidate on temporary failures
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token && token.id) {
        // Verify user still exists in database (handles FORCE_SEED case)
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, role: true },
          })

          if (!dbUser) {
            // User confirmed deleted — clear session fields
            // JWT callback will also clear token.id on next request
            session.user.id = ""
            session.user.role = ""
            return session
          }

          session.user.id = dbUser.id
          session.user.role = dbUser.role
        } catch {
          // DB error (timeout, connection issue) — use token values as fallback
          // This prevents redirect loop: session stays valid even if DB is temporarily down
          session.user.id = token.id as string
          session.user.role = (token.role as string) || ""
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}
