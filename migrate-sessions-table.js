import postgres from 'postgres';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';
const client = postgres(DATABASE_URL);

async function migrateSessionsTable() {
  try {
    console.log('🔧 Migrating sessions table for database sessions...\n');
    
    // Check current table structure
    const currentColumns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'sessions'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Current sessions table columns:');
    currentColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    console.log('');
    
    // Check if session_token column exists
    const sessionTokenExists = currentColumns.some(col => col.column_name === 'session_token');
    const expiresExists = currentColumns.some(col => col.column_name === 'expires');
    
    if (!sessionTokenExists) {
      console.log('🔧 Adding session_token column...');
      await client`
        ALTER TABLE sessions 
        ADD COLUMN session_token TEXT NOT NULL UNIQUE DEFAULT 'temp_' || gen_random_uuid()::text
      `;
      console.log('✅ session_token column added');
    } else {
      console.log('✅ session_token column already exists');
    }
    
    if (!expiresExists) {
      console.log('🔧 Adding expires column...');
      await client`
        ALTER TABLE sessions 
        ADD COLUMN expires TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '30 days'
      `;
      console.log('✅ expires column added');
    } else {
      console.log('✅ expires column already exists');
    }
    
    // Check if we need to rename expires_at to expires
    const expiresAtExists = currentColumns.some(col => col.column_name === 'expires_at');
    if (expiresAtExists && !expiresExists) {
      console.log('🔧 Renaming expires_at to expires...');
      await client`
        ALTER TABLE sessions 
        RENAME COLUMN expires_at TO expires
      `;
      console.log('✅ expires_at renamed to expires');
    }
    
    // Update existing sessions with proper data
    console.log('🔧 Updating existing sessions...');
    await client`
      UPDATE sessions 
      SET 
        session_token = 'temp_' || gen_random_uuid()::text,
        expires = NOW() + INTERVAL '30 days'
      WHERE session_token IS NULL OR expires IS NULL
    `;
    console.log('✅ Existing sessions updated');
    
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
    
    console.log('\n✅ Sessions table migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await client.end();
  }
}

migrateSessionsTable();
