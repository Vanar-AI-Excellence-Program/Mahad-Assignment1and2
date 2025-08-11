import { SvelteKitAuth } from '@auth/sveltekit';
import Credentials from '@auth/core/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '$lib/db';
import { env } from '$env/dynamic/private';

export const { handle, signIn, signOut } = SvelteKitAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      // This authorize function will be called by our custom login endpoint
      // It should always return null since we handle validation in our custom route
      async authorize(credentials) {
        // We don't validate here - our custom login endpoint handles that
        // This is just to satisfy Auth.js's provider requirements
        return null;
      }
    })
  ],
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login', // Custom login page
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user }) {
      if (user) {
        session.user.id = user.id;
        session.user.email = user.email;
        (session.user as any).emailVerified = user.emailVerified;
      }
      return session;
    },
  },
  secret: env.AUTH_SECRET,
  trustHost: true,
}); 