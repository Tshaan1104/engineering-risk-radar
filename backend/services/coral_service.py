import sqlite3
import datetime
from typing import List, Dict, Any, Tuple

class CoralService:
    def __init__(self):
        # Create an in-memory SQLite database acting as our local Coral SQL Unified Layer
        self.conn = sqlite3.connect(":memory:", check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.init_db()
        self.seed_data()

    def init_db(self):
        cursor = self.conn.cursor()
        
        # 1. Components table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS components (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                owner TEXT NOT NULL,
                team TEXT NOT NULL
            )
        """)

        # 2. GitHub Commits table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS github_commits (
                id TEXT PRIMARY KEY,
                component_id TEXT NOT NULL,
                author TEXT NOT NULL,
                message TEXT NOT NULL,
                date TEXT NOT NULL,
                additions INTEGER NOT NULL,
                deletions INTEGER NOT NULL,
                FOREIGN KEY (component_id) REFERENCES components(id)
            )
        """)

        # 3. GitHub Pull Requests table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS github_pull_requests (
                id TEXT PRIMARY KEY,
                component_id TEXT NOT NULL,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                status TEXT NOT NULL, -- 'open', 'merged', 'closed'
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                is_stale INTEGER NOT NULL DEFAULT 0, -- 0 or 1
                FOREIGN KEY (component_id) REFERENCES components(id)
            )
        """)

        # 4. GitHub Issues table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS github_issues (
                id TEXT PRIMARY KEY,
                component_id TEXT NOT NULL,
                title TEXT NOT NULL,
                status TEXT NOT NULL, -- 'open', 'closed'
                assignee TEXT NOT NULL,
                created_at TEXT NOT NULL,
                severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
                FOREIGN KEY (component_id) REFERENCES components(id)
            )
        """)

        # 5. Slack Messages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS slack_messages (
                id TEXT PRIMARY KEY,
                component_id TEXT NOT NULL,
                channel TEXT NOT NULL,
                user TEXT NOT NULL,
                text TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                is_blocker INTEGER NOT NULL DEFAULT 0, -- 0 or 1
                FOREIGN KEY (component_id) REFERENCES components(id)
            )
        """)

        # 6. Notion Tasks table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notion_tasks (
                id TEXT PRIMARY KEY,
                component_id TEXT NOT NULL,
                task_name TEXT NOT NULL,
                assignee TEXT NOT NULL,
                status TEXT NOT NULL, -- 'To Do', 'In Progress', 'Done'
                deadline TEXT NOT NULL,
                priority TEXT NOT NULL, -- 'Low', 'Medium', 'High'
                FOREIGN KEY (component_id) REFERENCES components(id)
            )
        """)

        # 7. Risk History table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS risk_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                component_id TEXT NOT NULL,
                score INTEGER NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (component_id) REFERENCES components(id)
            )
        """)

        self.conn.commit()

    def seed_data(self):
        cursor = self.conn.cursor()
        
        # Clear existing data just in case of re-seeding
        cursor.execute("DELETE FROM risk_history")
        cursor.execute("DELETE FROM notion_tasks")
        cursor.execute("DELETE FROM slack_messages")
        cursor.execute("DELETE FROM github_issues")
        cursor.execute("DELETE FROM github_pull_requests")
        cursor.execute("DELETE FROM github_commits")
        cursor.execute("DELETE FROM components")

        today = datetime.date.today()
        d_minus_1 = (today - datetime.timedelta(days=1)).isoformat()
        d_minus_2 = (today - datetime.timedelta(days=2)).isoformat()
        d_minus_3 = (today - datetime.timedelta(days=3)).isoformat()
        d_minus_5 = (today - datetime.timedelta(days=5)).isoformat()
        d_minus_7 = (today - datetime.timedelta(days=7)).isoformat()
        d_minus_10 = (today - datetime.timedelta(days=10)).isoformat()

        d_plus_1 = (today + datetime.timedelta(days=1)).isoformat()
        d_plus_2 = (today + datetime.timedelta(days=2)).isoformat()
        d_plus_5 = (today + datetime.timedelta(days=5)).isoformat()
        d_plus_12 = (today + datetime.timedelta(days=12)).isoformat()
        d_plus_20 = (today + datetime.timedelta(days=20)).isoformat()

        # Seed Components
        components = [
            ("auth-service", "Authentication Service", "Shaan", "Platform Security"),
            ("db-migration", "Database Migration", "Elena", "Data Platform"),
            ("payment-gateway", "Payment Gateway Integration", "Marcus", "Billing & Checkout"),
            ("analytics-dashboard", "Analytics Dashboard", "Sophia", "Growth & Metrics")
        ]
        cursor.executemany("INSERT INTO components VALUES (?, ?, ?, ?)", components)

        # Seed Notion Tasks
        notion_tasks = [
            # Auth Service - Medium-High Risk (Approaching Deadline, Stale Items)
            ("task-auth-1", "auth-service", "Upgrade JWT Library & Add Token Rotation", "Shaan", "In Progress", d_plus_2, "High"),
            ("task-auth-2", "auth-service", "Implement MFA Support (SMS & Authenticator)", "Alex", "To Do", d_plus_5, "High"),
            
            # DB Migration - Critical Risk (Overdue / Immediate Deadline, Heavy blockers)
            ("task-db-1", "db-migration", "Shard Users Table & Migrate to PostgreSQL Cluster", "Elena", "In Progress", d_plus_1, "High"),
            ("task-db-2", "db-migration", "Validate Replica Latency and Run Performance Tests", "Raj", "To Do", d_plus_2, "Medium"),

            # Payment Gateway - Low-Medium Risk (Comfortable Deadline, No Blockers)
            ("task-pay-1", "payment-gateway", "Integrate Stripe Elements v3 SDK", "Marcus", "In Progress", d_plus_12, "Medium"),
            ("task-pay-2", "payment-gateway", "Set up Webhook Verification Handlers", "Marcus", "To Do", d_plus_20, "Low"),

            # Analytics Dashboard - Low Risk
            ("task-an-1", "analytics-dashboard", "Build Real-Time Active Sessions Pipeline", "Sophia", "Done", d_minus_2, "High"),
            ("task-an-2", "analytics-dashboard", "Export Analytics Data to CSV/Excel Format", "Dave", "In Progress", d_plus_20, "Low")
        ]
        cursor.executemany("INSERT INTO notion_tasks VALUES (?, ?, ?, ?, ?, ?, ?)", notion_tasks)

        # Seed GitHub Pull Requests
        prs = [
            # Auth Service
            ("pr-auth-1", "auth-service", "Security: Patch JWT decryption check vulnerability", "Shaan", "open", d_minus_7, d_minus_5, 1),
            ("pr-auth-2", "auth-service", "Feature: Add Redis session caching layer", "Alex", "open", d_minus_3, d_minus_1, 0),

            # DB Migration
            ("pr-db-1", "db-migration", "Infra: Postgres 15 migration scripts & indexes", "Elena", "open", d_minus_10, d_minus_7, 1),
            ("pr-db-2", "db-migration", "WIP: Sharding script with backup validation", "Elena", "open", d_minus_2, d_minus_2, 0),

            # Payment Gateway
            ("pr-pay-1", "payment-gateway", "Refactor: Modular Stripe charge triggers", "Marcus", "merged", d_minus_5, d_minus_3, 0),
            ("pr-pay-2", "payment-gateway", "SDK: Add Stripe v3 core webhook wrapper", "Marcus", "open", d_minus_1, d_minus_1, 0)
        ]
        cursor.executemany("INSERT INTO github_pull_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?)", prs)

        # Seed GitHub Issues
        issues = [
            # Auth Service
            ("iss-auth-1", "auth-service", "Memory leak in JWT rotation scheduler loop", "open", "Shaan", d_minus_3, "high"),
            ("iss-auth-2", "auth-service", "MFA SMS callback timing out in sandbox mode", "open", "Alex", d_minus_2, "medium"),

            # DB Migration
            ("iss-db-1", "db-migration", "Postgres replica cluster experiences OOM during dump", "open", "Elena", d_minus_5, "critical"),
            ("iss-db-2", "db-migration", "Migration rollback script fails on foreign-key cascades", "open", "Raj", d_minus_2, "high"),
            ("iss-db-3", "db-migration", "Indexing stats not generating for user partitioned tables", "open", "Elena", d_minus_3, "medium"),

            # Payment Gateway
            ("iss-pay-1", "payment-gateway", "Webhook rejects valid test payloads with 401 error", "open", "Marcus", d_minus_1, "medium")
        ]
        cursor.executemany("INSERT INTO github_issues VALUES (?, ?, ?, ?, ?, ?, ?)", issues)

        # Seed Slack Messages
        slack = [
            # Auth Service
            ("msg-auth-1", "auth-service", "eng-auth", "Shaan", "I'm still stuck getting the security team to review our JWT rotation script. We need their OK before this PR can land.", d_minus_2, 1),
            ("msg-auth-2", "auth-service", "eng-auth", "Alex", "Yeah, @Shaan is right. Without JWT clearance, MFA implementation is also blocked.", d_minus_1, 1),

            # DB Migration
            ("msg-db-1", "db-migration", "eng-database", "Elena", "CRITICAL UPDATE: Sharding migration crashed the staging database replica. Looking into the OOM exception right now.", d_minus_2, 1),
            ("msg-db-2", "db-migration", "eng-database", "Raj", "We are completely blocked on replica latency sync. The PostgreSQL memory footprint is peaking. I need expert DBA assistance ASAP.", d_minus_1, 1),
            ("msg-db-3", "db-migration", "eng-database", "Elena", "Waiting on AWS Support to increase our RDS sandbox IOPS limit. Deadline is tomorrow, this is super tight.", d_minus_1, 1),

            # Payment Gateway
            ("msg-pay-1", "payment-gateway", "eng-billing", "Marcus", "Stripe API looks extremely stable. Webhook issues are just sandbox configuration errors, fixing them now.", d_minus_1, 0)
        ]
        cursor.executemany("INSERT INTO slack_messages VALUES (?, ?, ?, ?, ?, ?, ?)", slack)

        # Seed GitHub Commits
        commits = [
            # Auth Service (Slow commits recently)
            ("c-auth-1", "auth-service", "Shaan", "Refactored JWT helpers to use config variables", d_minus_7, 45, 12),
            ("c-auth-2", "auth-service", "Alex", "Set up basic MFA skeleton endpoints", d_minus_5, 120, 5),

            # DB Migration (Active commits but crashing)
            ("c-db-1", "db-migration", "Elena", "Draft user table partitioning strategy SQL", d_minus_10, 800, 20),
            ("c-db-2", "db-migration", "Raj", "Add pg_repack indexing triggers", d_minus_7, 140, 10),
            ("c-db-3", "db-migration", "Elena", "Temp fix for Postgres backup OOM", d_minus_2, 250, 40),

            # Payment Gateway (Highly active)
            ("c-pay-1", "payment-gateway", "Marcus", "Implement Stripe integration tests", d_minus_4, 430, 20),
            ("c-pay-2", "payment-gateway", "Marcus", "Merge element rendering options", d_minus_3, 85, 2),
            ("c-pay-3", "payment-gateway", "Marcus", "Refactor charge service layer", d_minus_2, 190, 15),
            ("c-pay-4", "payment-gateway", "Marcus", "Polish CSS classes for Stripe Form element", d_minus_1, 40, 5)
        ]
        cursor.executemany("INSERT INTO github_commits VALUES (?, ?, ?, ?, ?, ?, ?)", commits)

        # Seed Risk History (to establish historical trends)
        # Seed score records for the last 5 days
        for day_offset in range(5, 0, -1):
            h_date = (today - datetime.timedelta(days=day_offset)).isoformat()
            
            # Auth Service: Slowly rising risk (55 -> 58 -> 62 -> 68 -> 72)
            auth_scores = [55, 58, 62, 68, 72]
            cursor.execute("INSERT INTO risk_history (component_id, score, timestamp) VALUES (?, ?, ?)",
                           ("auth-service", auth_scores[5 - day_offset], h_date))
            
            # DB Migration: Rapidly rising risk (45 -> 50 -> 65 -> 80 -> 92)
            db_scores = [45, 50, 65, 80, 92]
            cursor.execute("INSERT INTO risk_history (component_id, score, timestamp) VALUES (?, ?, ?)",
                           ("db-migration", db_scores[5 - day_offset], h_date))

            # Payment Gateway: Stable low risk (35 -> 38 -> 32 -> 34 -> 35)
            pay_scores = [35, 38, 32, 34, 35]
            cursor.execute("INSERT INTO risk_history (component_id, score, timestamp) VALUES (?, ?, ?)",
                           ("payment-gateway", pay_scores[5 - day_offset], h_date))

            # Analytics Dashboard: Falling/low risk (25 -> 22 -> 20 -> 18 -> 15)
            an_scores = [25, 22, 20, 18, 15]
            cursor.execute("INSERT INTO risk_history (component_id, score, timestamp) VALUES (?, ?, ?)",
                           ("analytics-dashboard", an_scores[5 - day_offset], h_date))

        self.conn.commit()
        print("[CORAL SERVICE] In-memory SQLite Database seeded successfully with multi-source datasets.")

    def execute_sql(self, query: str, params: tuple = ()) -> Tuple[List[str], List[List[Any]]]:
        """
        Executes a raw SQL query on the SQLite DB.
        Returns a tuple of (column_names, rows_list).
        """
        cursor = self.conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        columns = [description[0] for description in cursor.description] if cursor.description else []
        
        # Convert sqlite3.Row objects to standard python lists
        converted_rows = []
        for r in rows:
            converted_rows.append(list(r))
            
        return columns, converted_rows

    def execute_sql_dicts(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """
        Executes a raw SQL query and returns a list of dictionaries mapping column_name -> value.
        """
        columns, rows = self.execute_sql(query, params)
        results = []
        for row in rows:
            results.append(dict(zip(columns, row)))
        return results

    # Simulation Injector Hooks
    def inject_slack_blocker(self, component_id: str, author: str, text: str):
        cursor = self.conn.cursor()
        msg_id = f"msg-sim-{int(datetime.datetime.now().timestamp())}"
        timestamp = datetime.datetime.now().isoformat()
        cursor.execute(
            "INSERT INTO slack_messages (id, component_id, channel, user, text, timestamp, is_blocker) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (msg_id, component_id, "eng-simulated", author, text, timestamp, 1)
        )
        self.conn.commit()

    def inject_github_bug(self, component_id: str, title: str, severity: str, assignee: str):
        cursor = self.conn.cursor()
        iss_id = f"iss-sim-{int(datetime.datetime.now().timestamp())}"
        created_at = datetime.datetime.now().isoformat()
        cursor.execute(
            "INSERT INTO github_issues (id, component_id, title, status, assignee, created_at, severity) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (iss_id, component_id, title, "open", assignee, created_at, severity.lower())
        )
        self.conn.commit()

    def inject_github_pr(self, component_id: str, title: str, author: str, is_stale: bool):
        cursor = self.conn.cursor()
        pr_id = f"pr-sim-{int(datetime.datetime.now().timestamp())}"
        created_at = datetime.datetime.now().isoformat()
        cursor.execute(
            "INSERT INTO github_pull_requests (id, component_id, title, author, status, created_at, updated_at, is_stale) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (pr_id, component_id, title, author, "open", created_at, created_at, 1 if is_stale else 0)
        )
        self.conn.commit()

    def inject_notion_task(self, component_id: str, task_name: str, assignee: str, deadline_days: int, priority: str):
        cursor = self.conn.cursor()
        task_id = f"task-sim-{int(datetime.datetime.now().timestamp())}"
        deadline = (datetime.date.today() + datetime.timedelta(days=deadline_days)).isoformat()
        cursor.execute(
            "INSERT INTO notion_tasks (id, component_id, task_name, assignee, status, deadline, priority) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (task_id, component_id, task_name, assignee, "In Progress", deadline, priority)
        )
        self.conn.commit()

    def log_risk_score(self, component_id: str, score: float):
        cursor = self.conn.cursor()
        timestamp = datetime.datetime.now().isoformat()
        cursor.execute(
            "INSERT INTO risk_history (component_id, score, timestamp) VALUES (?, ?, ?)",
            (component_id, int(score), timestamp)
        )
        self.conn.commit()
