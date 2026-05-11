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
    model_name="llama-3.1-8b-instant",
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


# ---- TOOLS ----


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
    """Get detailed information about a specific student including their
    engagement history, assessments, and risk scores."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get student info
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
            (f"%{student_name}%",),
        )
        student = cur.fetchone()

        if not student:
            return f"Student '{student_name}' not found."

        # Get assessments
        cur.execute(
            """
            SELECT week, score, submitted FROM assessments 
            WHERE student_id = %s ORDER BY week DESC LIMIT 5
        """,
            (student[0],),
        )
        assessments = cur.fetchall()

        # Get latest risk score
        cur.execute(
            """
            SELECT risk_score, risk_label, shap_factors 
            FROM risk_scores WHERE student_id = %s 
            ORDER BY predicted_at DESC LIMIT 1
        """,
            (student[0],),
        )
        risk = cur.fetchone()

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
                "week": student[8] or 0,
            },
            "assessments": [
                {"week": a[0], "score": a[1], "submitted": a[2]} for a in assessments
            ],
            "risk": (
                {
                    "score": float(risk[0]) if risk else None,
                    "label": risk[1] if risk else None,
                }
                if risk
                else None
            ),
        }
        return json.dumps(result)
    except Exception as e:
        return f"Error: {str(e)}"


@tool
def get_cohort_summary(cohort_name: str = "all") -> str:
    """Get a summary of student performance for a specific cohort or all cohorts.
    Use this to compare cohort performance."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        if cohort_name == "all":
            cur.execute("""
                SELECT s.cohort,
                       COUNT(DISTINCT s.id) as total_students,
                       AVG(a.score) as avg_score,
                       COUNT(CASE WHEN a.submitted = false THEN 1 END) as total_missed
                FROM students s
                LEFT JOIN assessments a ON a.student_id = s.id
                GROUP BY s.cohort
                ORDER BY AVG(a.score) ASC
            """)
        else:
            cur.execute(
                """
                SELECT s.cohort,
                       COUNT(DISTINCT s.id) as total_students,
                       AVG(a.score) as avg_score,
                       COUNT(CASE WHEN a.submitted = false THEN 1 END) as total_missed
                FROM students s
                LEFT JOIN assessments a ON a.student_id = s.id
                WHERE s.cohort ILIKE %s
                GROUP BY s.cohort
            """,
                (f"%{cohort_name}%",),
            )

        rows = cur.fetchall()
        cur.close()
        conn.close()

        result = []
        for row in rows:
            result.append(
                {
                    "cohort": row[0],
                    "total_students": int(row[1]),
                    "avg_score": round(float(row[2] or 0), 1),
                    "total_missed_assignments": int(row[3] or 0),
                }
            )
        return json.dumps(result)
    except Exception as e:
        return f"Error: {str(e)}"


@tool
def create_intervention(student_name: str, issues: str) -> str:
    """Create and save a personalized intervention alert for a student.
    Use this after identifying a student who needs help."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get student ID
        cur.execute(
            "SELECT id FROM students WHERE name ILIKE %s", (f"%{student_name}%",)
        )
        student = cur.fetchone()
        if not student:
            return f"Student '{student_name}' not found."

        student_id = student[0]

        # Check if alert exists today
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

        # Generate study plan using Groq
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
                    "content": "You are an academic advisor. Generate a concise 3-step study plan.",
                },
                {
                    "role": "user",
                    "content": f"Student: {student_name}\nIssues: {issues}\nGenerate an encouraging 3-step study plan in 150 words.",
                },
            ],
            max_tokens=200,
        )
        study_plan = response.choices[0].message.content

        # Save alert
        cur.execute(
            """
            INSERT INTO alerts (student_id, alert_type, message, study_plan)
            VALUES (%s, %s, %s, %s)
        """,
            (
                student_id,
                "agent_intervention",
                f"LangChain Agent: {issues}",
                study_plan,
            ),
        )

        conn.commit()
        cur.close()
        conn.close()
        return f"Intervention created for {student_name} with personalized study plan."
    except Exception as e:
        return f"Error: {str(e)}"


@tool
def get_forum_sentiment(limit: str = "10") -> str:
    """Analyze recent forum posts for student sentiment and distress signals.
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

        posts_text = "\n".join([f"{p[2]}: {p[0]} - {p[1][:100]}" for p in posts])

        # Use Groq to analyze sentiment
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
                    "content": "Analyze student forum posts for sentiment. Identify any students showing signs of stress, confusion, or disengagement. Be concise.",
                },
                {
                    "role": "user",
                    "content": f"Analyze these forum posts:\n{posts_text}",
                },
            ],
            max_tokens=300,
        )
        return response.choices[0].message.content
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

prompt = PromptTemplate.from_template(
    """You are an AI academic monitoring agent for a university.
Your job is to proactively monitor student performance, identify at-risk students, 
and create personalized interventions.

You have access to the following tools:
{tools}

Use the following format:
Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Question: {input}
Thought:{agent_scratchpad}"""
)

agent = create_react_agent(llm, tools, prompt)
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    max_iterations=10,
    handle_parsing_errors=True,
)


def run_langchain_agent(query: str = None) -> str:
    """Run the LangChain agent with a query or default monitoring task"""
    if not query:
        query = """
        Perform a complete student monitoring check:
        1. Find all at-risk students
        2. Get details on the most at-risk student
        3. Create interventions for students who need help
        4. Analyze forum sentiment
        5. Provide a summary of the cohort performance
        """

    try:
        result = agent_executor.invoke({"input": query})
        return result.get("output", "Agent completed task.")
    except Exception as e:
        return f"Agent error: {str(e)}"


if __name__ == "__main__":
    print(f"[{datetime.now()}] Running LangChain Agent...")
    result = run_langchain_agent()
    print(f"\nAgent Result:\n{result}")
