import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from xgboost import XGBClassifier
import shap
import mlflow
import mlflow.xgboost
import pickle
import os

students_df = pd.read_csv("data/students.csv")
engagement_df = pd.read_csv("data/engagement.csv")
assessment_df = pd.read_csv("data/assessments.csv")

print("Building features...")

eng_features = engagement_df.groupby("student_id").agg(
    avg_logins=("login_count", "mean"),
    avg_forum_posts=("forum_posts", "mean"),
    avg_video_minutes=("video_watch_minutes", "mean"),
    avg_submissions=("assignment_submissions", "mean"),
    total_logins=("login_count", "sum"),
    login_trend=("login_count", lambda x: x.iloc[-1] - x.iloc[0] if len(x) > 1 else 0),
).reset_index()

asm_features = assessment_df.groupby("student_id").agg(
    avg_score=("score", "mean"),
    min_score=("score", "min"),
    missed_assignments=("submitted", lambda x: (x == 0).sum()),
    submission_rate=("submitted", "mean"),
).reset_index()

df = students_df.merge(eng_features, on="student_id", how="left")
df = df.merge(asm_features, on="student_id", how="left")

df["gender_enc"] = (df["gender"] == "M").astype(int)
df["disability_enc"] = (df["disability"] == "Y").astype(int)
df["age_enc"] = df["age_band"].map({"0-35": 0, "35-55": 1, "55<=": 2})
df["edu_enc"] = df["highest_education"].map({
    "Lower Than A Level": 0,
    "A Level": 1,
    "HE Qualification": 2
})

feature_cols = [
    "avg_logins", "avg_forum_posts", "avg_video_minutes", "avg_submissions",
    "total_logins", "login_trend", "avg_score", "min_score",
    "missed_assignments", "submission_rate",
    "gender_enc", "disability_enc", "age_enc", "edu_enc"
]

X = df[feature_cols].fillna(0)
y = df["at_risk"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"Training on {len(X_train)} students, testing on {len(X_test)}")

mlflow.set_experiment("student-risk-prediction")

with mlflow.start_run():
    model = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        scale_pos_weight=len(y_train[y_train==0]) / len(y_train[y_train==1]),
        random_state=42,
        eval_metric="logloss"
    )

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_prob)

    mlflow.log_param("n_estimators", 100)
    mlflow.log_param("max_depth", 4)
    mlflow.log_metric("auc", auc)
    mlflow.xgboost.log_model(model, "model")

    print("\nModel Performance:")
    print(classification_report(y_test, y_pred))
    print(f"AUC-ROC: {auc:.4f}")

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_test[:100])

    os.makedirs("models", exist_ok=True)
    with open("models/model.pkl", "wb") as f:
        pickle.dump(model, f)
    with open("models/explainer.pkl", "wb") as f:
        pickle.dump(explainer, f)
    with open("models/feature_cols.pkl", "wb") as f:
        pickle.dump(feature_cols, f)

    print("\nModel saved to models/")
    print(f"Top features: {list(zip(feature_cols, model.feature_importances_.round(3)))}")