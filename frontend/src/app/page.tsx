"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldAlert, 
  Terminal, 
  Database, 
  MessageSquare, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileCode2,
  TrendingUp,
  User,
  Users,
  ChevronRight,
  Send,
  HelpCircle,
  Sparkles,
  Info
} from "lucide-react";

// API Server Address
const API_BASE = "http://localhost:8000";

interface RiskBreakdown {
  deadline_risk: number;
  bug_risk: number;
  blocker_risk: number;
  stale_pr_risk: number;
  total_score: number;
}

interface ComponentData {
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

interface ExecutedQuery {
  name: string;
  sql: string;
  columns: string[];
  rows: any[][];
  insight: string;
}

interface EvidenceData {
  component_id: string;
  component_name: string;
  breakdown: RiskBreakdown;
  sources: string[];
  queries: ExecutedQuery[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sql_executed?: string;
  sql_results?: any[];
}

export default function Home() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "showcase" | "evidence" | "chat">("dashboard");
  
  // Data State
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [showcaseQueries, setShowcaseQueries] = useState<ExecutedQuery[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>("db-migration");
  const [evidence, setEvidence] = useState<EvidenceData | null>(null);
  
  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `### 🤖 Coral SQL Engineering Manager Assistant

Hello! I am your Coral-powered intelligence assistant. I can query across **Notion Tasks**, **GitHub Commits/PRs/Issues**, and **Slack logs** through a single unified database layer to trace project slippage.

**Try asking me:**
- *What is most likely to fail this week?*
- *Which components are getting riskier?*
- *Why is db-migration high risk?*
- *Show me all open bugs and active blockers.*`
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [sqlTrace, setSqlTrace] = useState<{sql: string; results: any[]} | null>(null);
  
  // Simulation Event Inputs
  const [simCompId, setSimCompId] = useState("auth-service");
  const [simEventType, setSimEventType] = useState("slack_blocker");
  const [simContent, setSimContent] = useState("JWT token verification is throwing key expired errors and the security lead is out of office.");
  const [simSeverity, setSimSeverity] = useState("critical");
  
  // Loading & Status
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat window
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Load basic components data
  const loadComponentsData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/risks`);
      if (res.ok) {
        const data = await res.json();
        setComponents(data);
        // Default select the highest risk component if not set
        if (data.length > 0 && !selectedCompId) {
          setSelectedCompId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed fetching components", err);
    } finally {
      setLoading(false);
    }
  };

  // Load Showcase flagships
  const loadShowcaseData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/evidence/showcase`);
      if (res.ok) {
        const data = await res.json();
        setShowcaseQueries(data.queries);
      }
    } catch (err) {
      console.error("Failed fetching showcase", err);
    }
  };

  // Load Evidence Explorer details
  const loadEvidenceData = async (compId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/risks/${compId}/evidence`);
      if (res.ok) {
        const data = await res.json();
        setEvidence(data);
      }
    } catch (err) {
      console.error("Failed fetching evidence", err);
    }
  };

  // Initial Fetch
  useEffect(() => {
    loadComponentsData();
    loadShowcaseData();
  }, []);

  // Fetch evidence whenever selected component changes
  useEffect(() => {
    if (selectedCompId) {
      loadEvidenceData(selectedCompId);
    }
  }, [selectedCompId]);

  // Sync DB records
  const handleSync = async () => {
    setSyncing(true);
    showFlashMessage("Syncing tools data into Coral...");
    try {
      const res = await fetch(`${API_BASE}/api/risks/sync`, { method: "POST" });
      if (res.ok) {
        await loadComponentsData(true);
        if (selectedCompId) {
          await loadEvidenceData(selectedCompId);
        }
        await loadShowcaseData();
        showFlashMessage("Coral SQL Unified Database synced successfully!", "success");
      }
    } catch (err) {
      showFlashMessage("Failed synchronizing data.", "error");
    } finally {
      setSyncing(false);
    }
  };

  // Trigger simulated event injection
  const handleSimulate = async () => {
    showFlashMessage("Injecting event and recalculating Coral SQL scores...");
    try {
      const res = await fetch(`${API_BASE}/api/risks/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          component_id: simCompId,
          event_type: simEventType,
          content: simContent,
          severity: simSeverity,
        })
      });
      if (res.ok) {
        showFlashMessage("Simulated event injected! Real-time Coral SQL metrics recalculated.", "success");
        // Reload dashboard
        await loadComponentsData(true);
        // Refresh evidence explorer if active
        if (selectedCompId === simCompId) {
          await loadEvidenceData(simCompId);
        }
        await loadShowcaseData();
      }
    } catch (err) {
      showFlashMessage("Failed injecting simulated event.", "error");
    }
  };

  // Chat message submit
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput("");
    setChatHistory(prev => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);
    setSqlTrace(null);

    // Filter out greeting assistant header from backend logic
    const historyBody = chatHistory.slice(1).map(h => ({
      role: h.role,
      content: h.content
    }));

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: historyBody
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, {
          role: "assistant",
          content: data.content,
          sql_executed: data.sql_executed,
          sql_results: data.sql_results
        }]);
        
        if (data.sql_executed) {
          setSqlTrace({
            sql: data.sql_executed,
            results: data.sql_results || []
          });
        }
      } else {
        setChatHistory(prev => [...prev, {
          role: "assistant",
          content: "❌ Error executing chat command. Please check backend connection."
        }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, {
        role: "assistant",
        content: "❌ Connection timeout. Is the FastAPI server running on port 8000?"
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Quick select preset simulation options
  const handlePresetSelect = (type: string) => {
    setSimEventType(type);
    if (type === "slack_blocker") {
      setSimContent("CRITICAL BLOCKER: Stripe checkout endpoints are throwing SSL handshake exceptions. Billing gateway migration is completely stalled.");
      setSimSeverity("critical");
    } else if (type === "github_bug") {
      setSimContent("Memory leak in DB query partition allocation worker loop");
      setSimSeverity("high");
    } else if (type === "github_pr") {
      setSimContent("Draft shard-replica sync validation checklist - Open for 14 days without commits");
      setSimSeverity("medium");
    } else if (type === "notion_deadline") {
      setSimContent("Complete security audit and JWT signing certificate migration");
      setSimSeverity("critical");
    }
  };

  // Helper to trigger alert flash alerts
  const showFlashMessage = (msg: string, type: "info" | "success" | "error" = "info") => {
    setStatusMessage(`${type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"} ${msg}`);
    setTimeout(() => {
      setStatusMessage(null);
    }, 6000);
  };

  // Helper styles for risk levels
  const getRiskBadge = (level: string) => {
    switch (level) {
      case "Critical": return "badge-critical";
      case "High": return "badge-high";
      case "Medium": return "badge-medium";
      default: return "badge-low";
    }
  };

  return (
    <div className="flex h-screen bg-[#050811] text-slate-100 overflow-hidden font-sans">
      
      {/* 1. SIDEBAR NAVIGATION */}
      <aside className="w-72 bg-[#090d16] border-r border-white/5 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Header */}
          <div className="p-6 border-b border-white/5 flex items-center space-x-3 bg-gradient-to-r from-indigo-950/20 to-transparent">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
              <ShieldAlert className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-wide text-white">Risk Radar</h1>
              <p className="text-xs text-indigo-400/70 font-semibold tracking-wider uppercase">Coral SQL Engine</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Database className="w-4.5 h-4.5" />
                <span>Risk Dashboard</span>
              </div>
              <ChevronRight className={`w-4 h-4 opacity-50 transition-transform ${activeTab === "dashboard" ? "rotate-90 text-indigo-400" : ""}`} />
            </button>

            <button
              onClick={() => setActiveTab("showcase")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "showcase"
                  ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Sparkles className="w-4.5 h-4.5 text-amber-400" />
                <span className="font-semibold text-amber-300/90">Coral Showcase</span>
              </div>
              <span className="bg-amber-400/10 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/20">Flagships</span>
            </button>

            <button
              onClick={() => setActiveTab("evidence")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "evidence"
                  ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileCode2 className="w-4.5 h-4.5" />
                <span>Evidence Explorer</span>
              </div>
              <ChevronRight className={`w-4 h-4 opacity-50 transition-transform ${activeTab === "evidence" ? "rotate-90 text-indigo-400" : ""}`} />
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "chat"
                  ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-4.5 h-4.5" />
                <span>AI Chat Assistant</span>
              </div>
              <ChevronRight className={`w-4 h-4 opacity-50 transition-transform ${activeTab === "chat" ? "rotate-90 text-indigo-400" : ""}`} />
            </button>
          </nav>
        </div>

        {/* Global Sync Trigger Footer */}
        <div className="p-4 border-t border-white/5 bg-slate-950/20">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs rounded-xl transition-all shadow-lg shadow-indigo-600/10 border border-indigo-500/35 hover:scale-[1.02]"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Syncing Coral..." : "Scan & Sync Coral DB"}</span>
          </button>
          <div className="mt-2 text-center">
            <span className="text-[10px] text-slate-500 font-medium">Synced with GitHub, Slack & Notion</span>
          </div>
        </div>
      </aside>

      {/* 2. MAIN APP CONTENT CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#050811] relative">
        
        {/* Flash Message Banner */}
        {statusMessage && (
          <div className="absolute top-4 right-6 z-50 py-3.5 px-5 bg-slate-900/90 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md max-w-md animate-fade-in flex items-center space-x-3">
            <div className="text-sm font-medium text-slate-200">{statusMessage}</div>
          </div>
        )}

        {/* Dynamic Nav Header */}
        <header className="h-18 border-b border-white/5 px-8 flex items-center justify-between shrink-0 bg-[#090d16]/30 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 font-bold uppercase tracking-wider">Coral SQL Network</span>
            <span className="text-slate-500">/</span>
            <h2 className="text-base font-bold text-white tracking-wide capitalize">{activeTab} Workspaces</h2>
          </div>
          <div className="flex items-center space-x-3 text-xs text-slate-400 bg-white/5 border border-white/5 py-1.5 px-3 rounded-full font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Simulated Connectors Active</span>
          </div>
        </header>

        {/* Tab View Switcher */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* TAB 1: MAIN RISK DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-8 max-w-7xl mx-auto">
              
              {/* Executive KPI Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Global Risk */}
                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-34">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Active Threats</span>
                    <ShieldAlert className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-black tracking-tight text-white">4 Modules</span>
                    <p className="text-xs text-indigo-400 font-semibold mt-1">Monitored via Coral SQL Layer</p>
                  </div>
                </div>

                {/* Overdue Deadlines */}
                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-34 glow-border-amber">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Notion Deadlines</span>
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-black tracking-tight text-amber-300">2 Critical</span>
                    <p className="text-xs text-slate-400 mt-1">Due in &lt; 48 hours</p>
                  </div>
                </div>

                {/* Open Bugs */}
                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-34 glow-border-crimson">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Open GitHub Bugs</span>
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-black tracking-tight text-rose-400">6 Issues</span>
                    <p className="text-xs text-slate-400 mt-1">3 High/Critical severity</p>
                  </div>
                </div>

                {/* Active Blockers */}
                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-34 glow-border-indigo">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Slack Blockers</span>
                    <MessageSquare className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-black tracking-tight text-indigo-300">4 Active</span>
                    <p className="text-xs text-slate-400 mt-1">Mentioned in team discussions</p>
                  </div>
                </div>

              </div>

              {/* Core Component Grid & Trends */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left pane: Component lists */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-white tracking-wide">Component Risk Index</h3>
                    <span className="text-xs text-slate-500 font-medium">Sorted by computed Coral Risk</span>
                  </div>

                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-28 w-full bg-slate-900/40 border border-white/5 rounded-2xl animate-pulse" />
                      ))}
                    </div>
                  ) : components.length === 0 ? (
                    <div className="glass-panel p-10 rounded-2xl text-center">
                      <Database className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No components indexed. Click Scan Coral DB below.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {components.map(comp => (
                        <div 
                          key={comp.id}
                          onClick={() => {
                            setSelectedCompId(comp.id);
                            setActiveTab("evidence");
                          }}
                          className={`glass-panel p-6 rounded-2xl border-l-4 cursor-pointer relative transition-all duration-300 group hover:scale-[1.01] ${
                            comp.risk_level === "Critical" ? "border-l-rose-500 glow-border-crimson" :
                            comp.risk_level === "High" ? "border-l-amber-500 glow-border-amber" :
                            comp.risk_level === "Medium" ? "border-l-blue-500 glow-border-indigo" :
                            "border-l-emerald-500 glow-border-emerald"
                          }`}
                        >
                          {/* Card Content Layout */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center space-x-3 mb-1.5">
                                <h4 className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors">{comp.name}</h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getRiskBadge(comp.risk_level)}`}>
                                  {comp.risk_level}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-1">{comp.primary_reason}</p>
                              
                              {/* Owners & Team info */}
                              <div className="flex items-center space-x-6 mt-3 text-[11px] text-slate-500">
                                <span className="flex items-center space-x-1.5">
                                  <User className="w-3.5 h-3.5" />
                                  <span>Lead: <b>{comp.owner}</b></span>
                                </span>
                                <span className="flex items-center space-x-1.5">
                                  <Users className="w-3.5 h-3.5" />
                                  <span>Team: <b>{comp.team}</b></span>
                                </span>
                              </div>
                            </div>

                            {/* Score Delta indicators */}
                            <div className="flex items-center space-x-4 self-end md:self-center">
                              
                              {/* Delta badge */}
                              {comp.delta !== 0 && (
                                <div className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black ${
                                  comp.delta > 0 
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                }`}>
                                  <TrendingUp className={`w-3.5 h-3.5 ${comp.delta < 0 ? "scale-y-[-1]" : ""}`} />
                                  <span>{comp.delta > 0 ? `+${comp.delta}` : comp.delta}</span>
                                </div>
                              )}

                              {/* Risk Value Circle */}
                              <div className="flex flex-col items-center">
                                <span className={`text-2xl font-black tracking-tighter ${
                                  comp.current_score >= 80 ? "text-rose-400 text-glow-crimson" :
                                  comp.current_score >= 55 ? "text-amber-400 text-glow-amber" :
                                  comp.current_score >= 30 ? "text-blue-400 text-glow-indigo" :
                                  "text-emerald-400 text-glow-emerald"
                                }`}>
                                  {Math.round(comp.current_score)}
                                </span>
                                <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider">Score</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right pane: Actionable Insights / Executive Panel & Custom SVGs */}
                <div className="space-y-6">
                  
                  {/* SVG historical trend line chart */}
                  <div className="glass-panel p-6 rounded-2xl">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center space-x-1.5">
                      <TrendingUp className="w-4 h-4 text-indigo-400" />
                      <span>Historical Risk Trend</span>
                    </h4>
                    
                    {/* Embedded SVG chart */}
                    <div className="w-full h-40 flex items-center justify-center relative">
                      <svg className="w-full h-full" viewBox="0 0 300 120">
                        {/* Grids */}
                        <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                        <line x1="0" y1="60" x2="300" y2="60" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                        <line x1="0" y1="100" x2="300" y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                        
                        {/* Shaded area */}
                        <path 
                          d="M0 120 L0 75 L75 80 L150 55 L225 35 L300 20 L300 120 Z" 
                          fill="url(#indigo-grad)" 
                          opacity="0.15" 
                        />
                        
                        {/* Trend lines */}
                        <path 
                          d="M0 75 L75 80 L150 55 L225 35 L300 20" 
                          fill="none" 
                          stroke="#6366f1" 
                          strokeWidth="3.5" 
                          strokeLinecap="round"
                        />
                        
                        {/* Forecast dotted boundary */}
                        <path 
                          d="M300 20 L350 10" 
                          fill="none" 
                          stroke="#a5b4fc" 
                          strokeWidth="2.5" 
                          strokeDasharray="4,4" 
                          opacity="0.8"
                        />
                        
                        {/* Dots */}
                        <circle cx="0" cy="75" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                        <circle cx="75" cy="80" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                        <circle cx="150" cy="55" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                        <circle cx="225" cy="35" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                        <circle cx="300" cy="20" r="5.5" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                        
                        <defs>
                          <linearGradient id="indigo-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#050811" />
                          </linearGradient>
                        </defs>
                      </svg>
                      
                      <div className="absolute bottom-1 right-2 text-[9px] font-black text-indigo-400 tracking-wider uppercase bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                        7-Day Forecast Projection
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold px-1 mt-3">
                      <span>May 26</span>
                      <span>May 27</span>
                      <span>May 28</span>
                      <span>May 29</span>
                      <span>Today</span>
                    </div>
                  </div>

                  {/* Executive-Focused Insights Panel */}
                  <div className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-indigo-950/20 to-transparent">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3.5 flex items-center space-x-1.5">
                      <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
                      <span>Executive Action Checklist</span>
                    </h4>
                    
                    <div className="space-y-4">
                      
                      {/* Critical Path Warning */}
                      <div className="p-3.5 bg-rose-500/5 rounded-xl border border-rose-500/15 flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
                        <div>
                          <h5 className="text-xs font-bold text-rose-300">Database Migration (92% Score)</h5>
                          <p className="text-[11px] text-slate-400 mt-1">Postgres sharding process OOM failures are blocking Stripe integrations. Scheduled deadline is tomorrow.</p>
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mt-1.5 inline-block">Action: Triage AWS Sandbox IOPS</span>
                        </div>
                      </div>

                      {/* Rising Risk */}
                      <div className="p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/15 flex items-start space-x-3">
                        <TrendingUp className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-xs font-bold text-amber-300">Auth Security Delays (72% Score)</h5>
                          <p className="text-[11px] text-slate-400 mt-1">Pending security review for JWT rotation module has halted token upgrade implementations for 5 days.</p>
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mt-1.5 inline-block">Action: Escalate to Security SecOps</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* SIMULATION EVENT INJECTOR (DEMO WORKSPACE) */}
                  <div className="glass-panel p-6 rounded-2xl border border-dashed border-indigo-500/20 bg-indigo-950/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 text-indigo-400 opacity-20">
                      <Terminal className="w-14 h-14" />
                    </div>
                    
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3.5 flex items-center space-x-1.5">
                      <Terminal className="w-4 h-4 text-indigo-400" />
                      <span>Workspace Simulator Console</span>
                    </h4>
                    
                    <div className="space-y-3.5">
                      
                      {/* Component select */}
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Target Component</label>
                        <select 
                          value={simCompId}
                          onChange={(e) => setSimCompId(e.target.value)}
                          className="w-full bg-[#050811] border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500/40"
                        >
                          <option value="auth-service">Authentication Service</option>
                          <option value="db-migration">Database Migration</option>
                          <option value="payment-gateway">Payment Gateway Integration</option>
                          <option value="analytics-dashboard">Analytics Dashboard</option>
                        </select>
                      </div>

                      {/* Presets Grid */}
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">Quick Presets</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handlePresetSelect("slack_blocker")}
                            className="py-1.5 px-2 bg-[#090d16] hover:bg-indigo-500/10 text-[10px] font-bold rounded-lg border border-white/5 text-slate-300 hover:text-indigo-300 transition-all text-left"
                          >
                            💬 Slack Blocker
                          </button>
                          <button
                            onClick={() => handlePresetSelect("github_bug")}
                            className="py-1.5 px-2 bg-[#090d16] hover:bg-indigo-500/10 text-[10px] font-bold rounded-lg border border-white/5 text-slate-300 hover:text-indigo-300 transition-all text-left"
                          >
                            🐛 GitHub Bug
                          </button>
                          <button
                            onClick={() => handlePresetSelect("github_pr")}
                            className="py-1.5 px-2 bg-[#090d16] hover:bg-indigo-500/10 text-[10px] font-bold rounded-lg border border-white/5 text-slate-300 hover:text-indigo-300 transition-all text-left"
                          >
                             stagnation Stale PR
                          </button>
                          <button
                            onClick={() => handlePresetSelect("notion_deadline")}
                            className="py-1.5 px-2 bg-[#090d16] hover:bg-indigo-500/10 text-[10px] font-bold rounded-lg border border-white/5 text-slate-300 hover:text-indigo-300 transition-all text-left"
                          >
                            📅 Notion Deadline
                          </button>
                        </div>
                      </div>

                      {/* Text content details */}
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Simulated Signal Details</label>
                        <textarea
                          rows={2}
                          value={simContent}
                          onChange={(e) => setSimContent(e.target.value)}
                          className="w-full bg-[#050811] border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500/40 resize-none font-sans"
                        />
                      </div>

                      {/* Execute Trigger */}
                      <button
                        onClick={handleSimulate}
                        className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/60 rounded-xl font-bold text-xs transition-all hover:scale-[1.01]"
                      >
                        <Play className="w-4.5 h-4.5" />
                        <span>Inject Simulated Event</span>
                      </button>

                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 2: CORAL FLAGSHIP SHOWCASE */}
          {activeTab === "showcase" && (
            <div className="space-y-8 max-w-7xl mx-auto">
              
              {/* Feature Header */}
              <div className="glass-panel p-6 rounded-2xl bg-gradient-to-r from-indigo-950/20 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <h3 className="text-xl font-black text-white tracking-wide">Coral Unified SQL Showcase</h3>
                  </div>
                  <p className="text-sm text-slate-400 max-w-3xl">
                    Demonstrating Coral's core architectural strength: running robust cross-source SQL queries joining **GitHub Pull Requests/Issues**, **Slack Logs**, and **Notion Projects** through a single unified database API layer.
                  </p>
                </div>
                <div className="bg-amber-400/10 text-amber-300 border border-amber-400/20 rounded-2xl py-2.5 px-4 text-xs font-bold text-center shrink-0">
                  ⚡ Best Use of Coral Showcase
                </div>
              </div>

              {/* Showcase queries grid */}
              <div className="space-y-8">
                {showcaseQueries.length === 0 ? (
                  <div className="glass-panel p-20 text-center rounded-2xl animate-pulse">
                    <Database className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400">Loading flagship queries executing on Coral SQL layer...</p>
                  </div>
                ) : (
                  showcaseQueries.map((query, index) => (
                    <div key={index} className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5 hover:border-indigo-500/20 transition-all">
                      
                      {/* Query Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 gap-2">
                        <div className="flex items-center space-x-3">
                          <span className="h-6 w-6 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-xs font-black text-indigo-300">
                            {index + 1}
                          </span>
                          <h4 className="font-bold text-base text-white">{query.name}</h4>
                        </div>
                        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                          Coral SQLite Engine
                        </span>
                      </div>

                      {/* SQL Code Panel */}
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <Terminal className="w-3.5 h-3.5" />
                          <span>Executed SQL Statement</span>
                        </div>
                        <pre className="sql-highlight text-xs text-indigo-200 overflow-x-auto p-4 bg-slate-950/70 select-all font-mono leading-relaxed border border-white/5">
                          {query.sql}
                        </pre>
                      </div>

                      {/* SQL Tabular Results */}
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <Database className="w-3.5 h-3.5" />
                          <span>Raw Query Output Grid</span>
                        </div>
                        
                        <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/20">
                          <table className="w-full border-collapse text-left text-xs">
                            <thead>
                              <tr className="bg-slate-900/60 border-b border-white/5 text-slate-400 font-black uppercase tracking-wider">
                                {query.columns.map((col, idx) => (
                                  <th key={idx} className="py-2.5 px-4 font-black">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {query.rows.length === 0 ? (
                                <tr>
                                  <td colSpan={query.columns.length} className="py-4 px-4 text-center text-slate-500 italic">
                                    No records returned (All items currently in synced/stable condition).
                                  </td>
                                </tr>
                              ) : (
                                query.rows.map((row, rIdx) => (
                                  <tr key={rIdx} className="border-b border-white/5 hover:bg-white/3 font-medium transition-colors">
                                    {row.map((val, cIdx) => (
                                      <td key={cIdx} className="py-2.5 px-4 text-slate-300 max-w-sm truncate select-all">{String(val)}</td>
                                    ))}
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Generated EM Insight Alert */}
                      <div className="p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-xl flex items-start space-x-3">
                        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block">Generated Executive Insight</span>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">{query.insight}</p>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 3: EVIDENCE EXPLORER */}
          {activeTab === "evidence" && (
            <div className="space-y-8 max-w-7xl mx-auto">
              
              {/* Component selection row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                <div>
                  <h3 className="text-lg font-black text-white tracking-wide">Scoring Evidence Explorer</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Audit the exact SQL facts and source integrations that computed the component's risk rating.</p>
                </div>
                
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-xs text-slate-400 font-semibold">Select Component:</span>
                  <select 
                    value={selectedCompId}
                    onChange={(e) => setSelectedCompId(e.target.value)}
                    className="bg-[#090d16] border border-white/10 rounded-xl py-2 px-4 text-xs font-semibold text-slate-200 outline-none focus:border-indigo-500/40"
                  >
                    <option value="auth-service">Authentication Service</option>
                    <option value="db-migration">Database Migration</option>
                    <option value="payment-gateway">Payment Gateway Integration</option>
                    <option value="analytics-dashboard">Analytics Dashboard</option>
                  </select>
                </div>
              </div>

              {!evidence ? (
                <div className="glass-panel p-20 text-center rounded-2xl animate-pulse">
                  <Database className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400">Loading audit records from Coral database...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left Column: Risk breakdown factors */}
                  <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-2xl">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Risk Factor Breakdown</h4>
                      
                      <div className="space-y-4">
                        
                        {/* Factor 1: Deadline */}
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1.5">
                            <span className="text-slate-300">Notion Deadline Risk</span>
                            <span className="text-amber-400">{evidence.breakdown.deadline_risk} / 30</span>
                          </div>
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5">
                            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(evidence.breakdown.deadline_risk / 30) * 100}%` }} />
                          </div>
                        </div>

                        {/* Factor 2: Bugs */}
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1.5">
                            <span className="text-slate-300">GitHub Bug Severity</span>
                            <span className="text-rose-400">{evidence.breakdown.bug_risk} / 25</span>
                          </div>
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5">
                            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(evidence.breakdown.bug_risk / 25) * 100}%` }} />
                          </div>
                        </div>

                        {/* Factor 3: Blockers */}
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1.5">
                            <span className="text-slate-300">Slack Blocker Flags</span>
                            <span className="text-indigo-400">{evidence.breakdown.blocker_risk} / 25</span>
                          </div>
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(evidence.breakdown.blocker_risk / 25) * 100}%` }} />
                          </div>
                        </div>

                        {/* Factor 4: Stale PR */}
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1.5">
                            <span className="text-slate-300">GitHub Stale Pull Requests</span>
                            <span className="text-blue-400">{evidence.breakdown.stale_pr_risk} / 20</span>
                          </div>
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(evidence.breakdown.stale_pr_risk / 20) * 100}%` }} />
                          </div>
                        </div>

                      </div>

                      {/* Total score box */}
                      <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between bg-slate-950/20 p-4 rounded-xl">
                        <div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Composite Audit Score</span>
                          <span className="text-xs text-slate-300 font-bold">Sum of individual source metrics</span>
                        </div>
                        <span className="text-3xl font-black text-white text-glow-indigo">{Math.round(evidence.breakdown.total_score)}%</span>
                      </div>
                    </div>

                    {/* Integrated Source Badges */}
                    <div className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-indigo-950/20 to-transparent">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Linked Data Integrations</h4>
                      <div className="flex flex-wrap gap-2.5">
                        {["GitHub", "Slack", "Notion"].map(src => {
                          const active = evidence.sources.includes(src);
                          return (
                            <span 
                              key={src}
                              className={`py-1.5 px-3 rounded-full text-xs font-bold border transition-colors flex items-center space-x-1.5 ${
                                active 
                                  ? "bg-indigo-500/10 border-indigo-500/35 text-indigo-300 font-bold" 
                                  : "bg-[#090d16]/30 border-white/5 text-slate-500"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-indigo-400 animate-ping" : "bg-slate-600"}`}></span>
                              <span>{src}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Dynamic SQL queries checklist */}
                  <div className="lg:col-span-2 space-y-6">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Scoring SQL Evidence Queries</h4>
                    
                    <div className="space-y-6">
                      {evidence.queries.map((q, idx) => (
                        <div key={idx} className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                          
                          {/* Query Name */}
                          <div className="flex items-center space-x-2 pb-2 border-b border-white/5">
                            <Terminal className="w-4 h-4 text-indigo-400" />
                            <h5 className="font-bold text-xs text-white">{q.name}</h5>
                          </div>

                          {/* Code */}
                          <pre className="sql-highlight text-[11px] text-indigo-200 select-all p-3.5 bg-slate-950/50 border border-white/5 max-h-32 overflow-y-auto leading-relaxed">
                            {q.sql}
                          </pre>

                          {/* Table results */}
                          <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/20">
                            <table className="w-full border-collapse text-left text-[11px]">
                              <thead>
                                <tr className="bg-slate-900/60 border-b border-white/5 text-slate-400 font-black uppercase tracking-wider">
                                  {q.columns.map((col, cIdx) => (
                                    <th key={cIdx} className="py-2 px-3">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {q.rows.length === 0 ? (
                                  <tr>
                                    <td colSpan={q.columns.length} className="py-3 px-3 text-center text-slate-500 italic">
                                      No query rows returned (Satisfied condition - contributes 0 points).
                                    </td>
                                  </tr>
                                ) : (
                                  q.rows.map((row, rIdx) => (
                                    <tr key={rIdx} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                      {row.map((val, colIdx) => (
                                        <td key={colIdx} className="py-2 px-3 text-slate-300 max-w-sm truncate">{String(val)}</td>
                                      ))}
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Computed score impact */}
                          <div className="text-[10px] text-slate-400 bg-white/3 py-1.5 px-3 rounded-lg border border-white/5 font-semibold">
                            📈 Score Impact: {q.insight}
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 4: EM AI CHAT ASSISTANT */}
          {activeTab === "chat" && (
            <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-210px)] flex flex-col min-h-0">
              
              {/* Splitted Chat Assistant layout */}
              <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                
                {/* Chat conversation area */}
                <div className="flex-1 glass-panel rounded-2xl flex flex-col justify-between min-h-0 bg-[#090d16]/30">
                  
                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar">
                    {chatHistory.map((chat, idx) => (
                      <div 
                        key={idx} 
                        className={`flex ${chat.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-2xl rounded-2xl py-3.5 px-5 text-sm leading-relaxed border transition-all ${
                          chat.role === "user"
                            ? "bg-indigo-600 border-indigo-500/30 text-white font-medium"
                            : "bg-[#0f172a]/60 border-white/5 text-slate-200"
                        }`}>
                          {/* Basic markdown parsing headers */}
                          {chat.content.split("\n").map((line, lIdx) => {
                            if (line.startsWith("### ")) {
                              return <h4 key={lIdx} className="font-black text-white text-base mt-2 mb-1.5">{line.substring(4)}</h4>;
                            } else if (line.startsWith("- ")) {
                              return <li key={lIdx} className="ml-4 list-disc text-slate-300">{line.substring(2)}</li>;
                            } else if (line.startsWith("**") && line.endsWith("**")) {
                              return <p key={lIdx} className="font-bold text-indigo-300 mt-2 mb-1">{line.replace(/\*\*/g, "")}</p>;
                            }
                            return <p key={lIdx} className="mt-1">{line}</p>;
                          })}
                        </div>
                      </div>
                    ))}
                    
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-[#0f172a]/60 border border-white/5 rounded-2xl py-3 px-5 text-sm flex items-center space-x-2 text-indigo-400">
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                          <span className="font-bold text-xs uppercase tracking-wider animate-pulse">Coral executing SQL query...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input form */}
                  <form onSubmit={handleChatSubmit} className="p-4 border-t border-white/5 flex items-center space-x-3 bg-slate-950/20">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask Coral EM Assistant (e.g. 'Why is db-migration high risk?')"
                      className="flex-1 bg-[#050811] border border-white/10 rounded-xl py-3 px-4 text-xs text-slate-200 outline-none focus:border-indigo-500/40 placeholder:text-slate-600 font-semibold"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading}
                      className="p-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/10 border border-indigo-500/30 shrink-0"
                    >
                      <Send className="w-4.5 h-4.5" />
                    </button>
                  </form>

                </div>

                {/* Right panel: Active SQL execution log/traces */}
                <div className="w-full lg:w-96 glass-panel rounded-2xl p-5 flex flex-col justify-between shrink-0 bg-slate-950/25">
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center space-x-1.5">
                      <Terminal className="w-4 h-4 text-indigo-400" />
                      <span>Coral SQL Query Trace</span>
                    </h4>
                    
                    {!sqlTrace ? (
                      <div className="h-40 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/5 rounded-xl">
                        <HelpCircle className="w-8 h-8 text-slate-700 mb-2" />
                        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                          Submit a prompt to view the SQL query compiled by Coral's LLM agent.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        
                        {/* Query Statement */}
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Compiled SQL Statement</span>
                          <pre className="sql-highlight text-[10px] text-indigo-200 overflow-x-auto p-3 max-h-32 bg-slate-950/70 border border-white/5 leading-relaxed font-mono">
                            {sqlTrace.sql}
                          </pre>
                        </div>

                        {/* Result summary count */}
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Returned SQL Table Rows</span>
                          <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl text-xs text-slate-300 font-semibold flex items-center justify-between">
                            <span>Row Output Count</span>
                            <span className="bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 font-black">{sqlTrace.results.length} rows</span>
                          </div>
                        </div>

                        {/* Preview of rows */}
                        {sqlTrace.results.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Grid Output Preview</span>
                            <div className="max-h-32 overflow-y-auto border border-white/5 rounded-xl text-[10px] bg-slate-950/20 scrollbar">
                              {sqlTrace.results.slice(0, 3).map((row, rIdx) => (
                                <div key={rIdx} className="p-2 border-b border-white/5 text-slate-400 font-mono truncate">
                                  {JSON.stringify(row)}
                                </div>
                              ))}
                              {sqlTrace.results.length > 3 && (
                                <div className="p-2 text-center text-slate-600 font-semibold italic">
                                  + {sqlTrace.results.length - 3} additional rows
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </div>

                  {/* Schema layout reminders */}
                  <div className="mt-6 pt-4 border-t border-white/5">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 block">Coral Unified Schema</span>
                    <div className="flex flex-wrap gap-1.5 text-[9px] text-slate-500 font-mono">
                      {["notion_tasks", "github_issues", "github_pull_requests", "slack_messages", "components", "risk_history"].map(table => (
                        <span key={table} className="bg-white/3 py-0.5 px-1.5 rounded border border-white/5">{table}</span>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>

      </main>

    </div>
  );
}
