# RAG (Retrieval-Augmented Generation) System

This document describes the RAG system implementation that allows users to upload documents and ask questions based on the document content.

## Architecture Overview

The RAG system consists of the following components:

### 1. Database Schema (pgvector-enabled PostgreSQL)

- **documents**: Stores uploaded documents with metadata
- **chunks**: Stores text chunks extracted from documents
- **embeddings**: Stores vector embeddings for each chunk

### 2. Python Embedding Service

- **Location**: `embedding-service/`
- **Technology**: FastAPI + Google Gemini API
- **Purpose**: Generates embeddings for text chunks
- **Endpoints**:
  - `POST /embed`: Generate embedding for single text
  - `POST /embed/batch`: Generate embeddings for multiple texts
  - `GET /health`: Health check
  - `GET /models`: List available models

### 3. Backend API Endpoints

- **`/api/upload`**: Handle document uploads and processing
- **`/api/retrieve`**: Perform semantic search on documents
- **`/api/chat`**: Enhanced with RAG context retrieval

### 4. Frontend Integration

- Upload button in chatbot interface
- Real-time upload status messages
- Automatic RAG context injection in chat responses

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key
EMBEDDING_API_URL=http://localhost:8000
```

### 2. Start the Services

```bash
# Start the embedding service
cd embedding-service
docker build -t embedding-service .
docker run -p 8000:8000 -e GEMINI_API_KEY=your_key embedding-service

# Or run directly with Python
pip install -r requirements.txt
python app.py

# Start the main application
npm run dev
```

### 3. Database Migration

The RAG tables are automatically created when you run:

```bash
npm run db:push
```

## Usage

### 1. Upload Documents

1. Navigate to the chatbot interface (`/dashboard/chatbot`)
2. Click the green upload button (📤 icon)
3. Select a `.txt` or `.pdf` file
4. The document will be processed and chunked automatically

### 2. Ask Questions

1. After uploading documents, ask questions about the content
2. The AI will automatically retrieve relevant chunks and use them as context
3. Responses will be based on the uploaded document content

### 3. Supported File Types

- **Text files (.txt)**: Fully supported
- **PDF files (.pdf)**: Basic support (text extraction only)

## Technical Details

### Document Processing Pipeline

1. **Upload**: File is uploaded via `/api/upload`
2. **Text Extraction**: Content is extracted from the file
3. **Chunking**: Text is split into overlapping chunks (1000 chars, 200 char overlap)
4. **Embedding Generation**: Each chunk is sent to the embedding service
5. **Storage**: Chunks and embeddings are stored in the database

### Retrieval Process

1. **Query Embedding**: User's question is converted to an embedding
2. **Similarity Search**: Cosine similarity is calculated with all stored embeddings
3. **Context Retrieval**: Top 3 most similar chunks are retrieved
4. **Response Generation**: AI generates response using retrieved context

### Vector Similarity

The system uses cosine similarity to find the most relevant document chunks:

```typescript
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    // Calculate dot product and magnitudes
    // Return similarity score between 0 and 1
}
```

## API Reference

### Upload API

**POST** `/api/upload`

Upload a document for RAG processing.

**Request:**
- `file`: File to upload (.txt or .pdf)
- `conversationId`: Optional conversation ID to associate with

**Response:**
```json
{
  "success": true,
  "documentId": "uuid",
  "chunks": 5,
  "message": "Document uploaded and processed successfully"
}
```

### Retrieve API

**POST** `/api/retrieve`

Retrieve relevant document chunks for a query.

**Request:**
```json
{
  "query": "What is machine learning?",
  "conversationId": "optional-uuid",
  "limit": 5
}
```

**Response:**
```json
{
  "query": "What is machine learning?",
  "results": [
    {
      "documentId": "uuid",
      "filename": "document.txt",
      "chunks": [
        {
          "content": "Machine Learning is a subset of AI...",
          "similarity": 0.85,
          "chunkIndex": 2
        }
      ],
      "averageSimilarity": 0.82
    }
  ],
  "totalChunks": 15,
  "retrievedChunks": 3
}
```

## Performance Considerations

### Embedding Generation

- Uses Google's Gemini API for embedding generation
- Batch processing for multiple chunks
- Fallback to hash-based embeddings if API fails

### Database Optimization

- Indexes on user_id and conversation_id for fast filtering
- JSON storage for embeddings (consider pgvector for production)
- Cascade deletes for data consistency

### Caching

- Consider implementing Redis for embedding caching
- Cache frequently accessed document chunks
- Implement TTL for cache expiration

## Security

### Access Control

- All endpoints require authentication
- Users can only access their own documents
- Conversation-scoped document access

### File Validation

- File type validation (.txt, .pdf only)
- File size limits
- Content sanitization

## Future Enhancements

1. **PDF Support**: Better PDF parsing with images and tables
2. **Vector Database**: Migrate to pgvector for better performance
3. **Advanced Chunking**: Semantic chunking instead of fixed-size
4. **Multi-modal**: Support for images and other file types
5. **Real-time Updates**: WebSocket updates for upload progress
6. **Document Management**: Edit, delete, and organize uploaded documents

## Troubleshooting

### Common Issues

1. **Embedding Service Not Running**
   - Check if the service is running on port 8000
   - Verify GEMINI_API_KEY is set correctly

2. **Upload Failures**
   - Check file type and size
   - Verify database connection
   - Check server logs for errors

3. **Poor Retrieval Results**
   - Adjust chunk size and overlap
   - Check embedding quality
   - Verify document content is relevant

### Debug Information

The chatbot interface includes debug information showing:
- Tree size and current node
- Number of messages and conversations
- Upload status and chunk counts
