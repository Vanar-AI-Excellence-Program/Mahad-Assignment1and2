import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { userProfiles, users, sessions } from '$lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
  try {
    // Check if user is authenticated using custom session
    const sessionToken = cookies.get('authjs.session-token');
    if (!sessionToken) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if session exists and is valid
    const session = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.sessionToken, sessionToken),
        gt(sessions.expires, new Date())
      ),
      with: {
        user: true
      }
    });

    if (!session || !session.user) {
      return json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Get user data
    const userData = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!userData) {
      return json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get profile data if it exists
    const profileData = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId)
    });
    
    // Return combined user and profile data
    return json({
      user: userData,
      profile: profileData || {
        firstName: '',
        lastName: '',
        bio: '',
        avatar: null
      }
    });
    
  } catch (error) {
    console.error('Profile fetch error:', error);
    return json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
};