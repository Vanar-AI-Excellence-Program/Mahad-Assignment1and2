import postgres from 'postgres';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';
const client = postgres(DATABASE_URL);

async function checkSessionsTable() {
  try {
    console.log('🔍 Checking sessions table structure...\n');
    
    // Check current table structure
    const columns = await client`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'sessions'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Sessions table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      if (col.column_default) {
        console.log(`    Default: ${col.column_default}`);
      }
    });
    console.log('');
    
    // Check if table has data
    const sessionCount = await client`
      SELECT COUNT(*) as count FROM sessions
    `;
    console.log(`📊 Sessions count: ${sessionCount[0].count}`);
    
    if (sessionCount[0].count > 0) {
      const sampleSessions = await client`
        SELECT * FROM sessions LIMIT 3
      `;
      console.log('\n📋 Sample sessions:');
      sampleSessions.forEach((session, index) => {
        console.log(`${index + 1}. ID: ${session.id}`);
        console.log(`   User ID: ${session.user_id}`);
        console.log(`   Session Token: ${session.session_token || 'NULL'}`);
        console.log(`   Expires: ${session.expires || 'NULL'}`);
        console.log(`   Expires At: ${session.expires_at || 'NULL'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

checkSessionsTable();
