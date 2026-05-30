from fastapi import APIRouter, Depends, HTTPException
from backend.services.coral_service import CoralService
from backend.services.explanation_service import ExplanationService
from backend.models.risk_models import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["chat"])

from backend.main import get_coral_service

@router.post("", response_model=ChatResponse)
def execute_chat(request: ChatRequest, coral_service: CoralService = Depends(get_coral_service)):
    try:
        explanation_service = ExplanationService(coral_service)
        return explanation_service.run_chat(
            user_message=request.message,
            history=request.history
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat execution failed: {str(e)}")
