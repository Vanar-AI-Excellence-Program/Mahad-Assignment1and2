import postgres from 'postgres';
import { config } from 'dotenv';

config();

console.log('🔍 Checking current permissions...');

// Try to connect as authflow_user first
try {
  const sql = postgres('postgresql://authflow_user:password@localhost:5432/authflow', {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 5
  });

  console.log('✅ Connected as authflow_user');
  
  // Check current user and database
  const userInfo = await sql`SELECT current_user, current_database()`;
  console.log(`User: ${userInfo[0].current_user}`);
  console.log(`Database: ${userInfo[0].current_database}`);

  // Check schema permissions
  const schemaPerms = await sql`
    SELECT 
      nspname as schema_name,
      has_schema_privilege(current_user, nspname, 'CREATE') as can_create,
      has_schema_privilege(current_user, nspname, 'USAGE') as can_use
    FROM pg_namespace 
    WHERE nspname = 'public'
  `;
  
  console.log('\n📋 Schema Permissions:');
  console.log(`Public schema - CREATE: ${schemaPerms[0]?.can_create || false}`);
  console.log(`Public schema - USAGE: ${schemaPerms[0]?.can_use || false}`);

  // Check if user is owner of the database
  const dbOwner = await sql`
    SELECT 
      datname,
      pg_get_userbyid(datdba) as owner
    FROM pg_database 
    WHERE datname = current_database()
  `;
  
  console.log(`\n📋 Database Owner: ${dbOwner[0]?.owner}`);
  console.log(`Is owner: ${dbOwner[0]?.owner === userInfo[0].current_user}`);

  await sql.end();

} catch (error) {
  console.log(`❌ Error connecting as authflow_user: ${error.message}`);
}

console.log('\n🔧 To fix this, you need to run these commands as a superuser (postgres):');
console.log('');
console.log('-- Connect to the authflow database');
console.log('\\c authflow');
console.log('');
console.log('-- Grant schema permissions');
console.log('GRANT USAGE ON SCHEMA public TO authflow_user;');
console.log('GRANT CREATE ON SCHEMA public TO authflow_user;');
console.log('');
console.log('-- Grant table permissions');
console.log('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authflow_user;');
console.log('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authflow_user;');
console.log('');
console.log('-- Set default privileges for future objects');
console.log('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authflow_user;');
console.log('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authflow_user;');
console.log('');
console.log('-- Make sure the user owns the database (optional but recommended)');
console.log('ALTER DATABASE authflow OWNER TO authflow_user;');
