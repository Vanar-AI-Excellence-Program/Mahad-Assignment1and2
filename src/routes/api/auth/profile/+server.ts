import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users, userProfiles } from '$lib/db/schema';
import { profileUpdateSchema } from '$lib/validations/auth';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const session = await locals.getSession();
    
    if (!session?.user?.id) {
      return json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user profile
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
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

export const PUT: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.getSession();
    
    if (!session?.user?.id) {
      return json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
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
      where: eq(userProfiles.userId, session.user.id),
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
        .where(eq(userProfiles.userId, session.user.id))
        .returning();
    } else {
      // Create new profile
      updatedProfile = await db
        .insert(userProfiles)
        .values({
          userId: session.user.id,
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
