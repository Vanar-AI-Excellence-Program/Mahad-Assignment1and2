import postgres from 'postgres';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';

console.log('Testing database connection...');

try {
  const sql = postgres(DATABASE_URL, {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 5
  });

  console.log('Connected! Testing basic query...');
  const result = await sql`SELECT current_user, current_database()`;
  console.log('User:', result[0].current_user);
  console.log('Database:', result[0].current_database);

  console.log('Testing table creation...');
  await sql`CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, name TEXT)`;
  console.log('Table created successfully!');

  console.log('Testing table drop...');
  await sql`DROP TABLE IF EXISTS test_table`;
  console.log('Table dropped successfully!');

  await sql.end();
  console.log('All tests passed!');

} catch (error) {
  console.log('Error:', error.message);
  process.exit(1);
}
