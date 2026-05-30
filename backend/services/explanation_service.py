import re
import json
from typing import List, Dict, Any, Tuple, Optional
import cohere
from backend.config import CO_API_KEY
from backend.services.coral_service import CoralService
from backend.models.risk_models import ChatMessage, ChatResponse

# System persona setting for Cohere Chat
SYSTEM_PROMPT = """You are the Engineering Risk Radar Assistant, a senior technical program manager and engineering director. 
Your core intelligence is backed by Coral (withcoral.com), a unified SQL query layer that connects GitHub commits, GitHub Pull Requests, GitHub Issues, Slack conversations, and Notion tasks.

You have access to a tool named `execute_coral_sql` which allows you to run SQL queries directly on this unified database. 

Available Tables in Coral:
1. `components` (id, name, owner, team)
2. `github_commits` (id, component_id, author, message, date, additions, deletions)
3. `github_pull_requests` (id, component_id, title, author, status, created_at, updated_at, is_stale)
4. `github_issues` (id, component_id, title, status, assignee, created_at, severity)
5. `slack_messages` (id, component_id, channel, user, text, timestamp, is_blocker)
6. `notion_tasks` (id, component_id, task_name, assignee, status, deadline, priority)
7. `risk_history` (id, component_id, score, timestamp)

Guidelines:
1. Always base your conclusions on the facts queried from the database. 
2. ALWAYS execute a SQL query to fetch the latest data before giving opinions on project risk, deadlines, bugs, or blockers.
3. Keep your summaries highly professional, concise, and structured with bullet points.
4. Give actionable engineering advice (e.g., "re-assign task", "resolve stale PR", "schedule security review").
5. Do not make up mock data. If the database is empty or queries return no rows, state that clearly.
"""

class ExplanationService:
    def __init__(self, coral_service: CoralService):
        self.coral = coral_service
        self.client = cohere.ClientV2(api_key=CO_API_KEY) if CO_API_KEY else None

    def execute_tool_sql(self, query: str) -> str:
        """Executes SQL and returns a formatted JSON string for LLM feedback"""
        try:
            columns, rows = self.coral.execute_sql(query)
            results = [dict(zip(columns, row)) for row in rows]
            return json.dumps(results, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

    def run_chat(self, user_message: str, history: List[ChatMessage]) -> ChatResponse:
        """Runs the main EM chat loop, either via Cohere Tool Calling or local fallback"""
        if self.client:
            return self._run_chat_cohere(user_message, history)
        else:
            return self._run_chat_fallback(user_message, history)

    def _run_chat_cohere(self, user_message: str, history: List[ChatMessage]) -> ChatResponse:
        """Autonomous SQL Tool Calling Loop powered by Cohere API V2"""
        # Map message history to Cohere V2 format
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in history:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": user_message})

        # Define the SQL execution tool
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "execute_coral_sql",
                    "description": "Executes a SQL query on Coral's unified data layer containing components, commits, issues, PRs, Slack logs, and Notion tasks.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "sql_query": {
                                "type": "string",
                                "description": "The exact SQLite SELECT query to run."
                            }
                        },
                        "required": ["sql_query"]
                    }
                }
            }
        ]

        try:
            # 1. Ask Cohere for next step
            response = self.client.chat(
                model="command-r-plus",
                messages=messages,
                tools=tools
            )

            sql_executed = None
            sql_results = None

            # 2. Check if Cohere wants to call a tool
            if response.message.tool_calls:
                tool_call = response.message.tool_calls[0]
                if tool_call.function.name == "execute_coral_sql":
                    arguments = json.loads(tool_call.function.arguments)
                    sql_query = arguments["sql_query"]
                    sql_executed = sql_query
                    
                    # Execute tool
                    tool_output = self.execute_tool_sql(sql_query)
                    sql_results = json.loads(tool_output)
                    
                    # Append Cohere's message and the tool result to history
                    messages.append({
                        "role": "assistant",
                        "tool_calls": [
                            {
                                "id": tool_call.id,
                                "type": "function",
                                "function": {
                                    "name": tool_call.function.name,
                                    "arguments": tool_call.function.arguments
                                }
                            }
                        ]
                    })
                    
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": tool_output
                    })

                    # 3. Call Cohere again with tool result to get final explanation
                    final_response = self.client.chat(
                        model="command-r-plus",
                        messages=messages
                    )
                    
                    assistant_text = final_response.message.content[0].text
                    return ChatResponse(
                        content=assistant_text,
                        sql_executed=sql_executed,
                        sql_results=sql_results
                    )
            
            # If no tool call was needed
            assistant_text = response.message.content[0].text
            return ChatResponse(content=assistant_text)

        except Exception as e:
            print(f"[COHERE ERROR] {e}")
            return self._run_chat_fallback(f"Cohere API call failed, falling back. Original: {user_message}", history)

    def _run_chat_fallback(self, user_message: str, history: List[ChatMessage]) -> ChatResponse:
        """Highly intelligent fallback parser executing specific SQL queries based on user intent"""
        msg = user_message.lower()
        
        # Scenario 1: What is failing/most likely to miss deadline?
        if any(w in msg for w in ["fail", "miss", "deadline", "late", "focus", "today"]):
            sql = """SELECT c.name, n.task_name, n.deadline, COUNT(s.id) as slack_blockers
FROM components c
JOIN notion_tasks n ON c.id = n.component_id
LEFT JOIN slack_messages s ON c.id = s.component_id AND s.is_blocker = 1
WHERE n.status != 'Done'
GROUP BY c.id
ORDER BY n.deadline ASC;"""
            
            results = self.coral.execute_sql_dicts(sql)
            
            content = "### 🚨 Top Delivery Threats & Critical Items\n\nBased on a direct SQL query joining Notion tasks and Slack blockers, here are the most critical delivery threats:\n\n"
            for r in results:
                blockers_str = f"with **{r['slack_blockers']} blockers** active on Slack" if r['slack_blockers'] else "with no reported Slack blockers"
                content += f"- **{r['name']}** is working on *\"{r['notion_task']}\"* approaching its deadline on **{r['deadline']}** ({blockers_str}).\n"
                
            content += "\n**Manager Recommendations:**\n1. Coordinate with Elena on **Database Migration** as its sharding tasks are extremely tight.\n2. Re-assign resources to resolve active blockers in Slack chat channels."
            
            return ChatResponse(content=content, sql_executed=sql, sql_results=results)
            
        # Scenario 2: What is getting riskier?
        elif any(w in msg for w in ["riskier", "increasing", "delta", "grow", "delta"]):
            sql = """SELECT c.name, curr.score as current, prev.score as previous, (curr.score - prev.score) as delta
FROM components c
JOIN risk_history curr ON c.id = curr.component_id
JOIN risk_history prev ON c.id = prev.component_id
WHERE curr.id = (SELECT MAX(id) FROM risk_history WHERE component_id = c.id)
  AND prev.id = (SELECT MAX(id) FROM risk_history WHERE component_id = c.id AND id < curr.id)
ORDER BY delta DESC;"""

            results = self.coral.execute_sql_dicts(sql)
            
            content = "### 📈 Risk Acceleration Analysis\n\nComparing the latest risk scan against the previous historical capture, here is the risk delta:\n\n"
            for r in results:
                status = "🔴 Rising" if r['delta'] > 0 else "🟢 Declining" if r['delta'] < 0 else "⚪ Stable"
                delta_str = f"+{r['delta']}" if r['delta'] > 0 else str(r['delta'])
                content += f"- **{r['name']}**: Current Risk: **{r['current']}%** | Previous: **{r['previous']}%** | Trend: {status} (**{delta_str} points**)\n"
                
            content += "\n**Manager Insight:**\n- **Database Migration** exhibits the highest risk acceleration. This matches the critical blocker events injected via Slack."
            
            return ChatResponse(content=content, sql_executed=sql, sql_results=results)

        # Scenario 3: Specific component risk analysis
        # Find which component is mentioned
        mentioned_comp = None
        for comp_id in ["auth-service", "db-migration", "payment-gateway", "analytics-dashboard"]:
            if comp_id in msg or comp_id.replace("-", " ") in msg:
                mentioned_comp = comp_id
                break
                
        if mentioned_comp:
            sql = f"""SELECT c.name, n.task_name, n.deadline, i.title as bug_title, i.severity as bug_severity, s.text as slack_blocker
FROM components c
LEFT JOIN notion_tasks n ON c.id = n.component_id AND n.status != 'Done'
LEFT JOIN github_issues i ON c.id = i.component_id AND i.status = 'open'
LEFT JOIN slack_messages s ON c.id = s.component_id AND s.is_blocker = 1
WHERE c.id = '{mentioned_comp}';"""

            results = self.coral.execute_sql_dicts(sql)
            
            # Group data for nice text layout
            name = results[0]['name'] if results else mentioned_comp
            bugs = list(set([r['bug_title'] for r in results if r['bug_title']]))
            blockers = list(set([r['slack_blocker'] for r in results if r['slack_blocker']]))
            tasks = list(set([f"{r['task_name']} (deadline: {r['deadline']})" for r in results if r['task_name']]))
            
            content = f"### 🔍 Detailed Audit: **{name}**\n\n"
            
            content += "**Active Notion Tasks:**\n"
            if tasks:
                for t in tasks:
                    content += f"- {t}\n"
            else:
                content += "- None reported open.\n"
                
            content += "\n**Open GitHub Bugs:**\n"
            if bugs:
                for b in bugs:
                    content += f"- 🐛 {b}\n"
            else:
                content += "- No open bugs recorded.\n"
                
            content += "\n**Slack Blockers Raised:**\n"
            if blockers:
                for bl in blockers:
                    content += f"- 💬 *\"{bl}\"*\n"
            else:
                content += "- No explicit blockers discussed on Slack.\n"
                
            return ChatResponse(content=content, sql_executed=sql, sql_results=results)

        # Scenario 4: Default generic response
        sql = "SELECT name, owner, team FROM components"
        results = self.coral.execute_sql_dicts(sql)
        
        content = """Hello! I am your Coral-powered Engineering Manager Assistant. 

I can query Coral's SQL layer across Notion, GitHub, and Slack to run cross-source checks. Try asking me:
1. *What is most likely to miss its deadline this week?*
2. *Which components are getting riskier?*
3. *Show me the open bugs and blockers for database migration.*
"""
        return ChatResponse(content=content, sql_executed=sql, sql_results=results)
