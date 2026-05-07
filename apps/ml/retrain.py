import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
from xgboost import XGBClassifier
import shap
import mlflow
import mlflow.xgboost
import pickle
import os
import psycopg2
from datetime import datetime

print(f"[{datetime.now()}] Starting retraining pipeline...")

# Connect to PostgreSQL
conn = psycopg2.connect(
    host=os.environ.get("POSTGRES_HOST", "localhost"),
    port=os.environ.get("POSTGRES_PORT", 5432),
    user=os.environ.get("POSTGRES_USER", "student_ai"),
    password=os.environ.get("POSTGRES_PASSWORD", "student_ai_pass"),
    database=os.environ.get("POSTGRES_DB", "student_ai_db")
)

print("Connected to PostgreSQL")

# Fetch engagement data
eng_df = pd.read_sql("""
    SELECT student_id,
           AVG(login_count) as avg_logins,
           AVG(forum_posts) as avg_forum_posts,
           AVG(video_watch_minutes) as avg_video_minutes,
           AVG(assignment_submissions) as avg_submissions,
           SUM(login_count) as total_logins,
           MAX(login_count) - MIN(login_count) as login_trend
    FROM engagement
    GROUP BY student_id
""", conn)

# Fetch assessment data
asm_df = pd.read_sql("""
    SELECT student_id,
           AVG(score) as avg_score,
           MIN(score) as min_score,
           SUM(CASE WHEN submitted = false THEN 1 ELSE 0 END) as missed_assignments,
           AVG(CASE WHEN submitted = true THEN 1.0 ELSE 0.0 END) as submission_rate
    FROM assessments
    GROUP BY student_id
""", conn)

# Fetch student demographics
students_df = pd.read_sql("""
    SELECT id as student_id, gender, disability
    FROM students
""", conn)

conn.close()

print(f"Fetched {len(students_df)} students from PostgreSQL")

# Merge all features
df = students_df.merge(eng_df, on="student_id", how="left")
df = df.merge(asm_df, on="student_id", how="left")
df = df.fillna(0)

# Encode categorical features
df["gender_enc"] = (df["gender"] == "M").astype(int)
df["disability_enc"] = (df["disability"] == "Y").astype(int)
df["age_enc"] = 0  # default since we don't have age_band in new schema
df["edu_enc"] = 0  # default since we don't have highest_education in new schema

# Compute at_risk label from real data
df["at_risk"] = (
    (df["avg_logins"] < 3) * 0.3 +
    (df["avg_score"] < 50) * 0.4 +
    (df["missed_assignments"] >= 2) * 0.3
) >= 0.5

feature_cols = [
    "avg_logins", "avg_forum_posts", "avg_video_minutes", "avg_submissions",
    "total_logins", "login_trend", "avg_score", "min_score",
    "missed_assignments", "submission_rate",
    "gender_enc", "disability_enc", "age_enc", "edu_enc"
]

X = df[feature_cols].fillna(0)
y = df["at_risk"].astype(int)

print(f"Dataset: {len(X)} students, {y.sum()} at risk ({y.mean()*100:.1f}%)")

# Need at least 10 students to retrain
if len(X) < 10:
    print("Not enough data to retrain. Need at least 10 students.")
    exit(0)

# If all students have same label, skip retraining
if y.nunique() < 2:
    print("All students have same label, skipping retraining.")
    exit(0)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"Training on {len(X_train)}, testing on {len(X_test)}")

mlflow.set_experiment("student-risk-prediction-live")

with mlflow.start_run():
    model = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        scale_pos_weight=max(1, len(y_train[y_train==0]) / max(1, len(y_train[y_train==1]))),
        random_state=42,
        eval_metric="logloss"
    )
    model.fit(X_train, y_train)

    y_prob = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_prob) if y_test.nunique() > 1 else 0.5

    mlflow.log_param("n_estimators", 100)
    mlflow.log_param("max_depth", 4)
    mlflow.log_param("data_size", len(X))
    mlflow.log_metric("auc", auc)
    mlflow.log_metric("at_risk_rate", float(y.mean()))
    mlflow.xgboost.log_model(model, "model")

    print(f"AUC-ROC: {auc:.4f}")

    explainer = shap.TreeExplainer(model)

    os.makedirs("models", exist_ok=True)
    with open("models/model.pkl", "wb") as f:
        pickle.dump(model, f)
    with open("models/explainer.pkl", "wb") as f:
        pickle.dump(explainer, f)
    with open("models/feature_cols.pkl", "wb") as f:
        pickle.dump(feature_cols, f)

    print(f"[{datetime.now()}] Retraining complete! Model saved.")