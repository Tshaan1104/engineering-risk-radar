from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from backend.services.coral_service import CoralService
from backend.services.risk_engine import RiskEngine
from backend.models.risk_models import Component, EvidenceResponse, RiskBreakdown, DynamicEventInput, ExecutedQuery
import datetime

router = APIRouter(prefix="/api/risks", tags=["risks"])

from backend.main import get_coral_service

@router.get("", response_model=List[Component])
def get_all_components(coral_service: CoralService = Depends(get_coral_service)):
    risk_engine = RiskEngine(coral_service)
    
    # Query all active component IDs from Coral
    _, comp_rows = coral_service.execute_sql("SELECT id FROM components")
    
    results = []
    for row in comp_rows:
        comp_id = row[0]
        try:
            comp = risk_engine.calculate_component_risk(comp_id)
            results.append(comp)
        except Exception as e:
            print(f"[ERROR] Calculating risk for {comp_id}: {e}")
            
    # Sort by risk score descending
    results.sort(key=lambda x: x.current_score, reverse=True)
    return results

@router.get("/{component_id}", response_model=Component)
def get_component_risk(component_id: str, coral_service: CoralService = Depends(get_coral_service)):
    risk_engine = RiskEngine(coral_service)
    try:
        return risk_engine.calculate_component_risk(component_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{component_id}/evidence", response_model=EvidenceResponse)
def get_component_evidence(component_id: str, coral_service: CoralService = Depends(get_coral_service)):
    risk_engine = RiskEngine(coral_service)
    
    # 1. Fetch details of the component
    comp_sql = "SELECT name FROM components WHERE id = ?"
    _, comp_rows = coral_service.execute_sql(comp_sql, (component_id,))
    if not comp_rows:
        raise HTTPException(status_code=404, detail="Component not found")
        
    comp_name = comp_rows[0][0]
    
    # 2. Re-calculate to extract scores and query rows
    deadline_score, dl_sql, dl_cols, dl_rows = risk_engine.calculate_deadline_risk(component_id)
    bug_score, bug_sql, bug_cols, bug_rows = risk_engine.calculate_bug_risk(component_id)
    blocker_score, bl_sql, bl_cols, bl_rows = risk_engine.calculate_blocker_risk(component_id)
    stale_score, pr_sql, pr_cols, pr_rows = risk_engine.calculate_stale_pr_risk(component_id)
    
    total_score = deadline_score + bug_score + blocker_score + stale_score
    
    breakdown = RiskBreakdown(
        deadline_risk=deadline_score,
        bug_risk=bug_score,
        blocker_risk=blocker_score,
        stale_pr_risk=stale_score,
        total_score=total_score
    )
    
    # 3. Determine active data sources
    sources = []
    if dl_rows:
        sources.append("Notion")
    if bug_rows or pr_rows:
        sources.append("GitHub")
    if bl_rows:
        sources.append("Slack")
        
    # If no active rows returned, default to empty list (but display in UI)
    if not sources:
        sources = ["System Default"]
        
    # 4. Package executing queries
    queries = [
        ExecutedQuery(
            name="Notion Active Deadlines Query",
            sql=dl_sql,
            columns=dl_cols,
            rows=dl_rows,
            insight=f" deadline score = {deadline_score} points based on earliest uncompleted milestone."
        ),
        ExecutedQuery(
            name="GitHub Open Bugs Query",
            sql=bug_sql,
            columns=bug_cols,
            rows=bug_rows,
            insight=f"Bug score = {bug_score} points. Critical (15pt), High (10pt), Medium (5pt) open issues."
        ),
        ExecutedQuery(
            name="Slack Blocker Chat Analysis",
            sql=bl_sql,
            columns=bl_cols,
            rows=bl_rows,
            insight=f"Blocker score = {blocker_score} points. Searched for explicit blockers (12pt) and keywords (6pt)."
        ),
        ExecutedQuery(
            name="GitHub Stale PRs Code Integrity",
            sql=pr_sql,
            columns=pr_cols,
            rows=pr_rows,
            insight=f"Stale PR score = {stale_score} points. Each open stale PR adds 10 points."
        )
    ]
    
    return EvidenceResponse(
        component_id=component_id,
        component_name=comp_name,
        breakdown=breakdown,
        sources=sources,
        queries=queries
    )

@router.post("/sync", response_model=Dict[str, str])
def sync_scores(coral_service: CoralService = Depends(get_coral_service)):
    risk_engine = RiskEngine(coral_service)
    
    # Fetch all component IDs
    _, comp_rows = coral_service.execute_sql("SELECT id FROM components")
    
    # Compute and log scores to the SQL risk_history table
    for row in comp_rows:
        comp_id = row[0]
        comp = risk_engine.calculate_component_risk(comp_id)
        coral_service.log_risk_score(comp_id, comp.current_score)
        
    return {"status": "success", "message": "Global Coral risk sync completed and scores pushed to historical records."}

@router.post("/simulate", response_model=Component)
def simulate_event(event: DynamicEventInput, coral_service: CoralService = Depends(get_coral_service)):
    risk_engine = RiskEngine(coral_service)
    
    # 1. Before modifying the database, log the CURRENT score as a historical entry
    # This guarantees that the subsequent analysis calculates a delta correctly!
    try:
        prev_comp = risk_engine.calculate_component_risk(event.component_id)
        coral_service.log_risk_score(event.component_id, prev_comp.current_score)
    except Exception as e:
        print(f"[WARN] Failed logging pre-simulation score: {e}")
        
    # 2. Inject event into appropriate SQLite table
    if event.event_type == "slack_blocker":
        coral_service.inject_slack_blocker(
            component_id=event.component_id,
            author="System Simulator",
            text=event.content
        )
    elif event.event_type == "github_bug":
        coral_service.inject_github_bug(
            component_id=event.component_id,
            title=event.content,
            severity=event.severity or "medium",
            assignee="Developer"
        )
    elif event.event_type == "github_pr":
        coral_service.inject_github_pr(
            component_id=event.component_id,
            title=event.content,
            author="Developer",
            is_stale=True
        )
    elif event.event_type == "notion_deadline":
        deadline_days = event.deadline_days if event.deadline_days is not None else 1
        coral_service.inject_notion_task(
            component_id=event.component_id,
            task_name=event.content,
            assignee="Developer",
            deadline_days=deadline_days,
            priority="High"
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid event type")
        
    # 3. Recalculate fresh risk and return it!
    new_comp = risk_engine.calculate_component_risk(event.component_id)
    return new_comp
