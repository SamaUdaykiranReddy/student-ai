import psycopg2
import os
import json
from datetime import datetime, timedelta
from openai import OpenAI

groq_client = OpenAI(
    api_key=os.environ.get("GROQ_API_KEY"), base_url="https://api.groq.com/openai/v1"
)


def get_db_connection():
    return psycopg2.connect(
        host=os.environ.get("POSTGRES_HOST", "localhost"),
        port=os.environ.get("POSTGRES_PORT", 5432),
        user=os.environ.get("POSTGRES_USER", "student_ai"),
        password=os.environ.get("POSTGRES_PASSWORD", "student_ai_pass"),
        database=os.environ.get("POSTGRES_DB", "student_ai_db"),
    )


def generate_study_plan(student_name: str, issues: list, avg_score: float) -> str:
    """Generate personalized study plan using Groq"""
    issues_text = ", ".join(issues)

    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {
                "role": "system",
                "content": "You are an academic advisor. Generate a concise, actionable 3-step study plan.",
            },
            {
                "role": "user",
                "content": f"""Student: {student_name}
Issues detected: {issues_text}
Average score: {avg_score:.1f}%

Generate a personalized 3-step study plan to help this student improve.
Keep it encouraging and specific. Max 150 words.""",
            },
        ],
        max_tokens=200,
    )
    return response.choices[0].message.content


def run_agent():
    """Main agent loop - checks all students and generates interventions"""
    print(f"[{datetime.now()}] Agent running...")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get all students with their latest engagement and assessment data
        cur.execute("""
            SELECT 
                s.id, s.name, s.email, s.enrolled_at,
                e.login_count, e.forum_posts, e.assignment_submissions,
                e.week, e.recorded_at,
                AVG(a.score) as avg_score,
                COUNT(CASE WHEN a.submitted = false THEN 1 END) as missed_assignments
            FROM students s
            LEFT JOIN engagement e ON e.student_id = s.id 
                AND e.week = (SELECT MAX(week) FROM engagement WHERE student_id = s.id)
            LEFT JOIN assessments a ON a.student_id = s.id
            GROUP BY s.id, s.name, s.email, s.enrolled_at, 
                     e.login_count, e.forum_posts, e.assignment_submissions,
                     e.week, e.recorded_at
        """)

        students = cur.fetchall()
        alerts_created = 0

        for student in students:
            student_id = student[0]
            student_name = student[1]
            login_count = student[4] or 0
            assignment_submissions = student[6] or 0
            avg_score = float(student[9] or 50)
            missed_assignments = int(student[10] or 0)

            issues = []
            alert_type = None

            # Detect issues
            if login_count == 0:
                issues.append("no logins this week")
                alert_type = "no_login"
            elif login_count < 2:
                issues.append(f"very low login count ({login_count})")
                alert_type = "low_engagement"

            if missed_assignments >= 2:
                issues.append(f"missed {missed_assignments} assignments")
                alert_type = "missed_assignments"

            if avg_score < 50:
                issues.append(f"low average score ({avg_score:.1f}%)")
                alert_type = "low_score"

            if not issues:
                continue

            # Check if alert already exists for this student today
            cur.execute(
                """
                SELECT id FROM alerts 
                WHERE student_id = %s 
                AND created_at > NOW() - INTERVAL '24 hours'
            """,
                (student_id,),
            )

            if cur.fetchone():
                continue  # Skip if already alerted today

            # Generate study plan
            study_plan = generate_study_plan(student_name, issues, avg_score)

            # Create alert message
            message = f"Student {student_name} needs attention: {', '.join(issues)}"

            # Save alert to DB
            cur.execute(
                """
                INSERT INTO alerts (student_id, alert_type, message, study_plan)
                VALUES (%s, %s, %s, %s)
            """,
                (student_id, alert_type, message, study_plan),
            )

            alerts_created += 1
            print(f"  Alert created for {student_name}: {', '.join(issues)}")

        conn.commit()
        print(f"[{datetime.now()}] Agent complete. {alerts_created} alerts created.")

    except Exception as e:
        print(f"Agent error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_agent()
