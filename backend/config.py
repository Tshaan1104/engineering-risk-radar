import os
from dotenv import load_dotenv

# Load env variables from a .env file if it exists
load_dotenv()

CO_API_KEY = os.getenv("CO_API_KEY", "")
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "127.0.0.1")

# Debug prints to confirm env load
print(f"[CONFIG] Cohere API Key present: {bool(CO_API_KEY)}")
