from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from backend.services.coral_service import CoralService
from backend.models.risk_models import ShowcaseResponse, ExecutedQuery, EvidenceResponse, RiskBreakdown
import datetime

router = APIRouter(prefix="/api/evidence", tags=["evidence"])

# Dependency to get our singleton Coral Service
# In a real app we'd use a dependency, here we can import or use a global instance
from backend.main import get_coral_service

# Flagship Showcase SQL queries
SHOWCASE_QUERIES = [
    {
        "name": "Showcase 1: Delivery Blockers (Notion + Slack)",
        "sql": """SELECT 
    c.name AS component, 
    n.task_name AS notion_task, 
    n.deadline AS deadline, 
    s.user AS slack_user, 
    s.text AS blocker_message, 
    s.timestamp AS slack_time
FROM components c
JOIN notion_tasks n ON c.id = n.component_id
JOIN slack_messages s ON c.id = s.component_id
WHERE n.status != 'Done' 
  AND s.is_blocker = 1
ORDER BY n.deadline ASC;""",
        "insight": "High-risk components where a critical Notion task is incomplete and teams are actively raising blocker flags on Slack. Immediately highlights delivery bottlenecks."
    },
    {
        "name": "Showcase 2: Quality Bottlenecks (GitHub Bugs + Stale PRs)",
        "sql": """SELECT 
    c.name AS component,
    i.title AS open_bug,
    i.severity AS bug_severity,
    p.title AS stale_pr,
    p.author AS pr_author,
    p.created_at AS pr_created
FROM components c
JOIN github_issues i ON c.id = i.component_id
JOIN github_pull_requests p ON c.id = p.component_id
WHERE i.status = 'open' 
  AND i.severity IN ('high', 'critical') 
  AND p.status = 'open' 
  AND p.is_stale = 1;""",
        "insight": "Highlights technical blockers where high-severity bugs are unresolved while code changes remain trapped in stale, unmerged Pull Requests."
    },
    {
        "name": "Showcase 3: Stale Work items & Deadline Slippage (Notion + GitHub)",
        "sql": """SELECT 
    c.name AS component,
    n.task_name AS task,
    n.deadline AS task_deadline,
    i.title AS high_severity_issue,
    i.severity AS severity
FROM components c
JOIN notion_tasks n ON c.id = n.component_id
JOIN github_issues i ON c.id = i.component_id
WHERE n.status != 'Done' 
  AND i.status = 'open' 
  AND i.severity IN ('high', 'critical')
ORDER BY n.deadline ASC;""",
        "insight": "Identifies items where upcoming deadlines are threatened by open critical or high-severity Github bugs, requiring immediate triage."
    },
    {
        "name": "Showcase 4: Active Risk Rankings (Latest Coral Computations)",
        "sql": """SELECT 
    c.name AS component,
    h.score AS current_risk_score,
    h.timestamp AS calculated_at,
    c.owner AS owner,
    c.team AS team
FROM components c
JOIN risk_history h ON c.id = h.component_id
WHERE h.id IN (SELECT MAX(id) FROM risk_history GROUP BY component_id)
ORDER BY h.score DESC;""",
        "insight": "Fetches the latest risk score calculated by the Coral Risk Engine for all active components, ranked in descending order."
    },
    {
        "name": "Showcase 5: Fastest Rising Risks (Historical Delta Joins)",
        "sql": """SELECT 
    c.name AS component,
    curr.score AS current_score,
    prev.score AS previous_score,
    (curr.score - prev.score) AS risk_increase_delta,
    c.owner AS owner
FROM components c
JOIN risk_history curr ON c.id = curr.component_id
JOIN risk_history prev ON c.id = prev.component_id
WHERE curr.id = (SELECT MAX(id) FROM risk_history WHERE component_id = c.id)
  AND prev.id = (SELECT MAX(id) FROM risk_history WHERE component_id = c.id AND id < curr.id)
ORDER BY risk_increase_delta DESC;""",
        "insight": "Uses historical risk records to find which components are accelerating into danger zones fastest, comparing current vs. previous scans."
    }
]

@router.get("/showcase", response_model=ShowcaseResponse)
def get_showcase_queries(coral_service: CoralService = Depends(get_coral_service)):
    queries = []
    for q in SHOWCASE_QUERIES:
        try:
            columns, rows = coral_service.execute_sql(q["sql"])
            queries.append(
                ExecutedQuery(
                    name=q["name"],
                    sql=q["sql"],
                    columns=columns,
                    rows=rows,
                    insight=q["insight"]
                )
            )
        except Exception as e:
            # Provide debug context in case of SQL issues during development
            print(f"[ERROR] Executing showcase query '{q['name']}': {e}")
            queries.append(
                ExecutedQuery(
                    name=q["name"],
                    sql=q["sql"],
                    columns=["Error"],
                    rows=[[str(e)]],
                    insight=f"Execution failed: {e}"
                )
            )
    return ShowcaseResponse(queries=queries)

@router.post("/query", response_model=Dict[str, Any])
def execute_arbitrary_query(body: Dict[str, str], coral_service: CoralService = Depends(get_coral_service)):
    sql = body.get("sql", "")
    if not sql:
        raise HTTPException(status_code=400, detail="SQL query is required")
        
    try:
        columns, rows = coral_service.execute_sql(sql)
        return {
            "columns": columns,
            "rows": rows,
            "status": "success"
        }
    except Exception as e:
        return {
            "columns": ["Error"],
            "rows": [[str(e)]],
            "status": "error"
        }
