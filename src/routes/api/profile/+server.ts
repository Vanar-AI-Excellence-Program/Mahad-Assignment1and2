import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { userProfiles, users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    // Check if user is authenticated
    const session = await locals.getSession();
    if (!session?.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
if (!userId) {
  return json({ error: 'User ID is undefined' }, { status: 400 });
}
    
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