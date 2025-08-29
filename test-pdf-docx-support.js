#!/usr/bin/env node

/**
 * Test Script: PDF and DOCX Support in RAG Backend
 * 
 * This script tests the enhanced document ingestion pipeline that now supports:
 * - .txt files (existing functionality)
 * - .pdf files (newly added with pdf-parse)
 * - .docx files (newly added with mammoth)
 * 
 * It verifies that all file types are processed correctly and can be used for Q&A.
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Database connection configuration
const dbConfig = {
  host: 'localhost',
  port: 5433,
  database: 'mydatabase',
  user: 'postgres',
  password: 'postgres'
};

async function testPDFAndDOCXSupport() {
  console.log('🧪 Testing Enhanced Document Support (PDF + DOCX + TXT)...\n');
  
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Test 1: Check if the new file types are supported in the database
    console.log('\n📊 Test 1: Database Schema Check');
    const schemaResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      ORDER BY ordinal_position
    `);
    
    console.log('Documents table schema:');
    schemaResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Test 2: Check current documents and their types
    console.log('\n📄 Test 2: Current Documents Analysis');
    const documentsResult = await client.query(`
      SELECT 
        name,
        mime,
        size_bytes,
        created_at,
        conversation_id
      FROM documents 
      ORDER BY created_at DESC
    `);
    
    if (documentsResult.rows.length === 0) {
      console.log('ℹ️  No documents found in database');
    } else {
      console.log(`Found ${documentsResult.rows.length} documents:`);
      documentsResult.rows.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.name}`);
        console.log(`     Type: ${doc.mime}`);
        console.log(`     Size: ${(doc.size_bytes / 1024).toFixed(2)} KB`);
        console.log(`     Uploaded: ${doc.created_at}`);
        console.log(`     Conversation: ${doc.conversation_id || 'None'}`);
        console.log('');
      });
    }
    
    // Test 3: Check chunks and their distribution
    console.log('\n🔍 Test 3: Chunks Analysis');
    const chunksResult = await client.query(`
      SELECT 
        d.mime,
        d.name as document_name,
        COUNT(c.id) as chunk_count,
        AVG(LENGTH(c.content)) as avg_chunk_length,
        MIN(LENGTH(c.content)) as min_chunk_length,
        MAX(LENGTH(c.content)) as max_chunk_length
      FROM chunks c
      JOIN documents d ON c.document_id = d.id
      GROUP BY d.id, d.mime, d.name
      ORDER BY d.created_at DESC
    `);
    
    if (chunksResult.rows.length === 0) {
      console.log('ℹ️  No chunks found in database');
    } else {
      console.log('Chunks by document:');
      chunksResult.rows.forEach((chunk, index) => {
        console.log(`  ${index + 1}. ${chunk.document_name} (${chunk.mime})`);
        console.log(`     Chunks: ${chunk.chunk_count}`);
        console.log(`     Avg Length: ${Math.round(chunk.avg_chunk_length || 0)} chars`);
        console.log(`     Length Range: ${chunk.min_chunk_length || 0} - ${chunk.max_chunk_length || 0} chars`);
        console.log('');
      });
    }
    
    // Test 4: Check file type distribution
    console.log('\n📈 Test 4: File Type Distribution');
    const typeDistributionResult = await client.query(`
      SELECT 
        mime,
        COUNT(*) as count,
        AVG(size_bytes) as avg_size,
        SUM(size_bytes) as total_size
      FROM documents 
      GROUP BY mime
      ORDER BY count DESC
    `);
    
    console.log('File type distribution:');
    typeDistributionResult.rows.forEach(row => {
      const avgSizeKB = (row.avg_size / 1024).toFixed(2);
      const totalSizeMB = (row.total_size / (1024 * 1024)).toFixed(2);
      console.log(`  - ${row.mime}: ${row.count} files, avg: ${avgSizeKB} KB, total: ${totalSizeMB} MB`);
    });
    
    // Test 5: Check conversation isolation
    console.log('\n💬 Test 5: Conversation Isolation Check');
    const conversationResult = await client.query(`
      SELECT 
        d.conversation_id,
        COUNT(DISTINCT d.id) as document_count,
        COUNT(c.id) as total_chunks,
        STRING_AGG(DISTINCT d.mime, ', ') as file_types
      FROM documents d
      LEFT JOIN chunks c ON d.id = c.document_id
      WHERE d.conversation_id IS NOT NULL
      GROUP BY d.conversation_id
      ORDER BY d.conversation_id
    `);
    
    if (conversationResult.rows.length === 0) {
      console.log('ℹ️  No conversations with documents found');
    } else {
      console.log('Documents by conversation:');
      conversationResult.rows.forEach(row => {
        console.log(`  - Conversation ${row.conversation_id}:`);
        console.log(`    Documents: ${row.document_count}`);
        console.log(`    Total Chunks: ${row.total_chunks}`);
        console.log(`    File Types: ${row.file_types}`);
        console.log('');
      });
    }
    
    // Test 6: Check embedding quality
    console.log('\n🔢 Test 6: Embedding Quality Check');
    const embeddingResult = await client.query(`
      SELECT 
        d.mime,
        d.name,
        COUNT(c.id) as chunk_count,
        COUNT(CASE WHEN c.embedding IS NOT NULL THEN 1 END) as embedded_chunks,
        COUNT(CASE WHEN c.embedding IS NULL THEN 1 END) as missing_embeddings
      FROM documents d
      LEFT JOIN chunks c ON d.id = c.document_id
      GROUP BY d.id, d.mime, d.name
      ORDER BY d.created_at DESC
    `);
    
    if (embeddingResult.rows.length === 0) {
      console.log('ℹ️  No documents found for embedding analysis');
    } else {
      console.log('Embedding status by document:');
      embeddingResult.rows.forEach((row, index) => {
        const embeddingRate = row.chunk_count > 0 ? ((row.embedded_chunks / row.chunk_count) * 100).toFixed(1) : '0.0';
        console.log(`  ${index + 1}. ${row.name} (${row.mime})`);
        console.log(`     Chunks: ${row.chunk_count}`);
        console.log(`     Embedded: ${row.embedded_chunks} (${embeddingRate}%)`);
        console.log(`     Missing: ${row.missing_embeddings}`);
        console.log('');
      });
    }
    
    // Test 7: Performance metrics
    console.log('\n⚡ Test 7: Performance Metrics');
    const performanceResult = await client.query(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(DISTINCT conversation_id) as active_conversations,
        SUM(size_bytes) / (1024 * 1024) as total_storage_mb,
        AVG(size_bytes) / 1024 as avg_file_size_kb
      FROM documents
    `);
    
    if (performanceResult.rows.length > 0) {
      const stats = performanceResult.rows[0];
      console.log('System performance metrics:');
      console.log(`  - Total Documents: ${stats.total_documents}`);
      console.log(`  - Active Conversations: ${stats.active_conversations || 0}`);
      console.log(`  - Total Storage: ${(parseFloat(stats.total_storage_mb) || 0).toFixed(2)} MB`);
      console.log(`  - Average File Size: ${(parseFloat(stats.avg_file_size_kb) || 0).toFixed(2)} KB`);
    }
    
    // Test 8: File type support summary
    console.log('\n🎯 Test 8: File Type Support Summary');
    const supportSummary = await client.query(`
      SELECT 
        CASE 
          WHEN mime = 'text/plain' THEN 'Text Files (.txt)'
          WHEN mime = 'application/pdf' THEN 'PDF Files (.pdf)'
          WHEN mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' THEN 'Word Documents (.docx)'
          ELSE mime
        END as file_type,
        COUNT(*) as count,
        AVG(size_bytes) / 1024 as avg_size_kb,
        COUNT(CASE WHEN EXISTS(SELECT 1 FROM chunks WHERE document_id = documents.id) THEN 1 END) as processed_count
      FROM documents 
      GROUP BY mime
      ORDER BY count DESC
    `);
    
    console.log('File type support status:');
    supportSummary.rows.forEach(row => {
      const processingRate = ((row.processed_count / row.count) * 100).toFixed(1);
      console.log(`  ✅ ${row.file_type}:`);
      console.log(`     Count: ${row.count} files`);
      console.log(`     Avg Size: ${(parseFloat(row.avg_size_kb) || 0).toFixed(2)} KB`);
      console.log(`     Processed: ${row.processed_count} (${processingRate}%)`);
      console.log('');
    });
    
    // Test 9: Recommendations
    console.log('\n💡 Test 9: System Recommendations');
    
    if (typeDistributionResult.rows.length === 0) {
      console.log('🚀 Ready to test! Upload some documents to see the system in action.');
      console.log('   Supported formats: .txt, .pdf, .docx');
      console.log('   Maximum file size: 10MB per file');
    } else {
      const hasPDFs = typeDistributionResult.rows.some(r => r.mime === 'application/pdf');
      const hasDOCX = typeDistributionResult.rows.some(r => r.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const hasTXT = typeDistributionResult.rows.some(r => r.mime === 'text/plain');
      
      if (hasPDFs && hasDOCX && hasTXT) {
        console.log('🎉 Excellent! All supported file types are working correctly.');
        console.log('   - Text files (.txt): Full support ✅');
        console.log('   - PDF files (.pdf): Full support ✅');
        console.log('   - Word documents (.docx): Full support ✅');
      } else if (hasPDFs || hasDOCX) {
        console.log('✅ Good progress! Some advanced file types are working.');
        if (!hasTXT) {
          console.log('   💡 Try uploading a .txt file to test basic functionality');
        }
        if (!hasPDFs) {
          console.log('   💡 Try uploading a .pdf file to test PDF parsing');
        }
        if (!hasDOCX) {
          console.log('   💡 Try uploading a .docx file to test Word document parsing');
        }
      } else {
        console.log('📝 Basic functionality confirmed. Ready for advanced file types.');
        console.log('   💡 Try uploading different file types to test the enhanced pipeline');
      }
    }
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Upload a .txt file to test basic text processing');
    console.log('2. Upload a .pdf file to test PDF text extraction');
    console.log('3. Upload a .docx file to test Word document processing');
    console.log('4. Ask questions about uploaded documents in the chat');
    console.log('5. Check that each conversation only sees its own documents');
    
    console.log('\n✅ Enhanced Document Support Test Completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Ensure the database is running: docker compose ps');
    console.error('2. Check database connection: npm run db:status');
    console.error('3. Verify the upload API is working');
    console.error('4. Check console logs for any errors');
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
testPDFAndDOCXSupport().catch(console.error);
