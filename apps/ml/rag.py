from pinecone import Pinecone
from openai import OpenAI
import os
import numpy as np

pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
groq_client = OpenAI(
    api_key=os.environ.get("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

INDEX_NAME = "student-ai-courses"
CHAT_MODEL = "llama-3.1-8b-instant"

def get_embedding(text: str) -> list:
    """Create a consistent embedding using character n-grams"""
    text = text.lower()
    vector = np.zeros(1536)
    
    # Character trigrams
    for i in range(len(text) - 2):
        trigram = text[i:i+3]
        idx = sum(ord(c) * (31 ** j) for j, c in enumerate(trigram)) % 1536
        vector[idx] += 1.0
    
    # Word unigrams with position weighting
    words = text.split()
    for i, word in enumerate(words):
        idx = sum(ord(c) * (31 ** j) for j, c in enumerate(word)) % 1536
        vector[idx] += 2.0  # words weighted more than trigrams
    
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = vector / norm
    return vector.tolist()

def upsert_document(doc_id: str, text: str, metadata: dict) -> None:
    index = pc.Index(INDEX_NAME)
    embedding = get_embedding(text)
    index.upsert(vectors=[{
        "id": doc_id,
        "values": embedding,
        "metadata": {**metadata, "text": text[:1000]}
    }])

def search_documents(query: str, top_k: int = 3) -> list:
    index = pc.Index(INDEX_NAME)
    query_embedding = get_embedding(query)
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True
    )
    return results.matches

def answer_question(question: str, student_context: dict = None) -> dict:
    matches = search_documents(question)
    
    context_parts = []
    sources = []
    for match in matches:
        if match.score > 0.05:  # lower threshold
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
            {"role": "user", "content": question}
        ],
        max_tokens=500
    )
    
    return {
        "answer": response.choices[0].message.content,
        "sources": list(set(sources)) if sources else [],
        "context_found": len(context_parts) > 0
    }