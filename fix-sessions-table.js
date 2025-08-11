import postgres from 'postgres';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://authflow_user:password@localhost:5432/authflow';
const client = postgres(DATABASE_URL);

async function fixSessionsTable() {
  try {
    console.log('🔧 Fixing sessions table structure...\n');
    
    // Check current table structure
    const columns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'sessions'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Current sessions table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    console.log('');
    
    // Remove the old expires_at column if it exists
    const expiresAtExists = columns.some(col => col.column_name === 'expires_at');
    if (expiresAtExists) {
      console.log('🔧 Removing old expires_at column...');
      await client`
        ALTER TABLE sessions 
        DROP COLUMN expires_at
      `;
      console.log('✅ expires_at column removed');
    } else {
      console.log('✅ expires_at column already removed');
    }
    
    // Final table structure
    const finalColumns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'sessions'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📋 Final sessions table columns:');
    finalColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    console.log('\n✅ Sessions table fixed successfully!');
    console.log('   The table now has the correct structure for Auth.js database sessions.');
    
  } catch (error) {
    console.error('❌ Fix error:', error);
  } finally {
    await client.end();
  }
}

fixSessionsTable();
