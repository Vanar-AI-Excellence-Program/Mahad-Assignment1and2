import { SvelteKitAuth } from '@auth/sveltekit';
import Credentials from '@auth/core/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import bcrypt from 'bcryptjs';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { loginSchema } from '$lib/validations/auth';
import { eq } from 'drizzle-orm';
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
      async authorize(credentials) {
        try {
          console.log('🔐 [authorize] Starting authorization for credentials');
          
          // Validate input
          const validatedFields = loginSchema.safeParse(credentials);
          if (!validatedFields.success) {
            console.log('❌ [authorize] Invalid credentials format');
            return null;
          }

          const { email, password } = validatedFields.data;
          console.log('🔐 [authorize] Validating user:', email);

          // Find user by email
          const user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (!user || !user.hashedPassword) {
            console.log('❌ [authorize] User not found or no password');
            return null;
          }

          console.log('🔐 [authorize] User found, checking email verification:', user.emailVerified);

          // Check if email is verified
          if (!user.emailVerified) {
            console.log('❌ [authorize] Email not verified');
            throw new Error('Please verify your email before signing in. Check your inbox for the verification code.');
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
          console.log('🔐 [authorize] Password validation result:', isPasswordValid);
          
          if (!isPasswordValid) {
            console.log('❌ [authorize] Invalid password');
            return null;
          }

          console.log('✅ [authorize] Authorization successful for:', email);
          return {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
          };
        } catch (error) {
          console.error('❌ [authorize] Authorization error:', error);
          // Re-throw the error so Auth.js can handle it properly
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.emailVerified = (user as any).emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        (session.user as any).emailVerified = token.emailVerified as boolean;
      }
      return session;
    },
  },
  secret: env.AUTH_SECRET,
  trustHost: true,
}); 