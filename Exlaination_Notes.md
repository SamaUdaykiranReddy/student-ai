# Explain Like I'm 5 — Student AI Project

This file explains everything we built in plain English.
No technical jargon. Read this before interviews.

---

## What are we building?

Imagine you're a university professor with 500 students.
Some of them are going to fail or drop out.
But you don't know WHO until it's too late.

Our system watches what students do every week:
- How often do they log in?
- Are they submitting assignments?
- What are their scores?
- Do they participate in forums?

Then it says: "Hey professor, John is 99% likely to fail 
in 4 weeks. Here's why. Here's what you should do."

That's it. That's the whole project.

---

## The 5 pieces we built

### Piece 1 — The Database (PostgreSQL)
Think of this as a giant Excel spreadsheet in the cloud.
We store everything here permanently:
- Student names and emails
- Their weekly login counts
- Their assignment scores
- The risk predictions we make

Why PostgreSQL specifically?
Because our data has relationships.
A student HAS assessments. Assessments BELONG TO a student.
PostgreSQL handles these relationships perfectly.

We have 4 tables (4 spreadsheet tabs):
- students → who they are
- engagement → what they do each week
- assessments → how they score
- risk_scores → what our AI predicts

### Piece 2 — The Cache (Redis)
Think of Redis like a sticky note on your desk.

Without Redis:
Every time someone asks "is John at risk?" we have to:
- Look up all his data (slow)
- Run the AI model (slow)
- Return the answer

That takes ~200ms every single time.

With Redis:
First time: run the AI, write answer on sticky note
Every time after: just read the sticky note (~5ms)

The sticky note expires after 1 hour.
After that we recalculate and write a new one.

We haven't built this yet — it's coming in Sprint 3.

### Piece 3 — The API (Node.js)
Think of this as the waiter in a restaurant.

The frontend (dashboard) never talks directly to the 
database or the AI model.
Everything goes through the API.

Frontend says: "Give me John's risk score"
API says: "Sure, let me get that for you"
API goes to database, gets data
API goes to AI model, gets prediction
API comes back: "Here's John's risk score: 99%"

Our API runs on port 5010 and has these endpoints:

GET  /health → "Is the API alive?"
GET  /api/students → "Show me all students"
POST /api/students → "Add a new student"
POST /api/engagement → "Log this week's activity"
POST /api/assessments → "Log this assessment score"
POST /api/predict/:id → "Predict risk for this student"

### Piece 4 — The AI Model (Python + XGBoost)
This is the brain of the whole system.

We trained it on 10,000 fake students.
Each student had 10 weeks of activity data.
We told it which students ended up at risk.
It learned the PATTERN.

Now when we give it a new student's data,
it can predict whether they'll be at risk.

It looks at 14 things about each student:
- How often they log in
- Their average score
- How many assignments they missed
- Whether engagement is going up or down
- etc.

It returns a risk score between 0 and 1.
0.0 = totally fine
0.5 = concerning
0.9 = very likely to fail

We use XGBoost because:
- Works great with small datasets (our 10k students)
- Much faster than neural networks
- Doesn't need a GPU
- Very accurate on tabular data (rows and columns)

### Piece 5 — The Explainer (SHAP)
The AI model alone isn't enough.

If it just says "John is 99% at risk" — so what?
The professor doesn't know what to do with that.

SHAP explains WHY:
"John is 99% at risk because:
 1. He missed 3 assignments (biggest factor)
 2. His login count dropped to 1/week
 3. His average score is 38%"

NOW the professor knows what to do:
- Email John about the missed assignments
- Check if he's having personal problems
- Offer extra tutoring

SHAP makes the AI trustworthy and actionable.

---

## How the pieces talk to each other