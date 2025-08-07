import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { verifyToken } from '$lib/utils/token';
import bcrypt from 'bcryptjs';
import type { RequestHandler } from './$types';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
});

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return json({ error: validation.error.flatten().formErrors.join(', ') }, { status: 400 });
    }
    
    const { token, password } = validation.data;
    
    // Verify and consume the token
    const email = await verifyToken(token, 'password-reset');
    
    if (!email) {
      return json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Update user's password
    const updatedUser = await db
      .update(users)
      .set({ hashedPassword })
      .where(eq(users.email, email))
      .returning();
    
    if (!updatedUser.length) {
      return json({ error: 'User not found' }, { status: 404 });
    }
    
    return json({ success: true });
    
  } catch (error) {
    console.error('Password reset error:', error);
    return json({ error: 'Failed to reset password' }, { status: 500 });
  }
};