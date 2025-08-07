import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { userProfiles, users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const profileUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  bio: z.string().max(500).optional(),
});

export const POST: RequestHandler = async ({ request, locals }) => {
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
    const body = await request.json();
    
    // Validate request body
    const validation = profileUpdateSchema.safeParse(body);
    if (!validation.success) {
      return json({ error: validation.error.flatten().formErrors.join(', ') }, { status: 400 });
    }
    
    const { firstName, lastName, bio } = validation.data;
    
    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!existingUser) {
      return json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if profile exists
    const existingProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId)
    });
    
    if (existingProfile) {
      // Update existing profile
      const updatedProfile = await db
        .update(userProfiles)
        .set({
          firstName,
          lastName,
          bio: bio || existingProfile.bio,
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, userId))
        .returning();
      
      return json({
        success: true,
        profile: updatedProfile[0]
      });
    } else {
      // Create new profile
      const newProfile = await db
        .insert(userProfiles)
        .values({
          userId,
          firstName,
          lastName,
          bio: bio || null
        })
        .returning();
      
      return json({
        success: true,
        profile: newProfile[0]
      });
    }
    
  } catch (error) {
    console.error('Profile update error:', error);
    return json({ error: 'Failed to update profile' }, { status: 500 });
  }
};