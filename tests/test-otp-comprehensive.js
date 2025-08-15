import postgres from 'postgres';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';

config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';
const client = postgres(DATABASE_URL);

async function testOTPSystem() {
  try {
    console.log('🧪 Comprehensive OTP System Test\n');
    
    // 1. Check database schema
    console.log('📋 Checking database schema...');
    const columns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'verification_tokens'
      ORDER BY ordinal_position
    `;
    
    console.log('Verification tokens table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    console.log('');
    
    // 2. Check OTP tokens
    const otpTokens = await client`
      SELECT identifier, token, expires, type, created_at
      FROM verification_tokens 
      WHERE type = 'email-verification-otp'
      ORDER BY created_at DESC
    `;
    
    console.log('📋 OTP Tokens in database:');
    otpTokens.forEach((token, index) => {
      console.log(`${index + 1}. Email: ${token.identifier}`);
      console.log(`   Token (hashed): ${token.token.substring(0, 30)}...`);
      console.log(`   Expires: ${token.expires}`);
      console.log(`   Created: ${token.created_at}`);
      console.log(`   Is expired: ${new Date() > new Date(token.expires)}`);
      console.log('');
    });
    
    // 3. Test bcrypt hashing
    console.log('🔐 Testing bcrypt hashing...');
    const testOTP = '123456';
    const hashedOTP = await bcrypt.hash(testOTP, 10);
    console.log(`Test OTP: ${testOTP}`);
    console.log(`Hashed OTP: ${hashedOTP.substring(0, 30)}...`);
    
    const isMatch = await bcrypt.compare(testOTP, hashedOTP);
    console.log(`bcrypt.compare result: ${isMatch}`);
    console.log('');
    
    // 4. Check users
    const users = await client`
      SELECT id, email, email_verified, created_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    
    console.log('👤 Users in database:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email Verified: ${user.email_verified}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

testOTPSystem();
