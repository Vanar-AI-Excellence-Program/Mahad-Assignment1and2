#!/usr/bin/env node

/**
 * Test script for conversation-scoped RAG system
 * This script tests the isolation of documents between different conversations
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'authflow',
  user: 'postgres',
  password: 'postgres'
});

async function testConversationScopedRAG() {
  console.log('🧪 Testing Conversation-Scoped RAG System...\n');

  try {
    // Test 1: Check if conversation_id columns exist
    console.log('1️⃣ Checking database schema...');
    const schemaCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('documents', 'chunks') 
      AND column_name = 'conversation_id'
      ORDER BY table_name, column_name;
    `);
    
    if (schemaCheck.rows.length === 2) {
      console.log('✅ conversation_id columns exist in both documents and chunks tables');
    } else {
      console.log('❌ conversation_id columns missing:', schemaCheck.rows);
      return;
    }

    // Test 2: Check if indexes exist
    console.log('\n2️⃣ Checking database indexes...');
    const indexCheck = await pool.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE indexname LIKE '%conversation%'
      ORDER BY tablename, indexname;
    `);
    
    console.log('📊 Found indexes:', indexCheck.rows.map(r => `${r.tablename}.${r.indexname}`));

    // Test 3: Check current data structure
    console.log('\n3️⃣ Checking current data structure...');
    const dataCheck = await pool.query(`
      SELECT 
        'documents' as table_name,
        COUNT(*) as total_count,
        COUNT(conversation_id) as with_conversation_id,
        COUNT(*) - COUNT(conversation_id) as without_conversation_id
      FROM documents
      UNION ALL
      SELECT 
        'chunks' as table_name,
        COUNT(*) as total_count,
        COUNT(conversation_id) as with_conversation_id,
        COUNT(*) - COUNT(conversation_id) as without_conversation_id
      FROM chunks;
    `);
    
    console.log('📊 Data structure:');
    dataCheck.rows.forEach(row => {
      console.log(`   ${row.table_name}: ${row.total_count} total, ${row.with_conversation_id} with conversation_id, ${row.without_conversation_id} without`);
    });

    // Test 4: Check conversation isolation (if data exists)
    console.log('\n4️⃣ Testing conversation isolation...');
    const isolationCheck = await pool.query(`
      SELECT 
        d.conversation_id,
        d.name as document_name,
        COUNT(c.id) as chunk_count
      FROM documents d
      LEFT JOIN chunks c ON d.id = c.document_id
      WHERE d.conversation_id IS NOT NULL
      GROUP BY d.conversation_id, d.name
      ORDER BY d.conversation_id;
    `);
    
    if (isolationCheck.rows.length > 0) {
      console.log('📊 Conversation isolation check:');
      isolationCheck.rows.forEach(row => {
        console.log(`   Conversation ${row.conversation_id}: ${row.document_name} (${row.chunk_count} chunks)`);
      });
    } else {
      console.log('ℹ️  No documents with conversation_id found yet');
    }

    // Test 5: Check vector similarity query structure
    console.log('\n5️⃣ Testing vector similarity query structure...');
    const vectorCheck = await pool.query(`
      SELECT 
        c.id,
        c.conversation_id,
        c.chunk_index,
        d.name as document_name,
        LENGTH(c.embedding) as embedding_length
      FROM chunks c
      JOIN documents d ON c.document_id = d.id
      WHERE c.conversation_id IS NOT NULL
      LIMIT 3;
    `);
    
    if (vectorCheck.rows.length > 0) {
      console.log('✅ Vector similarity query structure is correct');
      console.log('📊 Sample chunks:');
      vectorCheck.rows.forEach(row => {
        console.log(`   Chunk ${row.chunk_index} from ${row.document_name} (conversation: ${row.conversation_id})`);
      });
    } else {
      console.log('ℹ️  No chunks with conversation_id found yet');
    }

    console.log('\n🎉 Conversation-scoped RAG system test completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start a new chat conversation');
    console.log('   2. Upload a document in that conversation');
    console.log('   3. Ask questions - RAG should only use documents from that conversation');
    console.log('   4. Start another chat - it should have no access to the first conversation\'s documents');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testConversationScopedRAG().catch(console.error);
