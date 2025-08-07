import crypto from 'crypto';
import { db } from '$lib/db';
import { verificationTokens } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';

// Generate a random token
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
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

// Verify a token and return the identifier if valid
export async function verifyToken(token: string, type?: string): Promise<string | null> {
  try {
    // Build the where clause
    let whereClause = and(
      eq(verificationTokens.token, token),
      // Check if token is not expired
      // @ts-ignore - TypeScript doesn't recognize the comparison operator for timestamp
      verificationTokens.expires > new Date()
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