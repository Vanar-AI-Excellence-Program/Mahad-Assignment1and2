import postgres from 'postgres';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';
const client = postgres(DATABASE_URL);

async function testAuthFlow() {
  try {
    console.log('🧪 Testing Authentication Flow...\n');
    
    // 1. Check users and their status
    const users = await client`
      SELECT id, email, email_verified, hashed_password, created_at
      FROM users 
      ORDER BY created_at DESC
    `;
    
    console.log('👤 Users in database:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email Verified: ${user.email_verified}`);
      console.log(`   Has Password: ${!!user.hashed_password}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });
    
    // 2. Check if there are any active sessions (if using database sessions)
    try {
      const sessions = await client`
        SELECT id, session_token, user_id, expires
        FROM sessions 
        ORDER BY expires DESC
        LIMIT 5
      `;
      
      console.log('🔑 Active sessions:');
      if (sessions.length === 0) {
        console.log('   No active sessions found (expected for JWT strategy)');
      } else {
        sessions.forEach((session, index) => {
          console.log(`${index + 1}. User ID: ${session.user_id}`);
          console.log(`   Session ID: ${session.id}`);
          console.log(`   Expires: ${session.expires}`);
          console.log(`   Is expired: ${new Date() > new Date(session.expires)}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log('🔑 Sessions table not accessible (expected for JWT strategy)');
    }
    
    // 3. Check verification tokens
    const verificationTokens = await client`
      SELECT identifier, type, expires, created_at
      FROM verification_tokens 
      WHERE type = 'email-verification-otp'
      ORDER BY created_at DESC
      LIMIT 3
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
    
    // 4. Summary and recommendations
    console.log('📊 Authentication Flow Summary:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   Verified users: ${users.filter(u => u.email_verified).length}`);
    console.log(`   Unverified users: ${users.filter(u => !u.email_verified).length}`);
    console.log(`   Users with passwords: ${users.filter(u => u.hashed_password).length}`);
    console.log(`   Recent OTP tokens: ${verificationTokens.length}`);
    console.log('');
    
    if (users.length > 0) {
      const verifiedUser = users.find(u => u.email_verified);
      if (verifiedUser) {
        console.log('✅ Ready for testing:');
        console.log(`   Use email: ${verifiedUser.email}`);
        console.log(`   User ID: ${verifiedUser.id}`);
        console.log(`   Email verified: ${verifiedUser.email_verified}`);
      } else {
        console.log('⚠️  No verified users found:');
        console.log('   Users need to verify their email before login');
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await client.end();
  }
}

testAuthFlow();
