import postgres from 'postgres';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://authflow_user:password@localhost:5432/authflow';
const client = postgres(DATABASE_URL);

async function addCreatedAtColumn() {
  try {
    console.log('🔧 Adding createdAt column to verification_tokens table...');
    
    // Check if column already exists
    const columnExists = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'verification_tokens' 
      AND column_name = 'created_at'
    `;
    
    if (columnExists.length > 0) {
      console.log('✅ createdAt column already exists');
      return;
    }
    
    // Add the column
    await client`
      ALTER TABLE verification_tokens 
      ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    `;
    
    console.log('✅ Successfully added createdAt column');
    
    // Update existing records with current timestamp
    await client`
      UPDATE verification_tokens 
      SET created_at = NOW() 
      WHERE created_at IS NULL
    `;
    
    console.log('✅ Updated existing records with current timestamp');
    
  } catch (error) {
    console.error('❌ Error adding createdAt column:', error);
  } finally {
    await client.end();
  }
}

addCreatedAtColumn();
