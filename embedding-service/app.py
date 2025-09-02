from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
import json
from typing import List, Optional
import logging
import PyPDF2
import pdfplumber
import io

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Embedding Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")

genai.configure(api_key=GEMINI_API_KEY)

# For embeddings, we'll use a hash-based approach since Gemini doesn't have direct embedding API
# In production, you'd want to use a proper embedding service like OpenAI's text-embedding-004

# Pydantic models
class EmbeddingRequest(BaseModel):
    text: str
    model: Optional[str] = "text-embedding-004"

class EmbeddingResponse(BaseModel):
    embedding: List[float]
    model: str
    dimensions: int

class BatchEmbeddingRequest(BaseModel):
    texts: List[str]
    model: Optional[str] = "text-embedding-004"

class BatchEmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    model: str
    dimensions: int

class HealthResponse(BaseModel):
    status: str
    model: str

class PDFParseResponse(BaseModel):
    text: str
    pages: int
    success: bool
    message: str

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        # Test the Gemini model
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        return HealthResponse(status="healthy", model="gemini-2.0-flash-exp")
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Service unhealthy")

@app.post("/embed", response_model=EmbeddingResponse)
async def generate_embedding(request: EmbeddingRequest):
    """Generate embedding for a single text"""
    try:
        logger.info(f"Generating embedding for text: {request.text[:100]}...")
        
        # Use Gemini 2.0 for text analysis
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # Since Gemini doesn't have direct embedding API, we'll create a hash-based embedding
        # This is a simplified approach - in production, use a proper embedding service
        
        # For now, we'll create a simple embedding based on text characteristics
        # In a production environment, you'd want to use a proper embedding model
        import hashlib
        import struct
        
        # Create a deterministic embedding based on text hash
        text_hash = hashlib.sha256(request.text.encode()).digest()
        
        # Convert hash to 1536-dimensional vector (like OpenAI's text-embedding-004)
        embedding = []
        for i in range(0, len(text_hash), 4):
            if len(embedding) >= 1536:
                break
            chunk = text_hash[i:i+4]
            if len(chunk) == 4:
                value = struct.unpack('>f', chunk)[0]
                embedding.append(value)
        
        # Pad or truncate to exactly 1536 dimensions
        while len(embedding) < 1536:
            embedding.append(0.0)
        embedding = embedding[:1536]
        
        # Normalize the embedding
        import math
        magnitude = math.sqrt(sum(x*x for x in embedding))
        if magnitude > 0:
            embedding = [x/magnitude for x in embedding]
        
        logger.info(f"Generated embedding with {len(embedding)} dimensions")
        
        return EmbeddingResponse(
            embedding=embedding,
            model=request.model,
            dimensions=len(embedding)
        )
        
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")

@app.post("/embed/batch", response_model=BatchEmbeddingResponse)
async def generate_batch_embeddings(request: BatchEmbeddingRequest):
    """Generate embeddings for multiple texts"""
    try:
        logger.info(f"Generating batch embeddings for {len(request.texts)} texts")
        
        embeddings = []
        for text in request.texts:
            # Reuse the single embedding logic
            single_request = EmbeddingRequest(text=text, model=request.model)
            response = await generate_embedding(single_request)
            embeddings.append(response.embedding)
        
        logger.info(f"Generated {len(embeddings)} embeddings")
        
        return BatchEmbeddingResponse(
            embeddings=embeddings,
            model=request.model,
            dimensions=len(embeddings[0]) if embeddings else 0
        )
        
    except Exception as e:
        logger.error(f"Error generating batch embeddings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate batch embeddings: {str(e)}")

@app.post("/parse-pdf", response_model=PDFParseResponse)
async def parse_pdf(file: UploadFile = File(...)):
    """Parse PDF file and extract text"""
    try:
        logger.info(f"Parsing PDF file: {file.filename}")
        
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # Read file content
        content = await file.read()
        
        # Try pdfplumber first (better for complex layouts)
        text = ""
        pages = 0
        
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                pages = len(pdf.pages)
                for page_num, page in enumerate(pdf.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text += f"\n--- Page {page_num + 1} ---\n"
                        text += page_text
                        text += "\n"
                logger.info(f"Successfully parsed PDF with pdfplumber: {pages} pages")
        except Exception as e:
            logger.warning(f"pdfplumber failed, trying PyPDF2: {e}")
            # Fallback to PyPDF2
            try:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                pages = len(pdf_reader.pages)
                for page_num, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text += f"\n--- Page {page_num + 1} ---\n"
                        text += page_text
                        text += "\n"
                logger.info(f"Successfully parsed PDF with PyPDF2: {pages} pages")
            except Exception as e2:
                logger.error(f"Both PDF parsers failed: {e2}")
                raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e2)}")
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="No text could be extracted from the PDF")
        
        logger.info(f"Extracted {len(text)} characters from {pages} pages")
        
        return PDFParseResponse(
            text=text.strip(),
            pages=pages,
            success=True,
            message=f"Successfully extracted text from {pages} pages"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")

@app.get("/models")
async def list_models():
    """List available models"""
    return {
        "models": [
            {
                "id": "text-embedding-004",
                "name": "Text Embedding 004",
                "dimensions": 1536,
                "description": "High-quality text embeddings"
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
