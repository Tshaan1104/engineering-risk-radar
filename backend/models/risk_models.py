from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class RiskBreakdown(BaseModel):
    deadline_risk: float
    bug_risk: float
    blocker_risk: float
    stale_pr_risk: float
    total_score: float

class Component(BaseModel):
    id: str
    name: str
    owner: str
    team: str
    current_score: float
    previous_score: float
    delta: float
    risk_level: str  # 'Low', 'Medium', 'High', 'Critical'
    primary_reason: str
    breakdown: RiskBreakdown

class EvidenceItem(BaseModel):
    id: str
    source: str  # 'GitHub', 'Slack', 'Notion'
    item_type: str  # 'Bug', 'Stale PR', 'Blocker', 'Deadline'
    content: str
    timestamp: str
    impact_score: float

class ExecutedQuery(BaseModel):
    name: str
    sql: str
    columns: List[str]
    rows: List[List[Any]]
    insight: str

class EvidenceResponse(BaseModel):
    component_id: str
    component_name: str
    breakdown: RiskBreakdown
    sources: List[str]
    queries: List[ExecutedQuery]

class DynamicEventInput(BaseModel):
    component_id: str
    event_type: str  # 'slack_blocker', 'github_bug', 'github_pr', 'notion_deadline'
    content: str     # message or ticket title
    severity: Optional[str] = "medium"  # low, medium, high, critical
    deadline_days: Optional[int] = None # days from now for deadline

class ChatMessage(BaseModel):
    role: str  # 'user', 'assistant'
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage]

class ChatResponse(BaseModel):
    content: str
    sql_executed: Optional[str] = None
    sql_results: Optional[List[Dict[str, Any]]] = None

class ShowcaseResponse(BaseModel):
    queries: List[ExecutedQuery]

class HealthSummaryResponse(BaseModel):
    summary: str
    critical_path: List[str]
    last_sync: str
