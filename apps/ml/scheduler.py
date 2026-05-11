import schedule
import time
import subprocess
from datetime import datetime


def retrain():
    print(f"[{datetime.now()}] Running scheduled retraining...")
    subprocess.run(["python", "retrain.py"])
    print(f"[{datetime.now()}] Retraining complete!")


def run_agent():
    print(f"[{datetime.now()}] Running LangChain AI agent...")
    subprocess.run(["python", "langchain_agent.py"])
    print(f"[{datetime.now()}] Agent complete!")


# Retrain every Sunday at midnight
schedule.every().sunday.at("00:00").do(retrain)

# Run LangChain agent every hour
schedule.every().hour.do(run_agent)

print("Scheduler started.")
print("- Retraining: every Sunday at midnight")
print("- LangChain Agent: every hour")

# Run agent immediately on startup
run_agent()

while True:
    schedule.run_pending()
    time.sleep(30)
