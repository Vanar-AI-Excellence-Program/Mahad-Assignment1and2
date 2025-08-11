import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users, userProfiles, sessions } from '$lib/db/schema';
import { profileUpdateSchema } from '$lib/validations/auth';
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
    
    // Get user profile
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });
    
    return json(
      { profile },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Get profile error:', error);
    return json(
      { error: 'Failed to get profile' },
      { status: 500 }
    );
  }
};

export const PUT: RequestHandler = async ({ request, cookies }) => {
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
    const body = await request.json();
    
    // Validate input
    const validatedFields = profileUpdateSchema.safeParse(body);
    if (!validatedFields.success) {
      return json(
        { error: 'Invalid input', details: validatedFields.error.flatten() },
        { status: 400 }
      );
    }
    
    const { firstName, lastName, bio } = validatedFields.data;
    
    // Update or create profile
    const existingProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });
    
    let updatedProfile;
    
    if (existingProfile) {
      // Update existing profile
      updatedProfile = await db
        .update(userProfiles)
        .set({
          firstName,
          lastName,
          bio,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, userId))
        .returning();
    } else {
      // Create new profile
      updatedProfile = await db
        .insert(userProfiles)
        .values({
          userId: userId,
          firstName,
          lastName,
          bio,
        })
        .returning();
    }
    
    return json(
      { 
        message: 'Profile updated successfully',
        profile: updatedProfile[0]
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Update profile error:', error);
    return json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
};
