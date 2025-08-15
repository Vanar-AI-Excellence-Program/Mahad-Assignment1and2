import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';
const client = postgres(DATABASE_URL);

async function setupDatabase() {
  try {
    console.log('🔧 Setting up database schema...\n');
    
    // Check if users table exists and has correct structure
    const usersTableExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `;
    
    if (!usersTableExists[0].exists) {
      console.log('📋 Creating users table...');
      await client`
        CREATE TABLE "users" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "email" varchar(255) NOT NULL,
          "hashed_password" text NOT NULL,
          "email_verified" boolean DEFAULT false,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL,
          CONSTRAINT "users_email_unique" UNIQUE("email")
        )
      `;
      console.log('✅ Users table created');
    } else {
      console.log('📋 Users table exists, checking structure...');
      
      // Check if id column has proper default and type
      const idColumn = await client`
        SELECT column_default, is_nullable, data_type
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id'
      `;
      
      if (idColumn[0]?.data_type !== 'uuid') {
        console.log('🔧 Fixing id column type from text to uuid...');
        await client`
          ALTER TABLE users 
          ALTER COLUMN id TYPE uuid USING id::uuid
        `;
        console.log('✅ id column type fixed to uuid');
      } else {
        console.log('✅ id column already has correct uuid type');
      }
      
      if (!idColumn[0]?.column_default || !idColumn[0].column_default.includes('gen_random_uuid')) {
        console.log('🔧 Fixing id column default...');
        await client`
          ALTER TABLE users 
          ALTER COLUMN id SET DEFAULT gen_random_uuid()
        `;
        console.log('✅ id column default fixed');
      } else {
        console.log('✅ id column already has correct default');
      }
      
      // Check if email_verified column exists
      const emailVerifiedExists = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'email_verified'
        )
      `;
      
      if (!emailVerifiedExists[0].exists) {
        console.log('🔧 Adding email_verified column...');
        await client`
          ALTER TABLE users 
          ADD COLUMN email_verified boolean DEFAULT false
        `;
        console.log('✅ email_verified column added');
      } else {
        console.log('✅ email_verified column already exists');
      }
      
      // Check if created_at column exists
      const createdAtExists = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'created_at'
        )
      `;
      
      if (!createdAtExists[0].exists) {
        console.log('🔧 Adding created_at column...');
        await client`
          ALTER TABLE users 
          ADD COLUMN created_at timestamp DEFAULT now() NOT NULL
        `;
        console.log('✅ created_at column added');
      } else {
        console.log('✅ created_at column already exists');
      }
      
      // Check if updated_at column exists
      const updatedAtExists = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'updated_at'
        )
      `;
      
      if (!updatedAtExists[0].exists) {
        console.log('🔧 Adding updated_at column...');
        await client`
          ALTER TABLE users 
          ADD COLUMN updated_at timestamp DEFAULT now() NOT NULL
        `;
        console.log('✅ updated_at column added');
      } else {
        console.log('✅ updated_at column already exists');
      }
    }
    
    // Check if sessions table exists and has correct structure
    const sessionsTableExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions'
      )
    `;
    
    if (!sessionsTableExists[0].exists) {
      console.log('📋 Creating sessions table...');
      await client`
        CREATE TABLE "sessions" (
          "id" text PRIMARY KEY NOT NULL,
          "session_token" text NOT NULL UNIQUE,
          "user_id" uuid NOT NULL,
          "expires" timestamp with time zone NOT NULL
        )
      `;
      console.log('✅ Sessions table created');
    } else {
      console.log('📋 Sessions table exists, checking structure...');
      
      // Check if session_token column exists
      const sessionTokenExists = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'sessions' AND column_name = 'session_token'
        )
      `;
      
      if (!sessionTokenExists[0].exists) {
        console.log('🔧 Adding session_token column...');
        await client`
          ALTER TABLE sessions 
          ADD COLUMN session_token text NOT NULL UNIQUE
        `;
        console.log('✅ session_token column added');
      } else {
        console.log('✅ session_token column already exists');
      }
      
      // Check if expires column exists (not expires_at)
      const expiresExists = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'sessions' AND column_name = 'expires'
        )
      `;
      
      if (!expiresExists[0].exists) {
        console.log('🔧 Adding expires column...');
        await client`
          ALTER TABLE sessions 
          ADD COLUMN expires timestamp with time zone NOT NULL
        `;
        console.log('✅ expires column added');
      } else {
        console.log('✅ expires column already exists');
      }
      
      // Remove old expires_at column if it exists
      const expiresAtExists = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'sessions' AND column_name = 'expires_at'
        )
      `;
      
      if (expiresAtExists[0].exists) {
        console.log('🔧 Removing old expires_at column...');
        await client`
          ALTER TABLE sessions 
          DROP COLUMN expires_at
        `;
        console.log('✅ expires_at column removed');
      }
    }
    
    // Check if user_profiles table exists
    const profilesTableExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
      )
    `;
    
    if (!profilesTableExists[0].exists) {
      console.log('📋 Creating user_profiles table...');
      await client`
        CREATE TABLE "user_profiles" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" uuid NOT NULL,
          "first_name" varchar(100),
          "last_name" varchar(100),
          "avatar" text,
          "bio" text,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        )
      `;
      console.log('✅ User profiles table created');
    } else {
      console.log('✅ User profiles table already exists');
    }
    
    // Check if verification_tokens table exists
    const tokensTableExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'verification_tokens'
      )
    `;
    
    if (!tokensTableExists[0].exists) {
      console.log('📋 Creating verification_tokens table...');
      await client`
        CREATE TABLE "verification_tokens" (
          "identifier" text NOT NULL,
          "token" text NOT NULL,
          "expires" timestamp with time zone NOT NULL,
          "type" varchar(50) DEFAULT 'email-verification' NOT NULL,
          CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
        )
      `;
      console.log('✅ Verification tokens table created');
    } else {
      console.log('✅ Verification tokens table already exists');
    }
    
    // Add foreign key constraints if they don't exist
    console.log('\n🔧 Checking foreign key constraints...');
    
    // Sessions -> Users foreign key
    const sessionsFKExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE constraint_name = 'sessions_user_id_users_id_fk'
      )
    `;
    
    if (!sessionsFKExists[0].exists) {
      console.log('🔧 Adding sessions -> users foreign key...');
      await client`
        ALTER TABLE sessions 
        ADD CONSTRAINT sessions_user_id_users_id_fk 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `;
      console.log('✅ Sessions foreign key added');
    } else {
      console.log('✅ Sessions foreign key already exists');
    }
    
    // User profiles -> Users foreign key
    const profilesFKExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_profiles_user_id_users_id_fk'
      )
    `;
    
    if (!profilesFKExists[0].exists) {
      console.log('🔧 Adding user_profiles -> users foreign key...');
      await client`
        ALTER TABLE user_profiles 
        ADD CONSTRAINT user_profiles_user_id_users_id_fk 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `;
      console.log('✅ User profiles foreign key added');
    } else {
      console.log('✅ User profiles foreign key already exists');
    }
    
    console.log('\n✅ Database setup completed successfully!');
    console.log('   All tables now have the correct structure for the application.');
    console.log('   You should now be able to register users without errors.');
    
  } catch (error) {
    console.error('❌ Setup error:', error);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Make sure PostgreSQL is running');
    console.log('   2. Check your DATABASE_URL in .env file');
    console.log('   3. Ensure the database "authflow" exists');
    console.log('   4. Verify user "authflow_user" has proper permissions');
  } finally {
    await client.end();
  }
}

setupDatabase();
