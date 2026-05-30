import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.services.coral_service import CoralService
from backend.config import PORT, HOST

app = FastAPI(
    title="Engineering Risk Radar API",
    description="Coral-Centric AI-powered engineering risk prediction backend.",
    version="1.0.0"
)

# Enable CORS for Next.js frontend calls (typically port 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all during local dev / hackathon demos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global singleton Coral Service representing our Unified SQL Data Layer
_coral_service_instance = CoralService()

def get_coral_service() -> CoralService:
    """Dependency helper to retrieve the Coral Service singleton"""
    return _coral_service_instance

# Import and include routers (routers are imported after defining get_coral_service to avoid circular reference)
from backend.routes.risks import router as risks_router
from backend.routes.evidence import router as evidence_router
from backend.routes.chat import router as chat_router

app.include_router(risks_router)
app.include_router(evidence_router)
app.include_router(chat_router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Engineering Risk Radar API",
        "layer": "Coral SQL Unified Engine"
    }

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)
