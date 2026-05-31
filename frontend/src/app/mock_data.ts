export interface RiskBreakdown {
  deadline_risk: number;
  bug_risk: number;
  blocker_risk: number;
  stale_pr_risk: number;
  total_score: number;
}

export interface ComponentData {
  id: string;
  name: string;
  owner: string;
  team: string;
  current_score: number;
  previous_score: number;
  delta: number;
  risk_level: string;
  primary_reason: string;
  breakdown: RiskBreakdown;
}

export interface ExecutedQuery {
  name: string;
  sql: string;
  columns: string[];
  rows: any[][];
  insight: string;
  question?: string;
  tables?: string[];
  demonstration?: string;
}

export interface EvidenceData {
  component_id: string;
  component_name: string;
  breakdown: RiskBreakdown;
  sources: string[];
  queries: ExecutedQuery[];
}

export const MOCK_COMPONENTS: ComponentData[] = [
  {
    id: "auth-service",
    name: "Authentication Service",
    owner: "Shaan",
    team: "Platform Security",
    current_score: 74,
    previous_score: 72,
    delta: 2,
    risk_level: "High",
    primary_reason: "Task deadline is critical or overdue (< 2 days left), High volume of critical open GitHub bugs, Active blockers raised on Slack team channels, Trapped PRs causing code velocity stagnation",
    breakdown: { deadline_risk: 20, bug_risk: 20, blocker_risk: 24, stale_pr_risk: 10, total_score: 74 }
  },
  {
    id: "db-migration",
    name: "Database Migration",
    owner: "Elena",
    team: "Data Platform",
    current_score: 65,
    previous_score: 92,
    delta: -27,
    risk_level: "High",
    primary_reason: "Task deadline is critical or overdue (< 2 days left), Active blockers raised on Slack team channels, Trapped PRs causing code velocity stagnation",
    breakdown: { deadline_risk: 25, bug_risk: 5, blocker_risk: 25, stale_pr_risk: 10, total_score: 65 }
  },
  {
    id: "payment-gateway",
    name: "Payment Gateway Integration",
    owner: "Marcus",
    team: "Billing & Checkout",
    current_score: 0,
    previous_score: 35,
    delta: -35,
    risk_level: "Low",
    primary_reason: "No immediate delivery risk detected.",
    breakdown: { deadline_risk: 0, bug_risk: 0, blocker_risk: 0, stale_pr_risk: 0, total_score: 0 }
  },
  {
    id: "analytics-dashboard",
    name: "Analytics Dashboard",
    owner: "Sophia",
    team: "Growth & Metrics",
    current_score: 0,
    previous_score: 15,
    delta: -15,
    risk_level: "Low",
    primary_reason: "No immediate delivery risk detected.",
    breakdown: { deadline_risk: 0, bug_risk: 0, blocker_risk: 0, stale_pr_risk: 0, total_score: 0 }
  }
];

export const MOCK_SHOWCASE_QUERIES = [
  {
    name: "Showcase 1: Notion Milestones & Slack Blockers JOIN",
    sql: `SELECT c.name, n.task_name, n.deadline, s.user, s.text 
FROM components c
JOIN notion_tasks n ON c.id = n.component_id
JOIN slack_messages s ON c.id = s.component_id
WHERE n.status != 'Done' AND s.is_blocker = 1;`,
    columns: ["name", "task_name", "deadline", "user", "text"],
    rows: [
      ["Database Migration", "Shard Users Table & Migrate to PostgreSQL Cluster", "2026-06-01", "Elena", "Critical deadlock flagged in migration scripts on PostgreSQL replica! Pipeline blocked."],
      ["Authentication Service", "Upgrade JWT Library & Add Token Rotation", "2026-06-02", "Shaan", "Auth bypass alert on API Gateway validation middleware validation module. Security risk raised."]
    ],
    insight: "High-risk components where a critical Notion task is incomplete and teams are actively raising blocker flags on Slack. Immediately highlights delivery bottlenecks.",
    question: "Which Notion tasks are overdue or approaching deadline, and have active blocker discussions flagged in Slack?",
    tables: ["notion_tasks", "slack_messages", "components"],
    demonstration: "Without Coral, joining Slack chats with Notion board ticket states requires setting up webhooks, an intermediate ETL buffer database, and complex token routing. Coral bridges these silos dynamically using a standard SQL JOIN."
  },
  {
    name: "Showcase 2: Quality Bottlenecks (GitHub Bugs + Stale PRs)",
    sql: `SELECT c.name, i.title, i.severity, p.title, p.author
FROM components c
JOIN github_issues i ON c.id = i.component_id
JOIN github_pull_requests p ON c.id = p.component_id
WHERE i.status = 'open' AND p.is_stale = 1;`,
    columns: ["component", "open_bug", "bug_severity", "stale_pr", "pr_author", "pr_created"],
    rows: [
      ["Authentication Service", "API Gateway: Unauthorized requests bypass validation middleware", "critical", "Security: Patch JWT decryption check vulnerability", "Shaan", "2026-05-24"]
    ],
    insight: "Highlights technical blockers where high-severity bugs are unresolved while code changes remain trapped in stale, unmerged Pull Requests.",
    question: "What components have open critical bugs in GitHub, and have open pull requests flagged as stale?",
    tables: ["github_issues", "github_pull_requests", "components"],
    demonstration: "Bridges separate GitHub API resources (Issues and Pull Requests) into a single SQL tabular join, allowing immediate mapping of blocked code reviews against quality metrics."
  },
  {
    name: "Showcase 3: Stale Work items & Deadline Slippage (Notion + GitHub)",
    sql: `SELECT c.name, n.task_name, n.deadline, i.title, i.severity
FROM components c
JOIN notion_tasks n ON c.id = n.component_id
JOIN github_issues i ON c.id = i.component_id
WHERE n.status != 'Done' AND i.severity IN ('high', 'critical');`,
    columns: ["component", "task", "task_deadline", "high_severity_issue", "severity"],
    rows: [
      ["Authentication Service", "Upgrade JWT Library & Add Token Rotation", "2026-06-02", "API Gateway: Unauthorized requests bypass validation middleware", "critical"],
      ["Authentication Service", "Implement MFA Support (SMS & Authenticator)", "2026-06-05", "API Gateway: Unauthorized requests bypass validation middleware", "critical"]
    ],
    insight: "Identifies items where upcoming deadlines are threatened by open critical or high-severity Github bugs, requiring immediate triage.",
    question: "Which components are running tight Notion deadlines alongside high-severity open GitHub issues?",
    tables: ["notion_tasks", "github_issues", "components"],
    demonstration: "Merges planning tools (Notion) and code quality registers (GitHub Issues) to flag upcoming releases whose timelines are endangered by open critical bugs."
  },
  {
    name: "Showcase 4: Active Risk Rankings (Latest Coral Computations)",
    sql: `SELECT c.name, h.score, h.timestamp
FROM components c
JOIN risk_history h ON c.id = h.component_id;`,
    columns: ["component", "current_risk_score", "calculated_at", "owner", "team"],
    rows: [
      ["Database Migration", 92, "2026-05-30", "Elena", "Data Platform"],
      ["Authentication Service", 72, "2026-05-30", "Shaan", "Platform Security"],
      ["Payment Gateway Integration", 35, "2026-05-30", "Marcus", "Billing & Checkout"],
      ["Analytics Dashboard", 15, "2026-05-30", "Sophia", "Growth & Metrics"]
    ],
    insight: "Fetches the latest risk score calculated by the Coral Risk Engine for all active components, ranked in descending order.",
    question: "What are the latest risk scores computed by the engine across all software modules?",
    tables: ["risk_history", "components"],
    demonstration: "Retrieves pre-calculated risk evaluations from the risk history database to list top security and delivery threats."
  },
  {
    name: "Showcase 5: Fastest Rising Risks (Historical Delta Joins)",
    sql: `SELECT c.name, curr.score, prev.score, (curr.score - prev.score) AS delta
FROM components c
JOIN risk_history curr ON c.id = curr.component_id
JOIN risk_history prev ON c.id = prev.component_id;`,
    columns: ["component", "current_score", "previous_score", "risk_increase_delta", "owner"],
    rows: [
      ["Database Migration", 92, 80, 12, "Elena"],
      ["Authentication Service", 72, 68, 4, "Shaan"],
      ["Payment Gateway Integration", 35, 34, 1, "Marcus"],
      ["Analytics Dashboard", 15, 18, -3, "Sophia"]
    ],
    insight: "Uses historical risk records to find which components are accelerating into danger zones fastest, comparing current vs. previous scans.",
    question: "Which components exhibit the highest risk delta between historical scans?",
    tables: ["risk_history", "components"],
    demonstration: "Joins chronological instances of the risk metrics table to compute the rate of change (delta acceleration) for quick management response."
  }
];

export const MOCK_EVIDENCE: Record<string, EvidenceData> = {
  "auth-service": {
    component_id: "auth-service",
    component_name: "Authentication Service",
    breakdown: { deadline_risk: 20, bug_risk: 20, blocker_risk: 24, stale_pr_risk: 10, total_score: 74 },
    sources: ["GitHub Issues", "Notion", "Slack", "GitHub Pull Requests"],
    queries: [
      {
        name: "Notion Active Tasks",
        sql: "SELECT task_name, assignee, status, deadline, priority FROM notion_tasks WHERE component_id = 'auth-service' AND status != 'Done';",
        columns: ["task_name", "assignee", "status", "deadline", "priority"],
        rows: [
          ["Upgrade JWT Library & Add Token Rotation", "Shaan", "In Progress", "2026-06-02", "High"],
          ["Implement MFA Support (SMS & Authenticator)", "Alex", "To Do", "2026-06-05", "High"]
        ],
        insight: "Critical tasks are pending with a highly tight deadline (< 2 days)."
      },
      {
        name: "GitHub Open Bugs",
        sql: "SELECT title, severity, status, assignee FROM github_issues WHERE component_id = 'auth-service' AND status = 'open';",
        columns: ["title", "severity", "status", "assignee"],
        rows: [
          ["API Gateway: Unauthorized requests bypass validation middleware", "critical", "open", "Unassigned"],
          ["Security: Fix memory leak in JWT auth validation layer", "medium", "open", "Unassigned"]
        ],
        insight: "High volume of open critical issues (1 critical bug = 15 risk points)."
      },
      {
        name: "Slack Blocker Logs",
        sql: "SELECT user, text, timestamp FROM slack_messages WHERE component_id = 'auth-service' AND is_blocker = 1;",
        columns: ["user", "text", "timestamp"],
        rows: [
          ["Shaan", "Auth bypass alert on API Gateway validation middleware validation module. Security risk raised.", "2026-05-30T10:45:00Z"]
        ],
        insight: "An active blocker has been explicitly flagged in Slack by Shaan."
      },
      {
        name: "GitHub Pull Requests",
        sql: "SELECT title, author, is_stale, status FROM github_pull_requests WHERE component_id = 'auth-service';",
        columns: ["title", "author", "is_stale", "status"],
        rows: [
          ["Security: Patch JWT decryption check vulnerability", "Shaan", 1, "open"],
          ["Feature: Add Redis session caching layer", "Alex", 0, "open"]
        ],
        insight: "Stale unmerged pull request is actively hindering team velocity."
      }
    ]
  },
  "db-migration": {
    component_id: "db-migration",
    component_name: "Database Migration",
    breakdown: { deadline_risk: 25, bug_risk: 5, blocker_risk: 25, stale_pr_risk: 10, total_score: 65 },
    sources: ["Notion", "Slack", "GitHub Pull Requests", "GitHub Issues"],
    queries: [
      {
        name: "Notion Active Tasks",
        sql: "SELECT task_name, assignee, status, deadline, priority FROM notion_tasks WHERE component_id = 'db-migration' AND status != 'Done';",
        columns: ["task_name", "assignee", "status", "deadline", "priority"],
        rows: [
          ["Shard Users Table & Migrate to PostgreSQL Cluster", "Elena", "In Progress", "2026-06-01", "High"],
          ["Validate Replica Latency and Run Performance Tests", "Raj", "To Do", "2026-06-02", "Medium"]
        ],
        insight: "A high-priority sharding migration task is overdue or expiring in 24 hours."
      },
      {
        name: "GitHub Open Bugs",
        sql: "SELECT title, severity, status, assignee FROM github_issues WHERE component_id = 'db-migration' AND status = 'open';",
        columns: ["title", "severity", "status", "assignee"],
        rows: [
          ["Deadlock on database PostgreSQL migration indexes", "medium", "open", "Unassigned"]
        ],
        insight: "Medium severity deadlock issue is active on the database module."
      },
      {
        name: "Slack Blocker Logs",
        sql: "SELECT user, text, timestamp FROM slack_messages WHERE component_id = 'db-migration' AND is_blocker = 1;",
        columns: ["user", "text", "timestamp"],
        rows: [
          ["Elena", "Critical deadlock flagged in migration scripts on PostgreSQL replica! Pipeline blocked.", "2026-05-30T14:22:00Z"]
        ],
        insight: "Elena raised an active database blocker on Slack."
      },
      {
        name: "GitHub Pull Requests",
        sql: "SELECT title, author, is_stale, status FROM github_pull_requests WHERE component_id = 'db-migration';",
        columns: ["title", "author", "is_stale", "status"],
        rows: [
          ["Infra: Postgres 15 migration scripts & indexes", "Elena", 1, "open"],
          ["WIP: Sharding script with backup validation", "Elena", 0, "open"]
        ],
        insight: "Open stale pull request is slowing down DB migration pipeline."
      }
    ]
  },
  "payment-gateway": {
    component_id: "payment-gateway",
    component_name: "Payment Gateway Integration",
    breakdown: { deadline_risk: 0, bug_risk: 0, blocker_risk: 0, stale_pr_risk: 0, total_score: 0 },
    sources: ["Notion", "GitHub Pull Requests"],
    queries: [
      {
        name: "Notion Active Tasks",
        sql: "SELECT task_name, assignee, status, deadline, priority FROM notion_tasks WHERE component_id = 'payment-gateway' AND status != 'Done';",
        columns: ["task_name", "assignee", "status", "deadline", "priority"],
        rows: [
          ["Integrate Stripe Elements v3 SDK", "Marcus", "In Progress", "2026-06-12", "Medium"],
          ["Set up Webhook Verification Handlers", "Marcus", "To Do", "2026-06-20", "Low"]
        ],
        insight: "Tasks are safely scheduled, deadline is far in the future."
      },
      {
        name: "GitHub Open Bugs",
        sql: "SELECT title, severity, status, assignee FROM github_issues WHERE component_id = 'payment-gateway' AND status = 'open';",
        columns: ["title", "severity", "status", "assignee"],
        rows: [],
        insight: "No open GitHub issues."
      },
      {
        name: "Slack Blocker Logs",
        sql: "SELECT user, text, timestamp FROM slack_messages WHERE component_id = 'payment-gateway' AND is_blocker = 1;",
        columns: ["user", "text", "timestamp"],
        rows: [],
        insight: "No Slack blockers raised."
      },
      {
        name: "GitHub Pull Requests",
        sql: "SELECT title, author, is_stale, status FROM github_pull_requests WHERE component_id = 'payment-gateway';",
        columns: ["title", "author", "is_stale", "status"],
        rows: [
          ["SDK: Add Stripe v3 core webhook wrapper", "Marcus", 0, "open"]
        ],
        insight: "No stale unmerged pull requests."
      }
    ]
  },
  "analytics-dashboard": {
    component_id: "analytics-dashboard",
    component_name: "Analytics Dashboard",
    breakdown: { deadline_risk: 0, bug_risk: 0, blocker_risk: 0, stale_pr_risk: 0, total_score: 0 },
    sources: ["Notion"],
    queries: [
      {
        name: "Notion Active Tasks",
        sql: "SELECT task_name, assignee, status, deadline, priority FROM notion_tasks WHERE component_id = 'analytics-dashboard' AND status != 'Done';",
        columns: ["task_name", "assignee", "status", "deadline", "priority"],
        rows: [
          ["Export Analytics Data to CSV/Excel Format", "Dave", "In Progress", "2026-06-20", "Low"]
        ],
        insight: "Overdue tasks are absent, delivery schedule is comfortable."
      },
      {
        name: "GitHub Open Bugs",
        sql: "SELECT title, severity, status, assignee FROM github_issues WHERE component_id = 'analytics-dashboard' AND status = 'open';",
        columns: ["title", "severity", "status", "assignee"],
        rows: [],
        insight: "No open bugs."
      },
      {
        name: "Slack Blocker Logs",
        sql: "SELECT user, text, timestamp FROM slack_messages WHERE component_id = 'analytics-dashboard' AND is_blocker = 1;",
        columns: ["user", "text", "timestamp"],
        rows: [],
        insight: "No Slack blockers raised."
      },
      {
        name: "GitHub Pull Requests",
        sql: "SELECT title, author, is_stale, status FROM github_pull_requests WHERE component_id = 'analytics-dashboard';",
        columns: ["title", "author", "is_stale", "status"],
        rows: [],
        insight: "No active pull requests."
      }
    ]
  }
};

export const getLocalChatResponse = (msg: string) => {
  const m = msg.toLowerCase();
  if (m.includes("not visible") || m.includes("not showing") || m.includes("0 score") || m.includes("why isn't") || m.includes("no issues") || m.includes("missing")) {
    return {
      content: `### 🔍 E2E Diagnostic Checklist: Missing GitHub Issues & 0% Scores\n\nIf your live GitHub repository issues/PRs are not appearing on your Component Risk Scorecards (or the score remains 0%), here is the verification checklist to get them displayed:\n\n1. **Verify \`.env\` Settings**:\n   Ensure \`backend/.env\` has the exact repository coordinates:\n   - \`GITHUB_OWNER=Tshaan1104\`\n   - \`GITHUB_REPO=engineering-risk-radar\`\n   - \`GITHUB_TOKEN=your_real_github_pat\`\n\n2. **Trigger Live Sync**:\n   Click the **Sync Now** button at the top-right of the dashboard. This spawns the Rust-powered \`coral.exe\` CLI process under the hood.\n\n3. **Verify Component Keyword Matching**:\n   Coral automatically maps issues based on title/description keywords (e.g. \`auth\` ➔ **auth-service**, \`db\` ➔ **db-migration**).\n\n4. **Verify Severity Risk Calculations**:\n   Only **open** issues map to risk points (label critical ➔ 15pts, high ➔ 10pts, default ➔ 5pts).`,
      sql_executed: "SELECT * FROM github_issues;",
      sql_results: [
        { id: "iss-live-3", component_id: "auth-service", title: "API Gateway: Unauthorized requests bypass validation middleware", status: "open", assignee: "Unassigned", created_at: "2026-05-31T07:47:00Z", severity: "critical" },
        { id: "iss-live-2", component_id: "db-migration", title: "Deadlock on database PostgreSQL migration indexes", status: "open", assignee: "Unassigned", created_at: "2026-05-31T07:46:44Z", severity: "medium" },
        { id: "iss-live-1", component_id: "auth-service", title: "Security: Fix memory leak in JWT auth validation layer", status: "open", assignee: "Unassigned", created_at: "2026-05-31T07:46:27Z", severity: "medium" }
      ]
    };
  } else if (m.includes("issue") || m.includes("bug") || m.includes("error")) {
    return {
      content: `### 🐛 Live GitHub Issues & Bugs Report\n\nExecuted SQL query on Coral's \`github_issues\` table. Here is the active list of open bugs:\n\n| Issue Title | Component | Severity | Assignee |\n| :--- | :--- | :---: | :--- |\n| API Gateway: Unauthorized requests bypass validation middleware | \`auth-service\` | 🔴 Critical | Unassigned |\n| Deadlock on database PostgreSQL migration indexes | \`db-migration\` | 🟡 Medium | Unassigned |\n| Security: Fix memory leak in JWT auth validation layer | \`auth-service\` | 🟡 Medium | Unassigned |\n`,
      sql_executed: "SELECT title, component_id, severity, status, assignee FROM github_issues WHERE status = 'open';",
      sql_results: [
        { title: "API Gateway: Unauthorized requests bypass validation middleware", component_id: "auth-service", severity: "critical", status: "open", assignee: "Unassigned" },
        { title: "Deadlock on database PostgreSQL migration indexes", component_id: "db-migration", severity: "medium", status: "open", assignee: "Unassigned" },
        { title: "Security: Fix memory leak in JWT auth validation layer", component_id: "auth-service", severity: "medium", status: "open", assignee: "Unassigned" }
      ]
    };
  } else if (m.includes("pr") || m.includes("pull request")) {
    return {
      content: `### 🔀 GitHub Pull Requests Audit\n\nQuerying the \`github_pull_requests\` table on Coral SQL layer:\n\n| PR Title | Component | Author | Status | Stale? |\n| :--- | :--- | :--- | :---: | :---: |\n| Security: Patch JWT decryption check vulnerability | \`auth-service\` | Shaan | \`open\` | ⚠️ Yes |\n| Feature: Add Redis session caching layer | \`auth-service\` | Alex | \`open\` | ✅ No |\n| Infra: Postgres 15 migration scripts & indexes | \`db-migration\` | Elena | \`open\` | ⚠️ Yes |`,
      sql_executed: "SELECT title, component_id, author, status, is_stale, created_at FROM github_pull_requests;",
      sql_results: [
        { title: "Security: Patch JWT decryption check vulnerability", component_id: "auth-service", author: "Shaan", status: "open", is_stale: 1 },
        { title: "Feature: Add Redis session caching layer", component_id: "auth-service", author: "Alex", status: "open", is_stale: 0 },
        { title: "Infra: Postgres 15 migration scripts & indexes", component_id: "db-migration", author: "Elena", status: "open", is_stale: 1 }
      ]
    };
  } else if (m.includes("notion") || m.includes("task") || m.includes("todo")) {
    return {
      content: `### 📅 Notion Active Tasks & Delivery Schedule\n\nQuerying Notion task boards (\`notion_tasks\` table) via Coral:\n\n| Task Name | Component | Assignee | Deadline | Priority |\n| :--- | :--- | :--- | :---: | :---: |\n| Upgrade JWT Library & Add Token Rotation | \`auth-service\` | Shaan | **2026-06-02** | \`High\` |\n| Implement MFA Support (SMS & Authenticator) | \`auth-service\` | Alex | **2026-06-05** | \`High\` |\n| Shard Users Table & Migrate to PostgreSQL Cluster | \`db-migration\` | Elena | **2026-06-01** | \`High\` |`,
      sql_executed: "SELECT task_name, component_id, assignee, deadline, priority, status FROM notion_tasks WHERE status != 'Done';",
      sql_results: [
        { task_name: "Upgrade JWT Library & Add Token Rotation", component_id: "auth-service", assignee: "Shaan", deadline: "2026-06-02", priority: "High" },
        { task_name: "Implement MFA Support (SMS & Authenticator)", component_id: "auth-service", assignee: "Alex", deadline: "2026-06-05", priority: "High" },
        { task_name: "Shard Users Table & Migrate to PostgreSQL Cluster", component_id: "db-migration", assignee: "Elena", deadline: "2026-06-01", priority: "High" }
      ]
    };
  } else if (m.includes("slack") || m.includes("blocker") || m.includes("message")) {
    return {
      content: `### 💬 Active Slack Blockers & Risks\n\nQuerying Slack transcripts (\`slack_messages\` table) filtered for blockers:\n\n- **Elena** raised a blocker on \`db-migration\`:\n  *"Critical deadlock flagged in migration scripts on PostgreSQL replica! Pipeline blocked."*\n- **Shaan** raised a blocker on \`auth-service\`:\n  *"Auth bypass alert on API Gateway validation middleware validation module. Security risk raised."*`,
      sql_executed: "SELECT user, text, component_id, timestamp, is_blocker FROM slack_messages WHERE is_blocker = 1;",
      sql_results: [
        { user: "Elena", text: "Critical deadlock flagged in migration scripts on PostgreSQL replica! Pipeline blocked.", component_id: "db-migration", is_blocker: 1 },
        { user: "Shaan", text: "Auth bypass alert on API Gateway validation middleware validation module. Security risk raised.", component_id: "auth-service", is_blocker: 1 }
      ]
    };
  } else if (m.includes("fail") || m.includes("miss") || m.includes("deadline")) {
    return {
      content: `### 🚨 Top Delivery Threats & Critical Items\n\nBased on a direct SQL query joining Notion tasks and Slack blockers, here are the most critical delivery threats:\n\n- **db-migration** is working on *"Shard Users Table & Migrate to PostgreSQL Cluster"* approaching its deadline on **2026-06-01** (with **1 blockers** active on Slack).\n- **auth-service** is working on *"Upgrade JWT Library & Add Token Rotation"* approaching its deadline on **2026-06-02** (with **1 blockers** active on Slack).`,
      sql_executed: "SELECT c.name, n.task_name, n.deadline, COUNT(s.id) as slack_blockers FROM components c JOIN notion_tasks n ON c.id = n.component_id LEFT JOIN slack_messages s ON c.id = s.component_id AND s.is_blocker = 1 WHERE n.status != 'Done' GROUP BY c.id ORDER BY n.deadline ASC;",
      sql_results: [
        { name: "Database Migration", task_name: "Shard Users Table & Migrate to PostgreSQL Cluster", deadline: "2026-06-01", slack_blockers: 1 },
        { name: "Authentication Service", task_name: "Upgrade JWT Library & Add Token Rotation", deadline: "2026-06-02", slack_blockers: 1 }
      ]
    };
  } else if (m.includes("riskier") || m.includes("increasing")) {
    return {
      content: `### 📈 Risk Acceleration Analysis\n\nComparing the latest risk scan against the previous historical capture, here is the risk delta:\n\n- **db-migration**: Current Risk: **65%** | Previous: **92%** | Trend: 🟢 Declining (**-27 points**)\n- **auth-service**: Current Risk: **74%** | Previous: **72%** | Trend: 🔴 Rising (**+2 points**)\n`,
      sql_executed: "SELECT c.name, curr.score, prev.score, (curr.score - prev.score) as delta FROM components c JOIN risk_history curr ON c.id = curr.component_id JOIN risk_history prev ON c.id = prev.component_id ORDER BY delta DESC;",
      sql_results: [
        { name: "Database Migration", score: 65, previous_score: 92, delta: -27 },
        { name: "Authentication Service", score: 74, previous_score: 72, delta: 2 }
      ]
    };
  }

  // Default response
  return {
    content: `Hello! I am your Coral-powered Engineering Manager Assistant.\n\nI can query Coral's SQL layer across Notion, GitHub, and Slack to run cross-source checks. Try asking me:\n1. 🐛 *List all open GitHub issues*\n2. 🔀 *Show me the pull requests*\n3. 📅 *What tasks do we have on Notion?*\n4. 💬 *Show me the active Slack blockers*\n5. 🚨 *What is most likely to miss its deadline?*\n6. 📈 *Which components are getting riskier?*`,
    sql_executed: "SELECT name, owner, team FROM components",
    sql_results: [
      { name: "Authentication Service", owner: "Shaan", team: "Platform Security" },
      { name: "Database Migration", owner: "Elena", team: "Data Platform" },
      { name: "Payment Gateway Integration", owner: "Marcus", team: "Billing & Checkout" },
      { name: "Analytics Dashboard", owner: "Sophia", team: "Growth & Metrics" }
    ]
  };
};
