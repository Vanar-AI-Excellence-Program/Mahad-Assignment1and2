import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/authflow';

console.log('🔍 Testing database connection...');
console.log(`Database URL: ${DATABASE_URL.replace(/:[^:@]*@/, ':****@')}`);

try {
  // Create a test connection
  const sql = postgres(DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10
  });

  console.log('✅ Connecting to database...');
  
  // Test basic connection
  const result = await sql`SELECT version()`;
  console.log('✅ Database connection successful!');
  console.log(`📊 PostgreSQL version: ${result[0].version}`);
  
  // Test if we can create a table (this will fail if no permissions)
  console.log('🔍 Testing table creation permissions...');
  try {
    await sql`CREATE TABLE IF NOT EXISTS test_connection (id SERIAL PRIMARY KEY, test TEXT)`;
    console.log('✅ Table creation permissions: OK');
    
    // Clean up test table
    await sql`DROP TABLE IF EXISTS test_connection`;
    console.log('✅ Test table cleaned up');
  } catch (permError) {
    console.log('❌ Table creation permissions: FAILED');
    console.log(`   Error: ${permError.message}`);
    console.log('\n📋 To fix this, you need to:');
    console.log('   1. Create the database user with proper permissions');
    console.log('   2. Create the database');
    console.log('   3. Grant permissions to the user');
  }
  
  await sql.end();
  
} catch (error) {
  console.log('❌ Database connection failed!');
  console.log(`   Error: ${error.message}`);
  
  if (error.message.includes('ECONNREFUSED')) {
    console.log('\n📋 PostgreSQL is not running. Please:');
    console.log('   1. Install PostgreSQL if not installed');
    console.log('   2. Start PostgreSQL service');
    console.log('   3. Create database and user');
  } else if (error.message.includes('authentication failed')) {
    console.log('\n📋 Authentication failed. Please check:');
    console.log('   1. Database user exists');
    console.log('   2. Password is correct');
    console.log('   3. User has proper permissions');
  } else if (error.message.includes('does not exist')) {
    console.log('\n📋 Database does not exist. Please:');
    console.log('   1. Create the database');
    console.log('   2. Grant permissions to the user');
  }
}
