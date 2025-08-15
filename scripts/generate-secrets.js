#!/usr/bin/env node

/**
 * Generate secure secrets for AuthFlow environment variables
 * Run this script to generate the required secrets
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔐 Generating secure secrets for AuthFlow...\n');

// Generate AUTH_SECRET (32 bytes = 256 bits)
const authSecret = crypto.randomBytes(32).toString('base64');

// Generate ENCRYPTION_KEY (32 bytes = 256 bits)
const encryptionKey = crypto.randomBytes(32).toString('base64');

// Generate a random database password (16 characters)
const dbPassword = crypto.randomBytes(8).toString('hex');

console.log('✅ Generated secure secrets:\n');

console.log('🔑 AUTH_SECRET (REQUIRED):');
console.log(`   ${authSecret}\n`);

console.log('🔐 ENCRYPTION_KEY (OPTIONAL):');
console.log(`   ${encryptionKey}\n`);

console.log('🗄️  SAMPLE DATABASE PASSWORD:');
console.log(`   ${dbPassword}\n`);

console.log('📝 SAMPLE .env FILE CONTENT:');
console.log('='.repeat(50));

const envContent = `# =============================================================================
# REQUIRED ENVIRONMENT VARIABLES FOR AUTHFLOW
# =============================================================================

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/mydatabase"

# =============================================================================
# AUTHENTICATION SECRETS (REQUIRED)
# =============================================================================
AUTH_SECRET="${authSecret}"
AUTH_URL="http://localhost:5173"

# =============================================================================
# GMAIL CONFIGURATION (FOR EMAIL FEATURES - PHASE 3)
# =============================================================================
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-16-character-app-password"

# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================
PUBLIC_APP_URL="http://localhost:5173"

# =============================================================================
# OPTIONAL: ADDITIONAL SECURITY (RECOMMENDED FOR PRODUCTION)
# =============================================================================
ENCRYPTION_KEY="${encryptionKey}"

# =============================================================================
# DEVELOPMENT ONLY (OPTIONAL)
# =============================================================================
DEBUG="false"
NODE_ENV="development"`;

console.log(envContent);
console.log('='.repeat(50));

console.log('\n📋 NEXT STEPS:');
console.log('1. Copy the content above to a new file called .env');
console.log('2. Update the DATABASE_URL with your actual PostgreSQL credentials');
console.log('3. Set up your Gmail App Password (see README.md for instructions)');
console.log('4. Start your development server with: npm run dev');
console.log('\n⚠️  IMPORTANT: Never commit your .env file to version control!');
console.log('   Make sure .env is in your .gitignore file.\n');

// Optionally create the .env file
const envPath = path.join(path.dirname(__dirname), '.env');
if (!fs.existsSync(envPath)) {
  const createEnv = process.argv.includes('--create');
  if (createEnv) {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file automatically!');
    console.log('⚠️  Remember to update the database and Gmail settings.');
  } else {
    console.log('💡 Tip: Run "node scripts/generate-secrets.js --create" to automatically create the .env file');
  }
} else {
  console.log('⚠️  .env file already exists. Please update it manually with the generated secrets.');
}
