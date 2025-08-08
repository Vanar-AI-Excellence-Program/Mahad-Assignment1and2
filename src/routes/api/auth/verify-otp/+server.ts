import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { verifyOTP } from '$lib/utils/token';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { otp } = body;
    
    console.log('🚀 [API] OTP verification request received');
    console.log('🔢 [API] Raw OTP from frontend:', otp);
    console.log('🚀 [API] OTP length:', otp?.length);
    console.log('🚀 [API] OTP type:', typeof otp);
    
    // Input validation
    if (!otp || typeof otp !== 'string' || otp.length !== 6) {
      console.log('❌ [API] Invalid OTP format');
      return json(
        { error: 'Please provide a valid 6-digit verification code' },
        { status: 400 }
      );
    }
    
    // Verify the OTP
    console.log('🔍 [API] Calling verifyOTP function...');
    const email = await verifyOTP(otp);
    console.log('🔍 [API] Email returned from verifyOTP:', email);
    
    if (!email) {
      console.log('❌ [API] OTP verification failed - no email returned');
      return json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }
    
    console.log('✅ [API] OTP verified, updating user email verification status for:', email);
    
    // Update user's email verification status
    const updatedUser = await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.email, email))
      .returning();
    
    console.log('👤 [API] Updated user result:', updatedUser);
    
    if (!updatedUser.length) {
      console.log('❌ [API] User not found for email:', email);
      return json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ [API] Email verification completed successfully');
    console.log('✅ [API] User email_verified status:', updatedUser[0].emailVerified);
    
    return json(
      { 
        message: 'Email verified successfully',
        user: {
          id: updatedUser[0].id,
          email: updatedUser[0].email,
          emailVerified: updatedUser[0].emailVerified,
        }
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('❌ [API] OTP verification error:', error);
    return json(
      { error: 'Email verification failed' },
      { status: 500 }
    );
  }
};
