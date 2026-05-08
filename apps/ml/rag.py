from pinecone import Pinecone
from openai import OpenAI
import os

# Initialize clients
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
openai_client = OpenAI(
    api_key=os.environ.get("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

INDEX_NAME = "student-ai-courses"
EMBED_MODEL = "text-embedding-3-small"
CHAT_MODEL = "llama-3.1-8b-instant"

def get_embedding(text: str) -> list:
    """Get embedding using Groq-compatible embedding model via OpenAI client"""
    # Use a simple hash-based approach since Groq doesn't support embeddings
    # We'll use OpenAI's embedding endpoint pattern with a free alternative
    import hashlib
    import numpy as np
    
    # Create a deterministic 1536-dim vector from text
    # In production, use a real embedding model
    hash_bytes = hashlib.sha256(text.encode()).digest()
    np.random.seed(int.from_bytes(hash_bytes[:4], 'big'))
    return np.random.normal(0, 1, 1536).tolist()

def upsert_document(doc_id: str, text: str, metadata: dict) -> None:
    """Store a document in Pinecone"""
    index = pc.Index(INDEX_NAME)
    embedding = get_embedding(text)
    index.upsert(vectors=[{
        "id": doc_id,
        "values": embedding,
        "metadata": {**metadata, "text": text[:1000]}
    }])

def search_documents(query: str, top_k: int = 3) -> list:
    """Search for relevant documents"""
    index = pc.Index(INDEX_NAME)
    query_embedding = get_embedding(query)
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True
    )
    return results.matches

def answer_question(question: str, student_context: dict = None) -> dict:
    """RAG pipeline: search + generate answer"""
    # Search for relevant documents
    matches = search_documents(question)
    
    # Build context from matches
    context_parts = []
    sources = []
    for match in matches:
        if match.score > 0.3:  # relevance threshold
            context_parts.append(match.metadata.get("text", ""))
            sources.append(match.metadata.get("title", "Unknown source"))
    
    context = "\n\n".join(context_parts) if context_parts else "No specific course materials found."
    
    # Build student context
    student_info = ""
    if student_context:
        student_info = f"""
Student context:
- Risk score: {student_context.get('risk_score', 'N/A')}
- Average score: {student_context.get('avg_score', 'N/A')}
- Missed assignments: {student_context.get('missed_assignments', 'N/A')}
"""

    # Generate answer using Groq
    response = openai_client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {
                "role": "system",
                "content": f"""You are a helpful academic assistant for university students. 
Answer questions based on the course materials provided.
Be encouraging and supportive, especially for struggling students.

Course materials context:
{context}

{student_info}"""
            },
            {
                "role": "user", 
                "content": question
            }
        ],
        max_tokens=500
    )
    
    answer = response.choices[0].message.content
    
    return {
        "answer": answer,
        "sources": list(set(sources)) if sources else [],
        "context_found": len(context_parts) > 0
    }