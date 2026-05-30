# Engineering Risk Radar (Coral Centric)

An AI-powered engineering risk prediction dashboard designed for hackathon excellence. It puts **Coral** (withcoral.com) in the spotlight as the unified SQL intelligence layer, aggregating data across Notion, GitHub, and Slack to trace project slippage and deliver real-time deadline forecasts.

---

## 🚀 Key Features

1. **Coral-Centric Core:** GitHub commits, GitHub issues, Slack logs, and Notion tasks are loaded into Coral's unified SQLite database layer. 
2. **Flagship Coral SQL Showcase:** A dedicated workspace demonstrating 5 high-value cross-source SQL queries side-by-side with raw tabular grids, highlighted query syntax, and generated program manager insights.
3. **Scoring Evidence Explorer:** Audit any component's risk rating (0-100) by inspecting the exact SQL queries and column/row spreadsheets that calculated the sub-scores.
4. **AI EM Chat Assistant:** A conversational panel powered by **Cohere V2 SDK** using tool-calling (`execute_coral_sql`) to dynamically write and execute SQL queries over live sources. Includes a real-time SQL trace console to trace agent workflows.
5. **Interactive Workspace Simulator:** Inject blockers, bugs, or deadline adjustments directly from the UI console. The system records previous scores, logs risk history, recalculates math formulas via SQL, and charts historical trend deltas in real-time.

---

## 📁 Repository Structure

```
backend/
├── main.py                    # FastAPI entrypoint and router registry
├── requirements.txt           # Python library dependencies
├── config.py                  # Env configuration loader
├── models/
│   └── risk_models.py         # Shared Pydantic data schemas
├── services/
│   ├── coral_service.py       # SQL unified layer, DB setup & seeder
│   ├── risk_engine.py         # SQL-driven scoring logic
│   └── explanation_service.py # AI assistant and fallback parsers
└── routes/
    ├── risks.py               # Risk scores, breakdowns, and simulator
    ├── evidence.py            # Flagship queries & raw SQL execute
    └── chat.py                # AI Chat assistant endpoint

frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Next.js layouts and SEO metadata
│   │   ├── globals.css        # Premium custom dark styling and animations
│   │   └── page.tsx           # Multi-pane dashboard and navigation tabs
├── package.json               # Next.js configurations
└── tailwind.config.ts         # PostCSS config and tokens
```

---

## 🛠️ Step-by-Step Deployment Instructions

### 1. Launch the FastAPI Backend

Open your terminal, navigate to the project directory, and install requirements:
```bash
pip install -r backend/requirements.txt
```

Launch the FastAPI uvicorn server (default port `8000`):
```bash
python -m backend.main
```
The server will boot and display connection status. It will automatically load the seeded mock databases.

### 2. Launch the Next.js Frontend

In a separate terminal window, navigate to the `frontend` folder:
```bash
cd frontend
```

Install icon libraries and support dependencies (already bootstrapped):
```bash
npm install
```

Launch the Next.js dev server:
```bash
npm run dev
```
Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)** to view the Engineering Risk Radar dashboard!

---

## 🔑 Cohere AI API Key Configuration (Optional)

The system is equipped with a highly robust **local heuristic keyword parser fallback** that generates detailed analytical briefs, tracks risk deltas, and prints executed SQL statements without requiring a Cohere key.

To unlock **autonomous SQL-writing capabilities** for the Chat Assistant, create a `.env` file inside the `backend` folder and add your key:
```env
CO_API_KEY=your_cohere_api_key_here
```
When a user asks questions in the AI Assistant tab, the backend will feed the prompt directly into Cohere's tool-calling loop to execute SQL statements dynamically.
