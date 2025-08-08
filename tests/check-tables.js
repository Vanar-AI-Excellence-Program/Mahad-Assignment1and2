import postgres from 'postgres';
import { config } from 'dotenv';

config();

console.log('🔍 Checking database tables...');

try {
  const sql = postgres('postgresql://authflow_user:password@localhost:5432/authflow', {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 5
  });

  console.log('✅ Connected to database');
  
  // Check what tables exist
  const tables = await sql`
    SELECT 
      table_name,
      table_schema
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  
  console.log('\n📋 Tables in database:');
  if (tables.length === 0) {
    console.log('❌ No tables found in public schema');
  } else {
    tables.forEach(table => {
      console.log(`✅ ${table.table_name}`);
    });
  }

  // Check if users table exists specifically
  const usersTable = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    ) as exists
  `;
  
  console.log(`\n📋 Users table exists: ${usersTable[0].exists}`);

  // Check drizzle migrations table
  const drizzleTable = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'drizzle' 
      AND table_name = '__drizzle_migrations'
    ) as exists
  `;
  
  console.log(`📋 Drizzle migrations table exists: ${drizzleTable[0].exists}`);

  await sql.end();

} catch (error) {
  console.log(`❌ Error: ${error.message}`);
}
