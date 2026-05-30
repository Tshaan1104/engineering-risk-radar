import datetime
from typing import Dict, Any, List, Tuple
from backend.services.coral_service import CoralService
from backend.models.risk_models import RiskBreakdown, Component, ExecutedQuery

class RiskEngine:
    def __init__(self, coral_service: CoralService):
        self.coral = coral_service

    def calculate_deadline_risk(self, component_id: str) -> Tuple[float, str, List[str], List[List[Any]]]:
        """
        Calculates Deadline Risk (0-30 points) based on Notion tasks.
        Returns (sub_score, sql_query, columns, rows).
        """
        sql = """SELECT task_name, deadline, priority, status 
FROM notion_tasks 
WHERE component_id = ? AND status != 'Done';"""
        
        columns, rows = self.coral.execute_sql(sql, (component_id,))
        
        if not rows:
            return 0.0, sql, columns, rows
            
        today = datetime.date.today()
        max_risk = 30.0
        earliest_days = 999
        
        # Row index mapping: task_name=0, deadline=1, priority=2, status=3
        for row in rows:
            deadline_str = row[1]
            try:
                deadline_date = datetime.date.fromisoformat(deadline_str)
                days_left = (deadline_date - today).days
                if days_left < earliest_days:
                    earliest_days = days_left
            except Exception:
                pass
                
        # Scoring logic
        if earliest_days <= 0:
            score = max_risk  # Overdue
        elif earliest_days == 1:
            score = 25.0
        elif earliest_days == 2:
            score = 20.0
        elif earliest_days <= 5:
            score = 12.0
        elif earliest_days <= 10:
            score = 6.0
        else:
            score = 0.0
            
        return score, sql, columns, rows

    def calculate_bug_risk(self, component_id: str) -> Tuple[float, str, List[str], List[List[Any]]]:
        """
        Calculates Open Bug Risk (0-25 points) based on open GitHub issues.
        Returns (sub_score, sql_query, columns, rows).
        """
        sql = """SELECT title, severity, status, assignee 
FROM github_issues 
WHERE component_id = ? AND status = 'open';"""
        
        columns, rows = self.coral.execute_sql(sql, (component_id,))
        
        if not rows:
            return 0.0, sql, columns, rows
            
        score = 0.0
        # Row index mapping: title=0, severity=1, status=2, assignee=3
        for row in rows:
            severity = row[1].lower()
            if severity == "critical":
                score += 15.0
            elif severity == "high":
                score += 10.0
            elif severity == "medium":
                score += 5.0
            else:
                score += 2.0
                
        # Cap at 25 points
        score = min(score, 25.0)
        return score, sql, columns, rows

    def calculate_blocker_risk(self, component_id: str) -> Tuple[float, str, List[str], List[List[Any]]]:
        """
        Calculates Slack Blocker Risk (0-25 points) based on blocker keywords or explicit blocker tags.
        Returns (sub_score, sql_query, columns, rows).
        """
        sql = """SELECT user, text, timestamp, is_blocker 
FROM slack_messages 
WHERE component_id = ? 
  AND (is_blocker = 1 
       OR text LIKE '%blocked%' 
       OR text LIKE '%waiting%' 
       OR text LIKE '%stuck%');"""
       
        columns, rows = self.coral.execute_sql(sql, (component_id,))
        
        if not rows:
            return 0.0, sql, columns, rows
            
        score = 0.0
        # Row index mapping: user=0, text=1, timestamp=2, is_blocker=3
        for row in rows:
            is_blocker = row[3]
            text = row[1].lower()
            
            if is_blocker == 1:
                score += 12.0
            elif "blocked" in text or "stuck" in text:
                score += 6.0
            elif "waiting" in text:
                score += 3.0
                
        # Cap at 25 points
        score = min(score, 25.0)
        return score, sql, columns, rows

    def calculate_stale_pr_risk(self, component_id: str) -> Tuple[float, str, List[str], List[List[Any]]]:
        """
        Calculates Stale PR Risk (0-20 points) based on open, stale GitHub PRs.
        Returns (sub_score, sql_query, columns, rows).
        """
        sql = """SELECT title, author, created_at, is_stale 
FROM github_pull_requests 
WHERE component_id = ? 
  AND status = 'open' 
  AND is_stale = 1;"""
  
        columns, rows = self.coral.execute_sql(sql, (component_id,))
        
        if not rows:
            return 0.0, sql, columns, rows
            
        score = len(rows) * 10.0
        # Cap at 20 points
        score = min(score, 20.0)
        return score, sql, columns, rows

    def calculate_component_risk(self, component_id: str) -> Component:
        """
        Runs the full SQL-driven risk calculation for a component.
        """
        # Fetch Component details
        comp_sql = "SELECT name, owner, team FROM components WHERE id = ?"
        comp_cols, comp_rows = self.coral.execute_sql(comp_sql, (component_id,))
        if not comp_rows:
            raise ValueError(f"Component '{component_id}' not found.")
            
        name, owner, team = comp_rows[0][0], comp_rows[0][1], comp_rows[0][2]
        
        # Calculate sub-scores and gather evidence SQLs
        deadline_score, dl_sql, dl_cols, dl_rows = self.calculate_deadline_risk(component_id)
        bug_score, bug_sql, bug_cols, bug_rows = self.calculate_bug_risk(component_id)
        blocker_score, bl_sql, bl_cols, bl_rows = self.calculate_blocker_risk(component_id)
        stale_score, pr_sql, pr_cols, pr_rows = self.calculate_stale_pr_risk(component_id)
        
        total_score = deadline_score + bug_score + blocker_score + stale_score
        
        # Log this calculated score to risk history for trend logging
        # To avoid duplicate logs in the exact same second, we can log dynamically
        # In a real app we'd do this per scan sync. Here, we log on sync triggers.
        
        # Get historical scores from database to compute previous score and delta
        hist_sql = "SELECT score FROM risk_history WHERE component_id = ? ORDER BY id DESC LIMIT 1"
        _, hist_rows = self.coral.execute_sql(hist_sql, (component_id,))
        
        previous_score = total_score
        if hist_rows:
            previous_score = hist_rows[0][0]
            
        delta = total_score - previous_score
        
        # Map score to risk level
        if total_score >= 80:
            risk_level = "Critical"
        elif total_score >= 55:
            risk_level = "High"
        elif total_score >= 30:
            risk_level = "Medium"
        else:
            risk_level = "Low"
            
        # Compile a primary risk reason from SQL facts
        reasons = []
        if deadline_score >= 20:
            reasons.append("Task deadline is critical or overdue (< 2 days left)")
        if bug_score >= 15:
            reasons.append("High volume of critical open GitHub bugs")
        if blocker_score >= 12:
            reasons.append("Active blockers raised on Slack team channels")
        if stale_score >= 10:
            reasons.append("Trapped PRs causing code velocity stagnation")
            
        primary_reason = ", ".join(reasons) if reasons else "No immediate delivery risk detected."
        
        breakdown = RiskBreakdown(
            deadline_risk=deadline_score,
            bug_risk=bug_score,
            blocker_risk=blocker_score,
            stale_pr_risk=stale_score,
            total_score=total_score
        )
        
        return Component(
            id=component_id,
            name=name,
            owner=owner,
            team=team,
            current_score=total_score,
            previous_score=previous_score,
            delta=delta,
            risk_level=risk_level,
            primary_reason=primary_reason,
            breakdown=breakdown
        )
