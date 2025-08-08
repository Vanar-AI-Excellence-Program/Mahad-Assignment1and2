import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

console.log('🔧 Fixing database permissions...');

// Try different connection strings to find a working superuser connection
const connectionAttempts = [
  'postgresql://postgres@localhost:5432/postgres',
  'postgresql://postgres:postgres@localhost:5432/postgres',
  'postgresql://postgres:password@localhost:5432/postgres',
  'postgresql://postgres:admin@localhost:5432/postgres',
  'postgresql://localhost:5432/postgres'
];

let sql = null;
let workingConnection = null;

for (const connectionString of connectionAttempts) {
  try {
    console.log(`🔍 Trying connection: ${connectionString.replace(/:[^:@]*@/, ':****@')}`);
    sql = postgres(connectionString, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10
    });
    
    const result = await sql`SELECT current_user, current_database()`;
    console.log(`✅ Connected as: ${result[0].current_user} to ${result[0].current_database}`);
    workingConnection = connectionString;
    break;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    if (sql) {
      await sql.end();
      sql = null;
    }
  }
}

if (!workingConnection) {
  console.log('\n❌ Could not connect as superuser. Please manually:');
  console.log('   1. Connect to PostgreSQL as superuser (postgres)');
  console.log('   2. Run the following SQL commands:');
  console.log('');
  console.log('   -- Grant permissions to authflow_user');
  console.log('   GRANT ALL PRIVILEGES ON DATABASE authflow TO authflow_user;');
  console.log('   GRANT ALL PRIVILEGES ON SCHEMA public TO authflow_user;');
  console.log('   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authflow_user;');
  console.log('   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authflow_user;');
  console.log('   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authflow_user;');
  console.log('   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authflow_user;');
  process.exit(1);
}

try {
  console.log('\n🔧 Granting permissions to authflow_user...');
  
  // Grant database permissions
  await sql`GRANT ALL PRIVILEGES ON DATABASE authflow TO authflow_user`;
  console.log('✅ Granted database privileges');
  
  // Connect to the authflow database to grant schema permissions
  await sql.end();
  sql = postgres(workingConnection.replace('/postgres', '/authflow'), {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10
  });
  
  // Grant schema permissions
  await sql`GRANT ALL PRIVILEGES ON SCHEMA public TO authflow_user`;
  console.log('✅ Granted schema privileges');
  
  // Grant table and sequence permissions
  await sql`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authflow_user`;
  await sql`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authflow_user`;
  console.log('✅ Granted table and sequence privileges');
  
  // Set default privileges for future objects
  await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authflow_user`;
  await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authflow_user`;
  console.log('✅ Set default privileges');
  
  console.log('\n✅ Database permissions fixed successfully!');
  console.log('🔍 Now testing the authflow_user connection...');
  
  // Test the authflow_user connection
  await sql.end();
  const testSql = postgres('postgresql://authflow_user:password@localhost:5432/authflow', {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10
  });
  
  const testResult = await testSql`SELECT current_user, current_database()`;
  console.log(`✅ authflow_user can connect: ${testResult[0].current_user} to ${testResult[0].current_database}`);
  
  // Test table creation
  await testSql`CREATE TABLE IF NOT EXISTS test_permissions (id SERIAL PRIMARY KEY, test TEXT)`;
  console.log('✅ authflow_user can create tables');
  
  // Clean up test table
  await testSql`DROP TABLE IF EXISTS test_permissions`;
  console.log('✅ Test table cleaned up');
  
  await testSql.end();
  
  console.log('\n🎉 Database setup complete! You can now run:');
  console.log('   npm run db:migrate');
  
} catch (error) {
  console.log(`❌ Error fixing permissions: ${error.message}`);
  if (sql) {
    await sql.end();
  }
  process.exit(1);
}
