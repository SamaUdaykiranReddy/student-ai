import pandas as pd
import numpy as np
import os

np.random.seed(42)
n_students = 10000

student_ids = [f"S{i:04d}" for i in range(1, n_students + 1)]
cohorts = np.random.choice(["2024-spring", "2024-fall", "2025-spring"], n_students)
genders = np.random.choice(["M", "F"], n_students)
ages = np.random.choice(["0-35", "35-55", "55<="], n_students, p=[0.6, 0.3, 0.1])
education = np.random.choice(["A Level", "HE Qualification", "Lower Than A Level"], n_students)
disability = np.random.choice(["Y", "N"], n_students, p=[0.1, 0.9])

students_df = pd.DataFrame({
    "student_id": student_ids,
    "cohort": cohorts,
    "gender": genders,
    "age_band": ages,
    "highest_education": education,
    "disability": disability,
})

rows = []
for sid in student_ids:
    base_engagement = np.random.uniform(0.1, 1.0)
    trend = np.random.uniform(-0.03, 0.01)
    for week in range(1, 11):
        weekly = max(0.05, base_engagement + trend * week + np.random.normal(0, 0.1))
        rows.append({
            "student_id": sid,
            "week": week,
            "login_count": max(0, int(np.random.poisson(weekly * 10))),
            "forum_posts": max(0, int(np.random.poisson(weekly * 2))),
            "video_watch_minutes": max(0, int(np.random.poisson(weekly * 45))),
            "assignment_submissions": max(0, int(np.random.binomial(3, min(weekly, 0.95)))),
        })

engagement_df = pd.DataFrame(rows)

assessment_rows = []
for sid in student_ids:
    base_score = np.random.uniform(20, 100)
    for week in [3, 6, 9]:
        noise = np.random.normal(0, 8)
        score = max(0, min(100, base_score + noise))
        assessment_rows.append({
            "student_id": sid,
            "week": week,
            "score": round(score, 1),
            "submitted": bool(np.random.choice(
                [True, False],
                p=[max(0.3, base_score/120), min(0.7, 1 - base_score/120)]
            ))
        })

assessment_df = pd.DataFrame(assessment_rows)

def compute_risk(sid):
    eng = engagement_df[engagement_df.student_id == sid]
    asm = assessment_df[assessment_df.student_id == sid]
    
    avg_logins = eng.login_count.mean()
    avg_score = asm.score.mean()
    missed = (asm.submitted == False).sum()
    login_trend = eng.login_count.iloc[-1] - eng.login_count.iloc[0]
    submission_rate = asm.submitted.mean()
    
    risk = 0.0
    risk += max(0, (5 - avg_logins) / 5) * 0.35
    risk += max(0, (60 - avg_score) / 60) * 0.35
    risk += (missed / 3) * 0.20
    risk += max(0, -login_trend / 10) * 0.10
    
    risk += np.random.normal(0, 0.05)
    risk = max(0, min(1, risk))
    
    return 1 if risk >= 0.5 else 0

students_df["at_risk"] = students_df.student_id.apply(compute_risk)

os.makedirs("data", exist_ok=True)
students_df.to_csv("data/students.csv", index=False)
engagement_df.to_csv("data/engagement.csv", index=False)
assessment_df.to_csv("data/assessments.csv", index=False)

print(f"Generated {n_students} students")
print(f"At-risk students: {students_df.at_risk.sum()} ({students_df.at_risk.mean()*100:.1f}%)")
print("Files saved to data/")