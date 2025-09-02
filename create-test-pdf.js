#!/usr/bin/env node

/**
 * Create a simple test PDF file for testing PDF parsing
 * This uses a simple approach to create a basic PDF
 */

import fs from 'fs';

// Simple PDF content (minimal PDF structure)
const testPDFContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test Document for PDF Parsing) Tj
0 -20 Td
(This is a test document to verify PDF parsing functionality.) Tj
0 -20 Td
() Tj
0 -20 Td
(Section 1: Introduction) Tj
0 -20 Td
(This document contains sample text that should be extracted) Tj
0 -20 Td
(and processed by the RAG system.) Tj
0 -20 Td
() Tj
0 -20 Td
(Section 2: Technical Details) Tj
0 -20 Td
(The PDF parsing system uses two libraries:) Tj
0 -20 Td
(- pdfplumber: For complex layouts) Tj
0 -20 Td
(- PyPDF2: As a fallback) Tj
0 -20 Td
() Tj
0 -20 Td
(Section 3: Testing) Tj
0 -20 Td
(This content should be chunked and embedded.) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000525 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
600
%%EOF`;

// Write the test PDF
fs.writeFileSync('test-document.pdf', testPDFContent);
console.log('✅ Created test-document.pdf for testing PDF parsing');
console.log('📄 The PDF contains sample text that can be extracted and processed');
console.log('🧪 You can now test PDF parsing functionality');
