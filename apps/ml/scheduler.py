import schedule
import time
import subprocess
from datetime import datetime

def retrain():
    print(f"[{datetime.now()}] Running scheduled retraining...")
    subprocess.run(["python", "retrain.py"])
    print(f"[{datetime.now()}] Scheduled retraining complete!")

# Run every Sunday at midnight
schedule.every().sunday.at("00:00").do(retrain)

# Also run immediately on startup to test
print("Scheduler started. Retraining every Sunday at midnight.")
print("Running initial retrain in 60 seconds...")
schedule.every(60).seconds.do(retrain).tag("once")

while True:
    schedule.run_pending()
    # Remove the one-time job after it runs
    for job in schedule.get_jobs("once"):
        if job.last_run:
            schedule.cancel_job(job)
    time.sleep(30)