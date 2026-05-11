import schedule
import time
import subprocess
from datetime import datetime


def retrain():
    print(f"[{datetime.now()}] Running scheduled retraining...")
    subprocess.run(["python", "retrain.py"])
    print(f"[{datetime.now()}] Retraining complete!")


def run_agent():
    print(f"[{datetime.now()}] Running AI agent...")
    subprocess.run(["python", "agent.py"])
    print(f"[{datetime.now()}] Agent complete!")


# Retrain every Sunday at midnight
schedule.every().sunday.at("00:00").do(retrain)

# Run agent every hour
schedule.every().hour.do(run_agent)

# Run both immediately on startup
print("Scheduler started.")
print("- Retraining: every Sunday at midnight")
print("- AI Agent: every hour")

# Run agent immediately
run_agent()

while True:
    schedule.run_pending()
    time.sleep(30)
