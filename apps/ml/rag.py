from pinecone import Pinecone
from openai import OpenAI
import os

# Initialize clients
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
groq_client = OpenAI(
    api_key=os.environ.get("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

INDEX_NAME = "student-ai-courses"
CHAT_MODEL = "llama-3.1-8b-instant"

def get_embedding(text: str) -> list:
    """Get embedding using a sentence transformer model"""
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embedding = model.encode(text).tolist()
    # Pad or truncate to 1536 dimensions
    if len(embedding) < 1536:
        embedding = embedding + [0.0] * (1536 - len(embedding))
    return embedding[:1536]

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
    matches = search_documents(question)
    
    context_parts = []
    sources = []
    for match in matches:
        if match.score > 0.3:
            context_parts.append(match.metadata.get("text", ""))
            sources.append(match.metadata.get("title", "Unknown source"))
    
    context = "\n\n".join(context_parts) if context_parts else "No specific course materials found."
    
    student_info = ""
    if student_context:
        student_info = f"""
Student context:
- Risk score: {student_context.get('risk_score', 'N/A')}
- Average score: {student_context.get('avg_score', 'N/A')}
- Missed assignments: {student_context.get('missed_assignments', 'N/A')}
"""

    response = groq_client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {
                "role": "system",
                "content": f"""You are a helpful academic assistant for university students. 
Answer questions based on the course materials provided.
Be encouraging and supportive.

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