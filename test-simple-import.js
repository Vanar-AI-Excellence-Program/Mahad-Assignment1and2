#!/usr/bin/env node

/**
 * Simple test to check pdf-parse import behavior
 */

console.log('🧪 Testing pdf-parse import behavior...\n');

// Test 1: Try to import pdf-parse directly
console.log('📄 Test 1: Direct import (this will likely fail)');
try {
  const pdfParse = require('pdf-parse');
  console.log('✅ Direct require worked (unexpected)');
} catch (error) {
  console.log('❌ Direct require failed (expected):', error.message.substring(0, 100));
}

// Test 2: Try dynamic import
console.log('\n📄 Test 2: Dynamic import');
try {
  const pdfModule = await import('pdf-parse');
  console.log('✅ Dynamic import worked');
  
  // Test if the function actually works
  try {
    const testBuffer = Buffer.from('Not a real PDF');
    const result = await pdfModule.default(testBuffer);
    console.log('✅ pdf-parse function works');
  } catch (funcError) {
    console.log('✅ pdf-parse function failed as expected:', funcError.message.substring(0, 100));
  }
} catch (error) {
  console.log('❌ Dynamic import failed:', error.message.substring(0, 100));
}

// Test 3: Check if we can work around the issue
console.log('\n📄 Test 3: Workaround attempt');
try {
  // Try to create a simple PDF-like buffer and test basic functionality
  const testBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n%%EOF');
  console.log('✅ Test buffer created');
  
  // Try to import and use
  const pdfModule = await import('pdf-parse');
  const result = await pdfModule.default(testBuffer);
  console.log('✅ Basic PDF parsing worked');
} catch (error) {
  console.log('❌ Workaround failed:', error.message.substring(0, 100));
}

console.log('\n📋 Summary:');
console.log('The pdf-parse library has debug code that runs on import');
console.log('This makes it unsuitable for production use in Node.js');
console.log('We need to either:');
console.log('1. Use a different PDF library');
console.log('2. Fork and fix pdf-parse');
console.log('3. Use a workaround that prevents the debug code');
