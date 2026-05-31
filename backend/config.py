import os
from dotenv import load_dotenv

# Load env variables from a .env file if it exists
load_dotenv()

CO_API_KEY = os.getenv("CO_API_KEY", "")
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "127.0.0.1")

# Coral Integration Settings
CORAL_PATH = os.getenv("CORAL_PATH", "coral")
CORAL_COMPATIBILITY_MODE = os.getenv("CORAL_COMPATIBILITY_MODE", "auto").lower()

# Coral Integration Authentication Tokens
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
SLACK_TOKEN = os.getenv("SLACK_TOKEN", "")
NOTION_TOKEN = os.getenv("NOTION_TOKEN", "")

# Coral Target Repository Configuration
GITHUB_OWNER = os.getenv("GITHUB_OWNER", "withcoral")
GITHUB_REPO = os.getenv("GITHUB_REPO", "coral")

# Debug prints to confirm env load
print(f"[CONFIG] Cohere API Key present: {bool(CO_API_KEY)}")
print(f"[CONFIG] Coral Path: '{CORAL_PATH}' | Compatibility Mode: '{CORAL_COMPATIBILITY_MODE}'")
print(f"[CONFIG] Target Repo: {GITHUB_OWNER}/{GITHUB_REPO}")
print(f"[CONFIG] Tokens loaded - GitHub: {bool(GITHUB_TOKEN)} | Slack: {bool(SLACK_TOKEN)} | Notion: {bool(NOTION_TOKEN)}")

