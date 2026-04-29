# Student AI — Early Warning System

Predicts which students are at risk of failing 4 weeks before it happens.

## The Problem
Universities lose millions to dropouts. Traditional systems flag students after they fail. This system predicts risk weeks in advance so instructors can intervene.

## How It Works
1. Student activity is logged — logins, posts, submissions, scores
2. XGBoost model scores each student 0-100 (risk score)
3. SHAP explains WHY: "missed 3 assignments, login count dropped 80%"
4. Claude AI generates: "Schedule a 1-on-1 check-in"
5. Instructor sees this on dashboard and acts

## Tech Stack
- Frontend: Next.js, TypeScript, Tailwind
- Backend: Node.js, Express, TypeScript
- ML Service: Python, FastAPI, XGBoost, SHAP
- Database: PostgreSQL
- Cache: Redis
- ML Tracking: MLflow
- Deploy: Docker, AWS, GitHub Actions

## Running Locally
# Start DB
docker compose up -d
# API
cd apps/api && pnpm dev
# ML Service
cd apps/ml && python main.py
# Frontend
cd apps/web && pnpm dev