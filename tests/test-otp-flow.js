import { createOTP, verifyOTP } from './src/lib/utils/token.js';

async function testOTPFlow() {
  try {
    console.log('🧪 Testing OTP Flow...\n');
    
    const testEmail = 'test@example.com';
    
    // Test 1: Create OTP
    console.log('1️⃣ Creating OTP for:', testEmail);
    const otp = await createOTP(testEmail);
    console.log('✅ OTP created:', otp);
    console.log('');
    
    // Test 2: Verify correct OTP
    console.log('2️⃣ Verifying correct OTP:', otp);
    const email = await verifyOTP(otp);
    console.log('✅ Verification result:', email);
    console.log('');
    
    // Test 3: Try to verify wrong OTP
    console.log('3️⃣ Verifying wrong OTP: 000000');
    const wrongResult = await verifyOTP('000000');
    console.log('❌ Wrong OTP result:', wrongResult);
    console.log('');
    
    // Test 4: Try to verify the same OTP again (should fail)
    console.log('4️⃣ Verifying same OTP again:', otp);
    const duplicateResult = await verifyOTP(otp);
    console.log('❌ Duplicate OTP result:', duplicateResult);
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testOTPFlow();
