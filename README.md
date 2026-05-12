# 🎓 Student AI — Early Warning System

> Predicts which students are at risk of failing **4 weeks before it happens** — then tells instructors exactly what to do about it.

---

## 🚩 The Problem

Universities lose millions to dropouts every year. Traditional systems flag students **after** they fail. This system predicts risk weeks in advance so instructors can intervene early, before it's too late.

---

## ⚙️ How It Works

1. Students interact with the LMS — logins, forum posts, video watches, assignment submissions
2. All activity is **automatically tracked** in PostgreSQL in real time
3. XGBoost model scores each student **0–100** (risk score) using 14 behavioral features
4. SHAP explains **WHY**: _"missed 3 assignments, login count dropped 80%"_
5. Groq API generates a specific, actionable recommendation: _"Schedule a 1-on-1 check-in"_
6. Instructor sees this on the dashboard and acts
7. Every week, the model **automatically retrains** on real student data from PostgreSQL
8. Student can view their own risk score and progress on their personal portal
9. LangChain AI Agent monitors students autonomously and creates interventions
10. RAG Chatbot answers student questions using course materials via Pinecone

---

## 🚀 Tech Stack

| Layer               | Technology                                    |
| ------------------- | --------------------------------------------- |
| Frontend            | Next.js, TypeScript, Tailwind CSS (Port 3001) |
| Backend API         | Node.js, Express, TypeScript (Port 5010)      |
| ML Service          | Python, FastAPI, XGBoost, SHAP (Port 8000)    |
| AI Recommendations  | Groq API                                      |
| LLM Agent Framework | LangChain + Groq                              |
| Vector Database     | Pinecone (RAG)                                |
| Email Notifications | SendGrid                                      |
| Database            | PostgreSQL                                    |
| Cache               | Redis                                         |
| ML Tracking         | MLflow                                        |
| File Storage        | AWS S3                                        |
| Containerization    | Docker & Docker Compose                       |
| Cloud               | AWS EC2                                       |
| CI/CD               | GitHub Actions                                |

---

## 🧠 The ML Pipeline

### Training Data

- 10,000 synthetic students for initial training
- **Auto-retrains weekly on real PostgreSQL data** once students use the platform

### Features (14 total)

```
avg_logins, avg_forum_posts, avg_video_minutes, avg_submissions,
total_logins, login_trend, avg_score, min_score,
missed_assignments, submission_rate,
gender_enc, disability_enc, age_enc, edu_enc
```

### Model

- **XGBoost** — 100 trees, max depth 4, handles class imbalance automatically
- **SHAP** explainer generates top 3 risk factors per student
- **MLflow** tracks all experiments and model versions
- **Auto retraining** — weekly cron job retrains on latest PostgreSQL data
- **Drift detection** — alerts when model accuracy drops >10% from baseline

### Full Prediction Flow

```
Student activity in PostgreSQL
        ↓
Node.js API fetches 14 features
        ↓
POST http://ml-service:8000/predict
        ↓
XGBoost → risk_score (0-1)
SHAP   → top 3 factors
        ↓
Groq API → actionable suggestion
        ↓
Saved to risk_scores table
        ↓
Returned to instructor dashboard

Total time: ~200ms
```

### Auto Retraining + Drift Detection Flow

```
Weekly cron (scheduler.py)
        ↓
retrain.py fetches real data from PostgreSQL
        ↓
XGBoost retrains on latest student behavior
        ↓
AUC score saved to model_metrics table
        ↓
drift_detector.py compares vs baseline
        ↓
If drift > 10% → alert created + email sent
```

---

## 🤖 AI Features

### LangChain Agent

An autonomous AI agent that monitors all students and takes action:

- **Tools:** get_at_risk_students, get_student_details, get_cohort_summary, create_intervention, get_forum_sentiment
- Runs hourly via scheduler
- Instructors can query it directly via the dashboard chat interface
- Creates personalized interventions and study plans automatically

### RAG Chatbot (Pinecone)

Students can ask questions about course materials:

- Course materials ingested into Pinecone vector DB
- Student question → vector search → relevant context → Groq generates answer
- Student context (risk score, avg score) passed to personalize responses

### Sentiment Analysis

Every forum post is analyzed by Groq:

- Labels: positive, neutral, frustrated, confused, distressed
- Distressed posts → automatic alert created + email to instructor
- Sentiment badges shown on forum posts

### Model Drift Detection

- AUC scores tracked after every retraining
- Compares current vs baseline performance
- Alerts instructor if accuracy drops >10%
- Model health dashboard shows history

### Email Notifications (SendGrid)

Automated emails sent to assigned instructor when:

- Student posts distressed content
- AI agent creates intervention for at-risk student
- Model drift is detected

---

## 🏗️ Architecture

```
Browser (Instructor)              Browser (Student)
        │                                 │
        ▼                                 ▼
Next.js Frontend (3001) ─────────────────┘
        │
        ▼
Node.js API (5010)
        ├──▶ PostgreSQL (database)
        ├──▶ Redis (prediction cache)
        ├──▶ AWS S3 (video storage)
        ├──▶ SendGrid (email notifications)
        └──▶ Python FastAPI ML Service (8000)
                    ├──▶ Groq API (recommendations + sentiment)
                    ├──▶ Pinecone (RAG vector search)
                    ├──▶ LangChain Agent (autonomous monitoring)
                    ├──▶ scheduler.py (weekly retraining + hourly agent)
                    └──▶ drift_detector.py (model health monitoring)
```

---

## 📁 Project Structure

```
student-ai/
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD — auto deploy on git push
├── apps/
│   ├── api/                        # Node.js backend API
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── auth.ts             # Instructor auth
│   │       │   ├── student-auth.ts     # Student auth + activity tracking
│   │       │   ├── students.ts         # Student CRUD
│   │       │   ├── predict.ts          # ML predictions
│   │       │   ├── engagement.ts       # Engagement logging
│   │       │   ├── assessments.ts      # Assessment logging
│   │       │   ├── forum.ts            # Forum + sentiment analysis
│   │       │   ├── videos.ts           # Video management + S3 upload
│   │       │   ├── assignments.ts      # Assignments + grading
│   │       │   ├── alerts.ts           # AI agent alerts
│   │       │   ├── chat.ts             # RAG chatbot + agent proxy
│   │       │   ├── model.ts            # Model health + drift
│   │       │   └── upload.ts           # CSV bulk upload
│   │       ├── lib/
│   │       │   ├── s3.ts               # AWS S3 client
│   │       │   ├── sentiment.ts        # Sentiment analysis
│   │       │   └── email.ts            # SendGrid email notifications
│   │       ├── db.ts                   # PostgreSQL connection pool
│   │       ├── cache.ts                # Redis connection
│   │       └── index.ts                # Express server entry point
│   ├── ml/                         # Python FastAPI ML service
│   │   ├── main.py                     # FastAPI server + all endpoints
│   │   ├── train.py                    # Initial training on synthetic data
│   │   ├── retrain.py                  # Retraining on real PostgreSQL data
│   │   ├── scheduler.py                # Weekly retrain + hourly agent
│   │   ├── agent.py                    # Simple Python agent
│   │   ├── langchain_agent.py          # LangChain agent with tools
│   │   ├── rag.py                      # RAG pipeline with Pinecone
│   │   ├── drift_detector.py           # Model drift detection
│   │   ├── generate_data.py            # Synthetic data generation
│   │   └── models/                     # Saved model files
│   └── web/                        # Next.js frontend
│       ├── app/
│       │   ├── page.tsx                # Instructor login
│       │   ├── dashboard/              # Instructor dashboard
│       │   │   └── components/
│       │   │       ├── AlertsPanel.tsx
│       │   │       ├── AgentChat.tsx
│       │   │       ├── ModelHealth.tsx
│       │   │       ├── VideoManager.tsx
│       │   │       └── AssignmentManager.tsx
│       │   └── student/
│       │       ├── login/              # Student login
│       │       ├── register/           # Student registration
│       │       ├── dashboard/          # Student dashboard + components
│       │       ├── forum/              # Discussion forum + sentiment
│       │       ├── videos/             # Video player + watch tracking
│       │       ├── assignments/        # Assignment submission
│       │       └── chat/               # AI RAG chatbot
│       ├── store/                  # Zustand auth stores
│       └── hooks/                  # Custom React hooks
├── infra/                          # Infrastructure config
└── pipeline/                       # Data pipeline scripts
```

---

## 🗄️ Database Schema

```sql
students        → id, name, email, cohort, gender, disability, password_hash, enrolled_at, instructor_id
assessments     → id, student_id, week, score, submitted, submitted_at
engagement      → id, student_id, week, login_count, forum_posts, video_watch_minutes, assignment_submissions
risk_scores     → id, student_id, week, risk_score, risk_label, shap_factors (JSONB), predicted_at
instructors     → id, name, email, password, role
posts           → id, student_id, title, content, sentiment, sentiment_score, created_at
replies         → id, post_id, student_id, content, created_at
videos          → id, instructor_id, title, description, url, duration_minutes, created_at
assignments     → id, instructor_id, title, description, due_date, max_score, created_at
submissions     → id, assignment_id, student_id, score, answer, submitted_at
alerts          → id, student_id, alert_type, message, study_plan, is_read, created_at
model_metrics   → id, auc_score, data_size, at_risk_rate, created_at
```

---

## 📡 API Endpoints

### Instructor Auth

| Method | Endpoint             | Description         |
| ------ | -------------------- | ------------------- |
| POST   | `/api/auth/register` | Register instructor |
| POST   | `/api/auth/login`    | Instructor login    |

### Student Auth & Activity Tracking

| Method | Endpoint                                | Description                       |
| ------ | --------------------------------------- | --------------------------------- |
| POST   | `/api/student-auth/register`            | Student self-register             |
| POST   | `/api/student-auth/login`               | Student login (auto-tracks login) |
| GET    | `/api/student-auth/me`                  | Get student dashboard data        |
| POST   | `/api/student-auth/activity/forum`      | Log forum post                    |
| POST   | `/api/student-auth/activity/video`      | Log video watch                   |
| POST   | `/api/student-auth/activity/assignment` | Submit assignment                 |

### Forum

| Method | Endpoint                 | Description                      |
| ------ | ------------------------ | -------------------------------- |
| GET    | `/api/forum`             | Get all posts with sentiment     |
| POST   | `/api/forum`             | Create post (sentiment analyzed) |
| POST   | `/api/forum/:id/replies` | Reply to post                    |
| DELETE | `/api/forum/:id`         | Delete post                      |

### Videos

| Method | Endpoint                | Description                |
| ------ | ----------------------- | -------------------------- |
| GET    | `/api/videos`           | Get all videos             |
| POST   | `/api/videos`           | Add video via URL          |
| POST   | `/api/videos/upload`    | Upload video to S3         |
| DELETE | `/api/videos/:id`       | Delete video               |
| POST   | `/api/videos/:id/watch` | Mark watched (auto-tracks) |

### Assignments

| Method | Endpoint                                      | Description         |
| ------ | --------------------------------------------- | ------------------- |
| GET    | `/api/assignments`                            | Get all assignments |
| POST   | `/api/assignments`                            | Create assignment   |
| POST   | `/api/assignments/:id/submit`                 | Submit assignment   |
| PATCH  | `/api/assignments/:id/submissions/:sid/grade` | Grade submission    |

### Alerts & Agent

| Method | Endpoint               | Description                        |
| ------ | ---------------------- | ---------------------------------- |
| GET    | `/api/alerts`          | Get all alerts (instructor)        |
| GET    | `/api/alerts/my-plan`  | Get student's study plan           |
| PATCH  | `/api/alerts/:id/read` | Mark alert as read                 |
| POST   | `/api/chat`            | RAG chatbot (student)              |
| POST   | `/api/chat/agent`      | LangChain agent query (instructor) |
| GET    | `/api/model/drift`     | Model health + drift metrics       |

### ML Service (Port 8000)

| Method | Endpoint   | Description              |
| ------ | ---------- | ------------------------ |
| GET    | `/health`  | Health check             |
| POST   | `/predict` | Run ML prediction        |
| POST   | `/retrain` | Trigger retraining       |
| GET    | `/drift`   | Check model drift        |
| POST   | `/chat`    | RAG chatbot              |
| POST   | `/ingest`  | Add document to Pinecone |
| POST   | `/agent`   | Run LangChain agent      |

---

## 🔄 Activity Tracking (Auto)

| Action                            | What gets tracked                          |
| --------------------------------- | ------------------------------------------ |
| Student logs in                   | `login_count + 1`                          |
| Student creates forum post        | `forum_posts + 1` + sentiment analyzed     |
| Student replies to post           | `forum_posts + 1`                          |
| Student watches video to last 10s | `video_watch_minutes + duration`           |
| Student submits assignment        | `assignment_submissions + 1` + score saved |
| Distressed post detected          | Alert created + email to instructor        |

---

## 🖥️ Running Locally

### Prerequisites

- Docker & Docker Compose
- Node.js & pnpm
- Python 3.9+

### Full Docker Setup

```bash
git clone https://github.com/SamaUdaykiranReddy/student-ai.git
cd student-ai
docker compose -f docker-compose.prod.yml up --build -d
```

### Required Environment Variables

```
POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
REDIS_URL
JWT_SECRET
GROQ_API_KEY
PINECONE_API_KEY
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET
SENDGRID_API_KEY, INSTRUCTOR_EMAIL
ML_SERVICE_URL
```

---

## 🔄 CI/CD Pipeline

Every `git push` to `main` auto-deploys to AWS EC2 in ~20 seconds.

```
git push origin main → GitHub Actions → SSH into EC2 → git pull + docker compose up
```

---

## 🌐 Live Deployment

| Service           | URL                                    |
| ----------------- | -------------------------------------- |
| Instructor Portal | http://54.86.60.216:3001               |
| Student Portal    | http://54.86.60.216:3001/student/login |
| API               | http://54.86.60.216:5010               |
| ML Service        | http://54.86.60.216:8000               |

---

## 🔑 Key Design Decisions

**XGBoost over Neural Networks** — Works great on tabular data, no GPU needed, faster inference (~200ms), easier to explain with SHAP.

**SHAP for Explainability** — Raw risk scores aren't actionable. SHAP tells instructors the exact 3 reasons a student is flagged.

**LangChain for Agent Framework** — Industry standard for building AI agents. 5 custom tools give the agent full access to student data.

**Pinecone for RAG** — Most popular managed vector DB in production. Enables semantic search over course materials.

**Groq for LLM inference** — Hardware-accelerated LLM responses in milliseconds.

**Auto retraining on real data** — Model retrains weekly on actual student behavior. Gets smarter as more students use it.

**Sentiment analysis on forum** — Detects struggling students before they drop out, not after.

**Model drift detection** — Production ML systems degrade over time. Automatic monitoring ensures the model stays accurate.

**SendGrid for email** — Reliable transactional email with free tier. Alerts go to the student's assigned instructor specifically.

---

## 👤 Author

**Sama Udaykiran Reddy**  
[GitHub](https://github.com/SamaUdaykiranReddy)
