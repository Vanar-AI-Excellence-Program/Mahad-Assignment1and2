from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import uvicorn
import requests
import json

# Load environment variables
load_dotenv()

app = FastAPI(title="Embedding Service", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent"

class EmbeddingRequest(BaseModel):
    text: str

class EmbeddingResponse(BaseModel):
    embedding: list[float]
    dim: int

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "embedding-service"}

@app.post("/embed", response_model=EmbeddingResponse)
async def create_embedding(request: EmbeddingRequest):
    try:
        # Prepare the request payload for Gemini Embeddings API
        payload = {
            "model": "models/gemini-embedding-001",
            "content": {
                "parts": [{
                    "text": request.text
                }]
            }
        }
        
        # Make the API call to Gemini
        headers = {
            "x-goog-api-key": GEMINI_API_KEY,
            "Content-Type": "application/json"
        }
        
        response = requests.post(GEMINI_API_URL, headers=headers, json=payload)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"Gemini API error: {response.text}"
            )
        
        # Parse the response
        response_data = response.json()
        
        # Extract the embedding from the response
        if "embedding" in response_data and "values" in response_data["embedding"]:
            embedding = response_data["embedding"]["values"]
        else:
            raise HTTPException(
                status_code=500, 
                detail="Invalid response format from Gemini API"
            )
        
        return EmbeddingResponse(
            embedding=embedding,
            dim=len(embedding)
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
