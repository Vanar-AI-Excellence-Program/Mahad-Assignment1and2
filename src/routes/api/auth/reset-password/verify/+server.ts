import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { verificationTokens } from '$lib/db/schema';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    // Get token from query parameter
    const token = url.searchParams.get('token');
    
    if (!token) {
      return json({ error: 'Missing reset token' }, { status: 400 });
    }
    
    // Verify the token exists and is valid without consuming it
    const result = await db.query.verificationTokens.findFirst({
      where: and(
        eq(verificationTokens.token, token),
        eq(verificationTokens.type, 'password-reset'),
        // Check if token is not expired
        // @ts-ignore - TypeScript doesn't recognize the comparison operator for timestamp
        verificationTokens.expires > new Date()
      ),
    });
    
    if (!result) {
      return json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }
    
    return json({ valid: true });
    
  } catch (error) {
    console.error('Reset token verification error:', error);
    return json({ error: 'Failed to verify reset token' }, { status: 500 });
  }
};