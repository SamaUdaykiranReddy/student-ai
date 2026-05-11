import os
import psycopg2
import json
from datetime import datetime
from langchain_groq import ChatGroq
from langchain.agents import AgentExecutor, create_react_agent
from langchain.tools import tool
from langchain.prompts import PromptTemplate

# Initialize Groq LLM
llm = ChatGroq(
    api_key=os.environ.get("GROQ_API_KEY"),
    model_name="llama-3.3-70b-versatile",
    temperature=0.3,
)


def get_db_connection():
    return psycopg2.connect(
        host=os.environ.get("POSTGRES_HOST", "localhost"),
        port=os.environ.get("POSTGRES_PORT", 5432),
        user=os.environ.get("POSTGRES_USER", "student_ai"),
        password=os.environ.get("POSTGRES_PASSWORD", "student_ai_pass"),
        database=os.environ.get("POSTGRES_DB", "student_ai_db"),
    )


@tool
def get_at_risk_students(threshold: str = "0.5") -> str:
    """Get all students with high risk scores or poor engagement.
    Use this to find which students need attention."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT s.name, s.email,
                   e.login_count, e.forum_posts, e.assignment_submissions,
                   AVG(a.score) as avg_score,
                   COUNT(CASE WHEN a.submitted = false THEN 1 END) as missed
            FROM students s
            LEFT JOIN engagement e ON e.student_id = s.id
                AND e.week = (SELECT MAX(week) FROM engagement WHERE student_id = s.id)
            LEFT JOIN assessments a ON a.student_id = s.id
            GROUP BY s.name, s.email, e.login_count, e.forum_posts, e.assignment_submissions
            HAVING AVG(a.score) < 60
                OR e.login_count < 2
                OR COUNT(CASE WHEN a.submitted = false THEN 1 END) >= 2
            ORDER BY AVG(a.score) ASC
            LIMIT 5
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        if not rows:
            return "No at-risk students found."

        result = []
        for row in rows:
            result.append(
                {
                    "name": row[0],
                    "email": row[1],
                    "login_count": row[2] or 0,
                    "forum_posts": row[3] or 0,
                    "assignment_submissions": row[4] or 0,
                    "avg_score": round(float(row[5] or 0), 1),
                    "missed_assignments": int(row[6] or 0),
                }
            )
        return json.dumps(result)
    except Exception as e:
        return f"Error: {str(e)}"


@tool
def get_student_details(student_name: str) -> str:
    """Get detailed information about a specific student.
    Pass just the name e.g: Sophia Thomas"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT s.id, s.name, s.email, s.cohort,
                   e.login_count, e.forum_posts, e.video_watch_minutes,
                   e.assignment_submissions, e.week
            FROM students s
            LEFT JOIN engagement e ON e.student_id = s.id
                AND e.week = (SELECT MAX(week) FROM engagement WHERE student_id = s.id)
            WHERE s.name ILIKE %s
        """,
            (f"%{student_name.strip()}%",),
        )
        student = cur.fetchone()

        if not student:
            return f"Student '{student_name}' not found."

        cur.execute(
            """
            SELECT week, score, submitted FROM assessments
            WHERE student_id = %s ORDER BY week DESC LIMIT 5
        """,
            (student[0],),
        )
        assessments = cur.fetchall()

        cur.close()
        conn.close()

        result = {
            "name": student[1],
            "email": student[2],
            "cohort": student[3],
            "engagement": {
                "login_count": student[4] or 0,
                "forum_posts": student[5] or 0,
                "video_watch_minutes": student[6] or 0,
                "assignment_submissions": student[7] or 0,
            },
            "assessments": [
                {"week": a[0], "score": a[1], "submitted": a[2]} for a in assessments
            ],
        }
        return json.dumps(result)
    except Exception as e:
        return f"Error: {str(e)}"


@tool
def get_cohort_summary(cohort_name: str = "all") -> str:
    """Get a summary of student performance for all cohorts.
    Use 'all' to get all cohorts."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT s.cohort,
                   COUNT(DISTINCT s.id) as total_students,
                   ROUND(AVG(a.score)::numeric, 1) as avg_score,
                   COUNT(CASE WHEN a.submitted = false THEN 1 END) as total_missed
            FROM students s
            LEFT JOIN assessments a ON a.student_id = s.id
            GROUP BY s.cohort
            ORDER BY AVG(a.score) ASC
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        result = []
        for row in rows:
            result.append(
                {
                    "cohort": row[0],
                    "total_students": int(row[1]),
                    "avg_score": float(row[2] or 0),
                    "total_missed_assignments": int(row[3] or 0),
                }
            )
        return json.dumps(result)
    except Exception as e:
        return f"Error: {str(e)}"


@tool
def create_intervention(input_str: str) -> str:
    """Create and save a personalized intervention alert for a student.
    Input format: 'student_name|issues' e.g. 'Harper Clark|no logins, missed assignments'
    """
    try:
        parts = input_str.split("|")
        if len(parts) < 2:
            student_name = parts[0].strip()
            issues = "poor engagement and low performance"
        else:
            student_name = parts[0].strip()
            issues = parts[1].strip()

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            "SELECT id FROM students WHERE name ILIKE %s", (f"%{student_name}%",)
        )
        student = cur.fetchone()
        if not student:
            return f"Student '{student_name}' not found."

        student_id = student[0]

        cur.execute(
            """
            SELECT id FROM alerts
            WHERE student_id = %s AND created_at > NOW() - INTERVAL '24 hours'
        """,
            (student_id,),
        )
        if cur.fetchone():
            cur.close()
            conn.close()
            return f"Alert already exists for {student_name} today."

        from openai import OpenAI

        groq_client = OpenAI(
            api_key=os.environ.get("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are an academic advisor. Generate a concise 3-step study plan in under 100 words.",
                },
                {
                    "role": "user",
                    "content": f"Student: {student_name}\nIssues: {issues}\nGenerate an encouraging 3-step study plan.",
                },
            ],
            max_tokens=150,
        )
        study_plan = response.choices[0].message.content

        cur.execute(
            """
            INSERT INTO alerts (student_id, alert_type, message, study_plan)
            VALUES (%s, %s, %s, %s)
        """,
            (
                student_id,
                "langchain_intervention",
                f"LangChain Agent: {issues}",
                study_plan,
            ),
        )

        conn.commit()
        cur.close()
        conn.close()
        return f"Intervention created for {student_name}."
    except Exception as e:
        return f"Error: {str(e)}"


@tool
def get_forum_sentiment(limit: str = "5") -> str:
    """Analyze recent forum posts for student sentiment.
    Use this to detect students who are struggling emotionally."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT p.title, p.content, s.name
            FROM posts p
            JOIN students s ON p.student_id = s.id
            ORDER BY p.created_at DESC
            LIMIT %s
        """,
            (int(limit),),
        )
        posts = cur.fetchall()
        cur.close()
        conn.close()

        if not posts:
            return "No forum posts found."

        posts_text = "\n".join([f"{p[2]}: {p[0]}" for p in posts])
        return f"Recent forum posts:\n{posts_text}"
    except Exception as e:
        return f"Error: {str(e)}"


# ---- AGENT SETUP ----

tools = [
    get_at_risk_students,
    get_student_details,
    get_cohort_summary,
    create_intervention,
    get_forum_sentiment,
]

prompt = PromptTemplate.from_template("""You are an AI academic monitoring agent.
Your job is to monitor student performance and create interventions for at-risk students.
Be concise and efficient - use minimum tool calls needed.

IMPORTANT tool input formats:
- get_at_risk_students: pass threshold as string e.g. "0.5"
- get_student_details: pass just the name e.g. "Sophia Thomas"
- get_cohort_summary: pass "all" or cohort name
- create_intervention: pass "student_name|issues" e.g. "Harper Clark|no logins, missed 3 assignments"
- get_forum_sentiment: pass number as string e.g. "5"

You have access to these tools:
{tools}

Use this format:
Question: the input question
Thought: think about what to do
Action: tool name from [{tool_names}]
Action Input: input for the tool
Observation: tool result
Thought: next thought
Final Answer: your conclusion

Question: {input}
Thought:{agent_scratchpad}""")

agent = create_react_agent(llm, tools, prompt)
agent_executor = AgentExecutor(
    agent=agent, tools=tools, verbose=True, max_iterations=5, handle_parsing_errors=True
)


def run_langchain_agent(query: str = None) -> str:
    """Run the LangChain agent with a query"""
    if not query:
        query = (
            "Find the top 3 most at-risk students and create interventions for them."
        )

    try:
        result = agent_executor.invoke({"input": query})
        return result.get("output", "Agent completed task.")
    except Exception as e:
        return f"Agent error: {str(e)}"


if __name__ == "__main__":
    print(f"[{datetime.now()}] Running LangChain Agent...")
    result = run_langchain_agent()
    print(f"\nAgent Result:\n{result}")
