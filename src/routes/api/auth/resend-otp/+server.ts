import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { createOTP } from '$lib/utils/token';
import { sendVerificationEmail } from '$lib/utils/email';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Check if user exists and is not already verified
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    
    if (!user) {
      return json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    if (user.emailVerified) {
      return json(
        { error: 'Email is already verified' },
        { status: 400 }
      );
    }
    
    // Generate new OTP and send email
    try {
      const otp = await createOTP(email);
      const emailSent = await sendVerificationEmail(email, otp);
      
      if (emailSent) {
        return json(
          { message: 'Verification code sent successfully' },
          { status: 200 }
        );
      } else {
        return json(
          { error: 'Failed to send verification email' },
          { status: 500 }
        );
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
