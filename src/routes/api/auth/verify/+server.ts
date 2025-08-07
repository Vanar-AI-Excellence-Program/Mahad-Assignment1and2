import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { verifyToken } from '$lib/utils/token';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    // Get token from query parameter
    const token = url.searchParams.get('token');
    
    if (!token) {
      return json({ error: 'Missing verification token' }, { status: 400 });
    }
    
    // Verify the token
    const email = await verifyToken(token);
    
    if (!email) {
      return json({ error: 'Invalid or expired verification token' }, { status: 400 });
    }
    
    // Update user's email verification status
    const updatedUser = await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.email, email))
      .returning();
    
    if (!updatedUser.length) {
      return json({ error: 'User not found' }, { status: 404 });
    }
    
    // Redirect to login page with success message
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/auth/login?verified=true'
      }
    });
    
  } catch (error) {
    console.error('Email verification error:', error);
    return json({ error: 'Email verification failed' }, { status: 500 });
  }
};