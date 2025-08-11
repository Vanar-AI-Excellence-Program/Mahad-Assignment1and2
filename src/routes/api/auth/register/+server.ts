import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users, userProfiles } from '$lib/db/schema';
import { registerSchema } from '$lib/validations/auth';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { createOTP } from '$lib/utils/token';
import { sendVerificationEmail } from '$lib/utils/email';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedFields = registerSchema.safeParse(body);
    if (!validatedFields.success) {
      return json(
        { error: 'Invalid input', details: validatedFields.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, bio } = validatedFields.data;

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password with 12 salt rounds
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with email verification disabled initially
    const newUser = await db.insert(users).values({
      email,
      hashedPassword,
      emailVerified: false, // Email verification required
    }).returning();

    // Create user profile
    await db.insert(userProfiles).values({
      userId: newUser[0].id,
      firstName,
      lastName,
      bio: bio || null,
    });

    // Generate OTP and send verification email
    try {
      const otp = await createOTP(email);
      const emailSent = await sendVerificationEmail(email, otp);
      
      return json(
        { 
          message: 'User registered successfully. Please check your email for the verification code.',
          user: {
            id: newUser[0].id,
            email: newUser[0].email,
            emailVerified: newUser[0].emailVerified,
          },
          verificationEmailSent: emailSent
        },
        { status: 201 }
      );
    } catch (emailError) {
      console.error('Email verification error:', emailError);
      
      // Still return success but note that verification email failed
      return json(
        { 
          message: 'User registered successfully, but verification email could not be sent. Please contact support.',
          user: {
            id: newUser[0].id,
            email: newUser[0].email,
            emailVerified: newUser[0].emailVerified,
          },
          verificationEmailSent: false
        },
        { status: 201 }
      );
    }

  } catch (error) {
    console.error('Registration error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};