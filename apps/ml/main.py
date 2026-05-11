from fastapi import FastAPI
from pydantic import BaseModel
import pickle
import pandas as pd
import numpy as np
import uvicorn
import subprocess
import threading
from rag import upsert_document, answer_question

app = FastAPI(title="Student Risk ML Service")

with open("models/model.pkl", "rb") as f:
    model = pickle.load(f)
with open("models/explainer.pkl", "rb") as f:
    explainer = pickle.load(f)
with open("models/feature_cols.pkl", "rb") as f:
    feature_cols = pickle.load(f)


def start_scheduler():
    subprocess.Popen(["python", "scheduler.py"])


threading.Thread(target=start_scheduler, daemon=True).start()


class StudentFeatures(BaseModel):
    avg_logins: float
    avg_forum_posts: float
    avg_video_minutes: float
    avg_submissions: float
    total_logins: float
    login_trend: float
    avg_score: float
    min_score: float
    missed_assignments: float
    submission_rate: float
    gender_enc: int
    disability_enc: int
    age_enc: int
    edu_enc: int


@app.get("/health")
def health():
    return {"status": "ok", "message": "ML service is running"}


@app.post("/predict")
def predict(features: StudentFeatures):
    data = pd.DataFrame([features.model_dump()])
    data = data[feature_cols].fillna(0)

    risk_score = float(model.predict_proba(data)[0][1])
    prediction = int(model.predict(data)[0])

    shap_values = explainer.shap_values(data)[0]
    shap_factors = sorted(
        zip(feature_cols, shap_values), key=lambda x: abs(x[1]), reverse=True
    )[:3]

    top_factors = [
        {"feature": f, "impact": round(float(v), 4)} for f, v in shap_factors
    ]

    risk_label = (
        "high" if risk_score >= 0.7 else "medium" if risk_score >= 0.4 else "low"
    )

    return {
        "risk_score": round(risk_score, 4),
        "risk_label": risk_label,
        "at_risk": bool(prediction),
        "top_factors": top_factors,
    }


@app.post("/retrain")
def retrain():
    try:
        result = subprocess.Popen(
            ["python", "retrain.py"], stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        return {"message": "Retraining started in background", "pid": result.pid}
    except Exception as e:
        return {"error": str(e)}


@app.get("/model/status")
def model_status():
    try:
        with open("models/model.pkl", "rb") as f:
            m = pickle.load(f)
        return {
            "status": "loaded",
            "n_estimators": m.n_estimators,
            "features": feature_cols,
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}


class ChatRequest(BaseModel):
    question: str
    student_id: str = ""
    risk_score: float = 0.0
    avg_score: float = 0.0
    missed_assignments: int = 0


class IngestRequest(BaseModel):
    doc_id: str
    title: str
    content: str
    doc_type: str = "course_material"


@app.post("/chat")
def chat(request: ChatRequest):
    try:
        student_context = {
            "risk_score": request.risk_score,
            "avg_score": request.avg_score,
            "missed_assignments": request.missed_assignments,
        }
        result = answer_question(request.question, student_context)
        return result
    except Exception as e:
        return {
            "error": str(e),
            "answer": "Sorry, I couldn't process your question. Please try again.",
        }


@app.post("/ingest")
def ingest(request: IngestRequest):
    try:
        upsert_document(
            doc_id=request.doc_id,
            text=request.content,
            metadata={"title": request.title, "type": request.doc_type},
        )
        return {"message": f"Document '{request.title}' ingested successfully"}
    except Exception as e:
        return {"error": str(e)}


from langchain_agent import run_langchain_agent


class AgentRequest(BaseModel):
    query: str = ""


@app.post("/agent")
def run_agent_endpoint(request: AgentRequest = AgentRequest()):
    try:
        result = run_langchain_agent(request.query or None)
        return {"result": result, "status": "success"}
    except Exception as e:
        return {"error": str(e), "status": "error"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
