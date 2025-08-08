import { json } from '@sveltejs/kit';
import { loginSchema } from '$lib/validations/auth';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url, cookies }) => {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedFields = loginSchema.safeParse(body);
    if (!validatedFields.success) {
      return json(
        { error: 'Invalid input', details: validatedFields.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = validatedFields.data;
    console.log('🔐 [login API] Attempting login for:', email);

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || !user.hashedPassword) {
      return json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return json(
        { error: 'Please verify your email before signing in. Check your inbox for the verification code.' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
    
    if (!isPasswordValid) {
      return json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('✅ [login API] Login successful for:', email);
    
    // For now, return success - session management will be handled by Auth.js
    // In a real implementation, you would create a session here
    return json(
      { 
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ [login API] Login error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
