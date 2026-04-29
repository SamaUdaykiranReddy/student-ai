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
    base_engagement = np.random.uniform(0.2, 1.0)
    for week in range(1, 11):
        trend = max(0.1, base_engagement - (week * np.random.uniform(0, 0.05)))
        rows.append({
            "student_id": sid,
            "week": week,
            "login_count": int(np.random.poisson(trend * 10)),
            "forum_posts": int(np.random.poisson(trend * 3)),
            "video_watch_minutes": int(np.random.poisson(trend * 60)),
            "assignment_submissions": int(np.random.binomial(3, trend)),
        })

engagement_df = pd.DataFrame(rows)

assessment_rows = []
for sid in student_ids:
    base_score = np.random.uniform(30, 100)
    for week in [3, 6, 9]:
        score = max(0, min(100, base_score + np.random.normal(0, 10)))
        assessment_rows.append({
            "student_id": sid,
            "week": week,
            "score": round(score, 1),
            "submitted": np.random.choice([1, 0], p=[0.85, 0.15])
        })

assessment_df = pd.DataFrame(assessment_rows)

def compute_risk(sid):
    eng = engagement_df[engagement_df.student_id == sid]
    asm = assessment_df[assessment_df.student_id == sid]
    avg_logins = eng.login_count.mean()
    avg_score = asm.score.mean()
    missed = (asm.submitted == 0).sum()
    risk = 0
    if avg_logins < 3: risk += 0.3
    if avg_score < 50: risk += 0.4
    if missed >= 2: risk += 0.3
    return 1 if risk >= 0.5 else 0

students_df["at_risk"] = students_df.student_id.apply(compute_risk)

os.makedirs("data", exist_ok=True)
students_df.to_csv("data/students.csv", index=False)
engagement_df.to_csv("data/engagement.csv", index=False)
assessment_df.to_csv("data/assessments.csv", index=False)

print(f"Generated {n_students} students")
print(f"At-risk students: {students_df.at_risk.sum()} ({students_df.at_risk.mean()*100:.1f}%)")
print("Files saved to data/")