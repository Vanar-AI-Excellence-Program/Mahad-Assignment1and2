import postgres from 'postgres';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';
const client = postgres(DATABASE_URL);

async function testDatabaseSessions() {
  try {
    console.log('🧪 Testing Database Sessions Setup...\n');
    
    // 1. Check sessions table structure
    const columns = await client`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'sessions'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Sessions table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      if (col.column_default) {
        console.log(`    Default: ${col.column_default}`);
      }
    });
    console.log('');
    
    // 2. Check if sessions table is empty (should be for new setup)
    const sessionCount = await client`
      SELECT COUNT(*) as count FROM sessions
    `;
    console.log(`📊 Current sessions count: ${sessionCount[0].count}`);
    
    // 3. Check users table
    const users = await client`
      SELECT id, email, email_verified, created_at
      FROM users 
      ORDER BY created_at DESC
      LIMIT 3
    `;
    
    console.log('\n👤 Available users for testing:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email Verified: ${user.email_verified}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });
    
    // 4. Verify Auth.js requirements
    console.log('🔍 Auth.js Database Sessions Requirements:');
    const requiredColumns = ['id', 'session_token', 'user_id', 'expires'];
    const missingColumns = requiredColumns.filter(col => 
      !columns.some(c => c.column_name === col)
    );
    
    if (missingColumns.length === 0) {
      console.log('✅ All required columns present');
      console.log('✅ Sessions table ready for Auth.js database sessions');
    } else {
      console.log('❌ Missing required columns:', missingColumns);
    }
    
    // 5. Test data insertion (simulate session creation)
    console.log('\n🧪 Testing session creation simulation...');
    try {
      const testSession = await client`
        INSERT INTO sessions (id, session_token, user_id, expires)
        VALUES (
          'test-session-id',
          'test-session-token-' || gen_random_uuid()::text,
          '${users[0]?.id || '00000000-0000-0000-0000-000000000000'}',
          NOW() + INTERVAL '30 days'
        )
        RETURNING *
      `;
      
      console.log('✅ Test session created successfully');
      console.log(`   Session ID: ${testSession[0].id}`);
      console.log(`   User ID: ${testSession[0].user_id}`);
      console.log(`   Expires: ${testSession[0].expires}`);
      
      // Clean up test session
      await client`DELETE FROM sessions WHERE id = 'test-session-id'`;
      console.log('✅ Test session cleaned up');
      
    } catch (error) {
      console.log('❌ Session creation test failed:', error.message);
    }
    
    console.log('\n🎯 Database sessions setup is ready for testing!');
    console.log('   Start the dev server and try logging in to create real sessions.');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await client.end();
  }
}

testDatabaseSessions();
