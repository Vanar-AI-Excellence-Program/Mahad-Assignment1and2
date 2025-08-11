import postgres from 'postgres';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://authflow_user:password@localhost:5432/authflow';
const client = postgres(DATABASE_URL);

async function quickCheckSchema() {
  try {
    console.log('🔍 Quick schema check...\n');
    
    // Check if sessions table exists and has correct structure
    const sessionsColumns = await client`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sessions'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Sessions table columns:');
    sessionsColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check if users table has data
    const userCount = await client`
      SELECT COUNT(*) as count FROM users
    `;
    console.log(`\n👤 Users count: ${userCount[0].count}`);
    
    if (userCount[0].count > 0) {
      const sampleUser = await client`
        SELECT id, email, email_verified FROM users LIMIT 1
      `;
      console.log(`Sample user: ${sampleUser[0].email} (ID: ${sampleUser[0].id})`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

quickCheckSchema();
