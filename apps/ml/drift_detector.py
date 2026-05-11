import psycopg2
import os
from datetime import datetime


def get_db_connection():
    return psycopg2.connect(
        host=os.environ.get("POSTGRES_HOST", "localhost"),
        port=os.environ.get("POSTGRES_PORT", 5432),
        user=os.environ.get("POSTGRES_USER", "student_ai"),
        password=os.environ.get("POSTGRES_PASSWORD", "student_ai_pass"),
        database=os.environ.get("POSTGRES_DB", "student_ai_db"),
    )


def check_drift():
    """Check if model performance has drifted significantly"""
    print(f"[{datetime.now()}] Checking model drift...")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT auc_score, data_size, at_risk_rate, created_at
            FROM model_metrics
            ORDER BY created_at DESC
            LIMIT 5
        """)
        metrics = cur.fetchall()

        if len(metrics) < 2:
            print("Not enough metrics history to detect drift.")
            return

        current_auc = metrics[0][0]
        baseline_auc = max(m[0] for m in metrics[1:])
        drift = baseline_auc - current_auc
        drift_pct = (drift / baseline_auc) * 100

        print(f"Current AUC: {current_auc:.4f}")
        print(f"Baseline AUC: {baseline_auc:.4f}")
        print(f"Drift: {drift_pct:.1f}%")

        if drift_pct > 10:
            cur.execute("SELECT id FROM students LIMIT 1")
            sample_student = cur.fetchone()

            if sample_student:
                cur.execute(
                    """
                    INSERT INTO alerts (student_id, alert_type, message, study_plan)
                    VALUES (%s, %s, %s, %s)
                """,
                    (
                        sample_student[0],
                        "model_drift",
                        f"⚠️ Model drift detected! AUC dropped from {baseline_auc:.4f} to {current_auc:.4f} ({drift_pct:.1f}% drop).",
                        f"Recommended actions:\n1. Collect more student data\n2. Review feature engineering\n3. Trigger manual retraining\n4. Current data size: {metrics[0][1]} students",
                    ),
                )
                conn.commit()
                print(
                    f"⚠️ Drift alert created! {drift_pct:.1f}% performance drop detected."
                )
        else:
            print(f"✅ Model performance stable. Drift: {drift_pct:.1f}%")

    except Exception as e:
        print(f"Drift detection error: {e}")
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    check_drift()
