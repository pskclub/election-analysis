import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials.password) return null;

        const user = await prisma.user.findUnique({
             where: { username: credentials.username }
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (isValid) {
            return { id: String(user.id), name: user.username }
        }
        return null;
      }
    })
  ],
  pages: {
      signIn: '/login',
  },
  session: {
      strategy: "jwt"
  },
  callbacks: {
      async session({ session, token }) {
          if(token && session.user) {
              session.user.name = token.name;
          }
          return session;
      }
  },
  secret: process.env.NEXTAUTH_SECRET || "supersecret"
}
