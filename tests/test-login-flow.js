import postgres from 'postgres';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';

config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';
const client = postgres(DATABASE_URL);

async function testLoginFlow() {
  try {
    console.log('🧪 Testing Login Flow...\n');
    
    // 1. Check users and their verification status
    const users = await client`
      SELECT id, email, email_verified, hashed_password
      FROM users 
      ORDER BY created_at DESC
    `;
    
    console.log('👤 Users in database:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email Verified: ${user.email_verified}`);
      console.log(`   Has Password: ${!!user.hashed_password}`);
      console.log('');
    });
    
    // 2. Test password hashing
    if (users.length > 0) {
      const testUser = users[0];
      console.log('🔐 Testing password for user:', testUser.email);
      
      // Test with a known password (you'll need to know the original password)
      const testPassword = 'TestPassword123!';
      const hashedTestPassword = await bcrypt.hash(testPassword, 12);
      
      console.log('🔐 Test password hash created');
      console.log('🔐 Original hash length:', testUser.hashed_password?.length || 0);
      console.log('🔐 Test hash length:', hashedTestPassword.length);
      
      // Test bcrypt comparison
      const isMatch = await bcrypt.compare(testPassword, hashedTestPassword);
      console.log('🔐 bcrypt.compare result:', isMatch);
      console.log('');
    }
    
    // 3. Check verification tokens
    const verificationTokens = await client`
      SELECT identifier, type, expires, created_at
      FROM verification_tokens 
      WHERE type = 'email-verification-otp'
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    console.log('📋 Recent verification tokens:');
    verificationTokens.forEach((token, index) => {
      console.log(`${index + 1}. Email: ${token.identifier}`);
      console.log(`   Type: ${token.type}`);
      console.log(`   Expires: ${token.expires}`);
      console.log(`   Created: ${token.created_at}`);
      console.log(`   Is expired: ${new Date() > new Date(token.expires)}`);
      console.log('');
    });
    
    // 4. Summary
    console.log('📊 Login Flow Summary:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   Verified users: ${users.filter(u => u.email_verified).length}`);
    console.log(`   Unverified users: ${users.filter(u => !u.email_verified).length}`);
    console.log(`   Users with passwords: ${users.filter(u => u.hashed_password).length}`);
    console.log(`   Recent OTP tokens: ${verificationTokens.length}`);
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await client.end();
  }
}

testLoginFlow();
