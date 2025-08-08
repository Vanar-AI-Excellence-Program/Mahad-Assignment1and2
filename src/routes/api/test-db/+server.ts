import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const email = url.searchParams.get('email');
    
    if (!email) {
      return json({ error: 'Email parameter required' }, { status: 400 });
    }

    console.log('🔍 Testing database lookup for email:', email);
    
    // Test database connection and user lookup
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    console.log('👤 Database lookup result:', user ? { id: user.id, email: user.email, emailVerified: user.emailVerified } : 'No user found');

    return json({
      success: true,
      user: user ? {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        hasPassword: !!user.hashedPassword
      } : null
    });
    
  } catch (error) {
    console.error('❌ Database test error:', error);
    return json({ error: 'Database test failed', details: error }, { status: 500 });
  }
};
