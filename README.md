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
4. SHAP explains **WHY**: *"missed 3 assignments, login count dropped 80%"*
5. Groq API generates a specific, actionable recommendation: *"Schedule a 1-on-1 check-in"*
6. Instructor sees this on the dashboard and acts
7. Every week, the model **automatically retrains** on real student data from PostgreSQL
8. Student can view their own risk score and progress on their personal portal

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS (Port 3001) |
| Backend API | Node.js, Express, TypeScript (Port 5010) |
| ML Service | Python, FastAPI, XGBoost, SHAP (Port 8000) |
| AI Recommendations | Groq API |
| Database | PostgreSQL |
| Cache | Redis |
| ML Tracking | MLflow |
| File Storage | AWS S3 |
| Containerization | Docker & Docker Compose |
| Cloud | AWS EC2 |
| CI/CD | GitHub Actions |

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

### Auto Retraining Flow
```
Weekly cron (scheduler.py)
        ↓
retrain.py fetches real data from PostgreSQL
        ↓
XGBoost retrains on latest student behavior
        ↓
New model saved + tracked in MLflow
        ↓
All future predictions use new model
```

---

## 🏗️ Architecture

```
Browser (Instructor)          Browser (Student)
        │                             │
        ▼                             ▼
Next.js Frontend (3001) ─────────────┘
        │
        ▼
Node.js API (5010)
        ├──▶ PostgreSQL (database)
        ├──▶ Redis (prediction cache)
        ├──▶ AWS S3 (video storage)
        └──▶ Python FastAPI ML Service (8000)
                    ├──▶ Groq API (recommendations)
                    └──▶ scheduler.py (weekly retraining)
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
│   │       │   ├── forum.ts            # Forum posts + replies
│   │       │   ├── videos.ts           # Video management + S3 upload
│   │       │   ├── assignments.ts      # Assignments + grading
│   │       │   └── upload.ts           # CSV bulk upload
│   │       ├── lib/
│   │       │   └── s3.ts               # AWS S3 client
│   │       ├── db.ts                   # PostgreSQL connection pool
│   │       ├── cache.ts                # Redis connection
│   │       └── index.ts                # Express server entry point
│   ├── ml/                         # Python FastAPI ML service
│   │   ├── main.py                     # FastAPI server + endpoints
│   │   ├── train.py                    # Initial training on synthetic data
│   │   ├── retrain.py                  # Retraining on real PostgreSQL data
│   │   ├── scheduler.py                # Weekly cron job
│   │   ├── generate_data.py            # Synthetic data generation
│   │   └── models/                     # Saved model files
│   └── web/                        # Next.js frontend
│       ├── app/
│       │   ├── page.tsx                # Instructor login
│       │   ├── dashboard/              # Instructor dashboard
│       │   │   └── components/
│       │   │       ├── VideoManager.tsx
│       │   │       └── AssignmentManager.tsx
│       │   └── student/
│       │       ├── login/              # Student login
│       │       ├── register/           # Student registration
│       │       ├── dashboard/          # Student dashboard + components
│       │       ├── forum/              # Discussion forum
│       │       ├── videos/             # Video player
│       │       └── assignments/        # Assignment submission
│       ├── store/                  # Zustand auth stores
│       └── hooks/                  # Custom React hooks
├── infra/                          # Infrastructure config
└── pipeline/                       # Data pipeline scripts
```

---

## 🗄️ Database Schema

```sql
students        → id, name, email, cohort, gender, disability, password_hash, enrolled_at
assessments     → id, student_id, week, score, submitted, submitted_at
engagement      → id, student_id, week, login_count, forum_posts, video_watch_minutes, assignment_submissions
risk_scores     → id, student_id, week, risk_score, risk_label, shap_factors (JSONB), predicted_at
instructors     → id, name, email, password, role
posts           → id, student_id, title, content, created_at
replies         → id, post_id, student_id, content, created_at
videos          → id, instructor_id, title, description, url, duration_minutes, created_at
assignments     → id, instructor_id, title, description, due_date, max_score, created_at
submissions     → id, assignment_id, student_id, score, answer, submitted_at
```

---

## 📡 API Endpoints

### Instructor Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register instructor |
| POST | `/api/auth/login` | Instructor login |

### Student Auth & Activity Tracking
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/student-auth/register` | Student self-register |
| POST | `/api/student-auth/login` | Student login (auto-tracks login count) |
| GET | `/api/student-auth/me` | Get student dashboard data |
| POST | `/api/student-auth/set-password` | Instructor sets student password |
| POST | `/api/student-auth/activity/forum` | Log forum post |
| POST | `/api/student-auth/activity/video` | Log video watch |
| POST | `/api/student-auth/activity/assignment` | Submit assignment |

### Students & Predictions
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/students` | Get all students |
| POST | `/api/students` | Add student |
| POST | `/api/predict/:id` | Run ML prediction for student |
| POST | `/api/upload/csv` | Bulk upload students via CSV |

### Forum
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/forum` | Get all posts |
| GET | `/api/forum/:id` | Get post + replies |
| POST | `/api/forum` | Create post (auto-tracks engagement) |
| POST | `/api/forum/:id/replies` | Reply to post (auto-tracks engagement) |

### Videos
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/videos` | Get all videos |
| POST | `/api/videos` | Add video via URL (instructor) |
| POST | `/api/videos/upload` | Upload video file to S3 (instructor) |
| DELETE | `/api/videos/:id` | Delete video (instructor) |
| POST | `/api/videos/:id/watch` | Mark as watched (auto-tracks engagement) |

### Assignments
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/assignments` | Get all assignments |
| GET | `/api/assignments/:id` | Get assignment + submissions |
| POST | `/api/assignments` | Create assignment (instructor) |
| DELETE | `/api/assignments/:id` | Delete assignment (instructor) |
| POST | `/api/assignments/:id/submit` | Submit assignment (student) |
| PATCH | `/api/assignments/:id/submissions/:sid/grade` | Grade submission (instructor) |

### ML Service (Port 8000)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/predict` | Run prediction on 14 features |
| POST | `/retrain` | Trigger manual retraining on PostgreSQL data |
| GET | `/model/status` | Model info and version |

---

## 🔄 Activity Tracking (Auto)

Every student action automatically updates their engagement data in PostgreSQL, which feeds the ML model:

| Action | What gets tracked |
|---|---|
| Student logs in | `login_count + 1` |
| Student creates forum post | `forum_posts + 1` |
| Student replies to post | `forum_posts + 1` |
| Student watches video to last 10s | `video_watch_minutes + duration` |
| Student submits assignment | `assignment_submissions + 1` + score saved |

---

## 🖥️ Running Locally

### Prerequisites
- Docker & Docker Compose
- Node.js & pnpm
- Python 3.9+

### Full Docker Setup (Recommended)
```bash
git clone https://github.com/SamaUdaykiranReddy/student-ai.git
cd student-ai
docker compose -f docker-compose.prod.yml up --build -d
```

### Access the App
| Service | URL |
|---|---|
| Instructor Portal | http://localhost:3001 |
| Student Portal | http://localhost:3001/student/login |
| API | http://localhost:5010 |
| ML Service | http://localhost:8000 |

---

## 🔄 CI/CD Pipeline

Every `git push` to `main` auto-deploys to AWS EC2 in ~20 seconds.

```
git push origin main
        ↓
GitHub Actions triggers
        ↓
SSH into EC2
        ↓
git pull + docker compose up --build -d
        ↓
All 8 containers restarted with new code
```

---

## 🌐 Live Deployment

| Service | URL |
|---|---|
| Instructor Portal | http://54.86.60.216:3001 |
| Student Portal | http://54.86.60.216:3001/student/login |
| API | http://54.86.60.216:5010 |
| ML Service | http://54.86.60.216:8000 |

---

## 🔑 Key Design Decisions

**XGBoost over Neural Networks** — Works great on tabular data, no GPU needed, faster inference (~200ms), easier to explain with SHAP.

**SHAP for Explainability** — Raw risk scores aren't actionable. SHAP tells instructors the exact 3 reasons a student is flagged, making the system trustworthy and useful.

**Groq for LLM inference** — Groq's hardware accelerator delivers LLM responses in milliseconds, keeping the dashboard fast.

**Auto retraining on real data** — Instead of relying on synthetic data forever, the model retrains weekly on actual student behavior from PostgreSQL. The more students use the platform, the smarter it gets.

**S3 for video storage** — Videos uploaded by instructors are stored in AWS S3 with presigned URLs for secure access. Survives server restarts unlike local storage.

**Mark as watched only at 90%** — Students must watch until the last 10 seconds before marking a video as watched, ensuring genuine engagement tracking.

**Separate student portal** — Students interact with the platform (forum, videos, assignments), generating real engagement data that feeds back into the ML model automatically.

---

## 👤 Author

**Sama Udaykiran Reddy**  
[GitHub](https://github.com/SamaUdaykiranReddy)