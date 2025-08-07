import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createVerificationToken } from '$lib/utils/token';
import { sendPasswordResetEmail } from '$lib/utils/email';
import type { RequestHandler } from './$types';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return json({ error: 'Invalid email address' }, { status: 400 });
    }
    
    const { email } = validation.data;
    
    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    
    // For security reasons, always return success even if user doesn't exist
    // This prevents user enumeration attacks
    if (!existingUser) {
      return json({ success: true });
    }
    
    // Generate password reset token
    const token = await createVerificationToken(email, 'password-reset', 60 * 60 * 24); // 24 hours expiry
    
    // Send password reset email
    await sendPasswordResetEmail(email, token);
    
    return json({ success: true });
    
  } catch (error) {
    console.error('Password reset request error:', error);
    return json({ error: 'Failed to process password reset request' }, { status: 500 });
  }
};