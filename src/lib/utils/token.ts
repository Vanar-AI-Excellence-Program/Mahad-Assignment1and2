import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '$lib/db';
import { verificationTokens } from '$lib/db/schema';
import { eq, and, gt, desc } from 'drizzle-orm';

// Generate a random token
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Generate a 6-digit OTP code
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create a verification token for email verification or password reset
export async function createVerificationToken(
  identifier: string,
  type: string = 'email-verification',
  expiresInSeconds: number = 86400 // 24 hours by default
): Promise<string> {
  // Generate a random token
  const token = generateToken();
  
  // Calculate expiration date
  const expires = new Date();
  expires.setSeconds(expires.getSeconds() + expiresInSeconds);
  
  // Store token in database
  await db.insert(verificationTokens).values({
    identifier,
    token,
    expires,
    type
  });
  
  return token;
}

// Create an OTP for email verification
export async function createOTP(
  identifier: string,
  expiresInSeconds: number = 600 // 10 minutes for OTP
): Promise<string> {
  console.log('🔧 [createOTP] Starting OTP creation for:', identifier);
  
  // Generate a 6-digit OTP
  const otp = generateOTP();
  console.log('🔧 [createOTP] Generated OTP:', otp);
  
  // Calculate expiration date with proper milliseconds
  const expires = new Date(Date.now() + (expiresInSeconds * 1000));
  console.log('🔧 [createOTP] Expires at:', expires.toISOString());
  
  // Hash OTP using bcrypt for security (10 salt rounds)
  const hashedOTP = await bcrypt.hash(otp, 10);
  console.log('🔐 [createOTP] Hashed OTP stored in DB');
  
  // Store OTP in database
  await db.insert(verificationTokens).values({
    identifier,
    token: hashedOTP,
    expires,
    type: 'email-verification-otp'
  });
  
  console.log('🔧 [createOTP] OTP stored successfully in database');
  return otp; // Return the plain OTP for email
}

// Verify an OTP and return the identifier if valid
export async function verifyOTP(otp: string): Promise<string | null> {
  try {
    console.log('🔍 [verifyOTP] Starting OTP verification for:', otp);
    
    // Step 1: Find the latest OTP for this type
    const allOTPTokens = await db.query.verificationTokens.findMany({
      where: eq(verificationTokens.type, 'email-verification-otp'),
      orderBy: [desc(verificationTokens.createdAt)],
      limit: 10 // Get last 10 for debugging
    });
    
    console.log('🔍 [verifyOTP] Found', allOTPTokens.length, 'OTP tokens in database');
    
    if (allOTPTokens.length === 0) {
      console.log('❌ [verifyOTP] No OTP tokens found in database');
      return null;
    }
    
    // Step 2: Check each OTP for validity (latest first)
    for (const tokenRecord of allOTPTokens) {
      console.log('🔍 [verifyOTP] Checking token for:', tokenRecord.identifier);
      console.log('🔍 [verifyOTP] Token expires at:', tokenRecord.expires.toISOString());
      console.log('🔍 [verifyOTP] Current time:', new Date().toISOString());
      
      // Check if token is expired
      const isExpired = new Date() > tokenRecord.expires;
      console.log('🔍 [verifyOTP] Is expired:', isExpired);
      
      if (isExpired) {
        console.log('⏰ [verifyOTP] Token is expired, skipping');
        continue;
      }
      
      // Compare OTP using bcrypt
      const isMatch = await bcrypt.compare(otp, tokenRecord.token);
      console.log('🔐 [verifyOTP] bcrypt.compare result:', isMatch);
      
      if (isMatch) {
        console.log('✅ [verifyOTP] OTP matched! Deleting token...');
        
        // Delete the OTP to prevent reuse
        await db.delete(verificationTokens).where(
          and(
            eq(verificationTokens.identifier, tokenRecord.identifier),
            eq(verificationTokens.token, tokenRecord.token)
          )
        );
        
        console.log('✅ [verifyOTP] OTP verified successfully for:', tokenRecord.identifier);
        return tokenRecord.identifier;
      } else {
        console.log('❌ [verifyOTP] OTP did not match for this token');
      }
    }
    
    console.log('❌ [verifyOTP] No valid OTP found');
    return null;
    
  } catch (error) {
    console.error('❌ [verifyOTP] OTP verification error:', error);
    return null;
  }
}

// Verify a token and return the identifier if valid
export async function verifyToken(token: string, type?: string): Promise<string | null> {
  try {
    // Build the where clause
    let whereClause = and(
      eq(verificationTokens.token, token),
      gt(verificationTokens.expires, new Date()) // Use gt() for proper timestamp comparison
    );
    
    // Add type check if provided
    if (type) {
      whereClause = and(whereClause, eq(verificationTokens.type, type));
    }
    
    // Find the token in the database
    const result = await db.query.verificationTokens.findFirst({
      where: whereClause
    });
    
    if (!result) {
      return null;
    }
    
    // Delete the token to prevent reuse
    await db.delete(verificationTokens).where(
      and(
        eq(verificationTokens.identifier, result.identifier),
        eq(verificationTokens.token, token)
      )
    );
    
    return result.identifier;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}