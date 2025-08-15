import postgres from 'postgres';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';
const client = postgres(DATABASE_URL);

async function testCustomLogin() {
  try {
    console.log('🧪 Testing Custom Login Flow...\n');
    
    // 1. Check sessions table structure
    const columns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'sessions'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Sessions table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    console.log('');
    
    // 2. Check current sessions
    const sessionCount = await client`
      SELECT COUNT(*) as count FROM sessions
    `;
    console.log(`📊 Current sessions count: ${sessionCount[0].count}`);
    
    if (sessionCount[0].count > 0) {
      const activeSessions = await client`
        SELECT s.id, s.session_token, s.user_id, s.expires, u.email
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.expires DESC
        LIMIT 3
      `;
      
      console.log('\n📋 Active sessions:');
      activeSessions.forEach((session, index) => {
        console.log(`${index + 1}. Session ID: ${session.id}`);
        console.log(`   User: ${session.email}`);
        console.log(`   User ID: ${session.user_id}`);
        console.log(`   Expires: ${session.expires}`);
        console.log(`   Is expired: ${new Date() > new Date(session.expires)}`);
        console.log('');
      });
    }
    
    // 3. Check users table
    const users = await client`
      SELECT id, email, email_verified, created_at
      FROM users 
      ORDER BY created_at DESC
      LIMIT 3
    `;
    
    console.log('👤 Available users for testing:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email Verified: ${user.email_verified}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });
    
    // 4. Test session creation simulation
    if (users.length > 0) {
      console.log('🧪 Testing session creation simulation...');
      try {
        const testSession = await client`
          INSERT INTO sessions (id, session_token, user_id, expires)
          VALUES (
            'test-session-' || gen_random_uuid()::text,
            'test-token-' || gen_random_uuid()::text,
            '${users[0].id}',
            NOW() + INTERVAL '30 days'
          )
          RETURNING *
        `;
        
        console.log('✅ Test session created successfully');
        console.log(`   Session ID: ${testSession[0].id}`);
        console.log(`   User ID: ${testSession[0].user_id}`);
        console.log(`   Expires: ${testSession[0].expires}`);
        
        // Clean up test session
        await client`DELETE FROM sessions WHERE id = '${testSession[0].id}'`;
        console.log('✅ Test session cleaned up');
        
      } catch (error) {
        console.log('❌ Session creation test failed:', error.message);
      }
    }
    
    // 5. Summary
    console.log('📊 Custom Login Flow Summary:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   Verified users: ${users.filter(u => u.email_verified).length}`);
    console.log(`   Active sessions: ${sessionCount[0].count}`);
    console.log(`   Sessions table ready: ${columns.length >= 4 ? '✅' : '❌'}`);
    
    if (users.length > 0) {
      const verifiedUser = users.find(u => u.email_verified);
      if (verifiedUser) {
        console.log('\n✅ Ready for testing:');
        console.log(`   Use email: ${verifiedUser.email}`);
        console.log(`   User ID: ${verifiedUser.id}`);
        console.log(`   Email verified: ${verifiedUser.email_verified}`);
        console.log('\n🎯 Test the custom login flow:');
        console.log('   1. Go to /login');
        console.log('   2. Enter credentials');
        console.log('   3. Check database for new session');
        console.log('   4. Verify dashboard access');
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await client.end();
  }
}

testCustomLogin();
