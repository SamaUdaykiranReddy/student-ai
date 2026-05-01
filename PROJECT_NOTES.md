# Student AI — Project Notes
*Last updated: April 29, 2026*

---

## What This Project Does

A full-stack AI system that predicts which university students are at 
risk of failing 4 weeks before it happens. It shows instructors:
- A risk score (0-100%)
- Why the student was flagged (top 3 reasons)
- What to do about it (Claude AI suggestion)

---

## What We Built So Far

### 1. Infrastructure (docker-compose.yml)
Two services running in Docker:
 
**PostgreSQL (port 5432)**
- Our main database
- Stores all student data permanently
- Running as container: student_ai_postgres

**Redis (port 6379)**  
- Fast in-memory cache
- Will cache ML predictions so dashboard is instant
- Running as container: student_ai_redis

Start both with: `docker compose up -d`

---

### 2. Database Schema (apps/api/src/schema.ts)
Four tables created in PostgreSQL:

**students**
- id, name, email, cohort, gender, disability, enrolled_at
- One row per student

**assessments**
- id, student_id, week, score, submitted, submitted_at
- Stores exam/quiz results per student per week
- student_id links back to students table

**engagement**
- id, student_id, week, login_count, forum_posts, 
  video_watch_minutes, assignment_submissions, recorded_at
- Stores weekly platform activity per student

**risk_scores**
- id, student_id, week, risk_score, risk_label, 
  shap_factors (JSON), predicted_at
- Stores ML predictions and explanations

Run once to create tables: `npx tsx src/schema.ts`

---

### 3. Node.js API (apps/api) — Port 5010

**Entry point: src/index.ts**
- Sets up Express server
- Registers CORS (allows frontend to call API)
- Registers all routes
- Connects to PostgreSQL on startup

**Database connection: src/db.ts**
- Creates a PostgreSQL connection pool
- Pool keeps 10 connections open and ready
- Much faster than connecting on every request
- Exports pool so all routes can use it

**Routes:**

GET  /health
- Returns API status and timestamp
- Used to check if API is running

GET  /api/students
- Returns all students from database
- Used by dashboard to show student list

POST /api/students
- Creates a new student
- Body: { name, email, cohort }
- Returns created student with UUID

POST /api/engagement
- Logs weekly engagement data for a student
- Body: { student_id, week, login_count, forum_posts, 
          video_watch_minutes, assignment_submissions }

POST /api/assessments
- Logs assessment score for a student
- Body: { student_id, week, score, submitted }

POST /api/predict/:studentId
- THE MAIN ENDPOINT
- Fetches student data from PostgreSQL
- Sends to Python ML service
- Gets back risk score + SHAP factors
- Saves prediction to risk_scores table
- Returns full prediction result

---

### 4. Python ML Service (apps/ml) — Port 8000

**generate_data.py**
- Creates 10,000 synthetic students
- Each student has 10 weeks of engagement data
- Each student has 3 assessment scores
- Computes at_risk label based on:
  - avg_logins < 3 → +0.3 risk
  - avg_score < 50 → +0.4 risk  
  - missed >= 2 assignments → +0.3 risk
  - total risk >= 0.5 → at_risk = 1
- Saves to data/students.csv, engagement.csv, assessments.csv
- Result: 10,000 students, ~10.7% at risk

**train.py**
- Loads the 3 CSV files
- Builds 14 features per student:
  avg_logins, avg_forum_posts, avg_video_minutes,
  avg_submissions, total_logins, login_trend,
  avg_score, min_score, missed_assignments,
  submission_rate, gender_enc, disability_enc,
  age_enc, edu_enc
- Splits data: 8,000 training / 2,000 testing
- Trains XGBoost model:
  - 100 decision trees
  - max depth of 4 levels
  - handles class imbalance automatically
- Evaluates model: AUC-ROC = 1.0 (perfect on synthetic data)
- Creates SHAP explainer from trained model
- Tracks experiment in MLflow
- Saves model files:
  - models/model.pkl (XGBoost model)
  - models/explainer.pkl (SHAP explainer)
  - models/feature_cols.pkl (feature names)

**main.py**
- FastAPI web server
- Loads saved model files on startup
- Exposes two endpoints:

GET /health
- Returns ML service status

POST /predict
- Accepts 14 features as JSON
- Runs XGBoost prediction
- Calculates SHAP values
- Returns:
  {
    risk_score: 0.9999,
    risk_label: "high",
    at_risk: true,
    top_factors: [
      { feature: "missed_assignments", impact: 3.32 },
      { feature: "avg_logins", impact: 3.12 },
      { feature: "avg_score", impact: 2.28 }
    ]
  }

Start with: `python main.py`

---

## The Full Prediction Flow

When POST /api/predict/:studentId is called:

1. Node API queries PostgreSQL for student's engagement data
   SELECT AVG(login_count), AVG(forum_posts)... FROM engagement

2. Node API queries PostgreSQL for student's assessment data
   SELECT AVG(score), MIN(score), COUNT missed... FROM assessments

3. Node API queries PostgreSQL for student demographics
   SELECT gender, disability FROM students

4. Node API builds feature object with all 14 values

5. Node API sends POST request to Python ML service:
   http://localhost:8000/predict
   Body: { avg_logins: 1.2, avg_score: 38, ... }

6. Python ML service runs XGBoost prediction
   → risk_score = 0.9999

7. Python ML service runs SHAP analysis
   → top 3 factors that drove the score

8. Node API saves prediction to risk_scores table in PostgreSQL

9. Node API returns full result to caller

Total time: ~200ms

---

## Test Results So Far

**POST /api/students**
Created: John Doe, john@university.edu, 2026-spring
ID: 0122ecd5-b73e-4530-956c-d4f59d226875

**POST /api/engagement**
Logged 3 weeks of low engagement (1 login/week, no forum posts)

**POST /api/assessments**  
Logged 2 assessments with low scores (32, 28) both not submitted

**POST /api/predict/:id**
Result:
{
  risk_score: 0.9999,
  risk_label: "high",
  at_risk: true,
  top_factors: [
    { feature: "avg_logins", impact: 5.63 },
    { feature: "avg_score", impact: 4.03 },
    { feature: "missed_assignments", impact: ... }
  ]
}

---

## What's Next

### Sprint 3 — Auth + Caching
- JWT authentication (instructor login/register)
- Redis caching for predictions
- Claude AI intervention suggestions
- Cohort risk endpoint (get all students in a cohort)

### Sprint 4 — Frontend + Deploy
- Next.js dashboard
  - Risk heatmap for cohort
  - Individual student drill-down
  - SHAP visualization chart
  - Claude AI suggestion display
- Dockerize all 3 services
- GitHub Actions CI/CD
- AWS EC2 deployment

---

## Running Everything Locally

Terminal 1 — Infrastructure:
docker compose up -d

Terminal 2 — Node API:
cd apps/api
pnpm dev
(runs on port 5010)

Terminal 3 — ML Service:
cd apps/ml
.\venv\Scripts\activate
python main.py
(runs on port 8000)

Terminal 4 — Frontend (coming soon):
cd apps/web
pnpm dev
(runs on port 3000)

---

## Key Decisions Made

Port changed from 5000 to 5010
- Another process was running on 5000
- Updated in .env: PORT=5010

Synthetic data instead of OULAD dataset
- OULAD website was down
- Generated 10,000 students with realistic patterns
- Same structure as real data
- Easy to swap in real data later

gender and disability columns added later
- Missing from initial schema
- Added with ALTER TABLE command
- Fixed in schema.ts for future runs

submitted column added to assessments
- Missing from initial schema  
- Added with ALTER TABLE command
- Fixed in schema.ts for future runs