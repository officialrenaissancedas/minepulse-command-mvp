import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  AlertTriangle,
  DollarSign,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BookOpenCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Cloud,
  Download,
  FileCheck2,
  FileText,
  Globe2,
  HardHat,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Moon,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  Siren,
  Sparkles,
  Sun,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "../contexts/ThemeContext";
import DroneCommand from "../components/DroneCommand";
import OverviewDetection from "../components/OverviewDetection";
import ScaleCosting from "../components/ScaleCosting";
import {
  createRemoteObservation,
  ensureSupabaseSession,
  isSupabaseConfigured,
  loadWorkspaceData,
  markRiskReviewed,
  supabase,
  uploadEvidence,
} from "../lib/supabase";

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Compliance", icon: ShieldCheck, count: "12" },
  { label: "Field operations", icon: ClipboardCheck },
  { label: "Contractors", icon: UsersRound },
  { label: "Reports", icon: FileText },
  { label: "Drone command", icon: Activity, count: "LIVE" },
  { label: "Scalability", icon: Layers, count: "PLAN" },
  { label: "Costing", icon: DollarSign, count: "₹" },
];

const mines = [
  { name: "Gevra OC", location: "Korba · Chhattisgarh", score: 94, status: "Healthy", x: "58%", y: "47%", color: "green" },
  { name: "Dipka OC", location: "Korba · Chhattisgarh", score: 82, status: "Watch", x: "61%", y: "55%", color: "amber" },
  { name: "Kusmunda", location: "Korba · Chhattisgarh", score: 76, status: "Action needed", x: "55%", y: "63%", color: "red" },
  { name: "Sohagpur", location: "Umaria · Madhya Pradesh", score: 91, status: "Healthy", x: "43%", y: "37%", color: "green" },
  { name: "Jayant", location: "Singrauli · MP", score: 88, status: "Healthy", x: "36%", y: "53%", color: "green" },
  { name: "Nigahi", location: "Singrauli · MP", score: 69, status: "Action needed", x: "31%", y: "62%", color: "red" },
];

const riskItems = [
  { title: "Dust suppression log overdue", mine: "Kusmunda Mine · Environment", age: "2h ago", level: "Critical", color: "red", icon: Cloud },
  { title: "Contractor induction gap", mine: "Nigahi Project · Labour", age: "5h ago", level: "High", color: "amber", icon: UsersRound },
  { title: "DGMS inspection follow-up", mine: "Dipka OC · Safety", age: "Yesterday", level: "Medium", color: "blue", icon: FileCheck2 },
];

const activityItems = [
  { title: "New observation logged", detail: "Haul road · Kusmunda", actor: "AK", time: "09:42", type: "observation", color: "amber" },
  { title: "Corrective action closed", detail: "PPE compliance · Gevra", actor: "RM", time: "09:18", type: "closed", color: "green" },
  { title: "Monthly report generated", detail: "Environment · Korba cluster", actor: "SY", time: "08:56", type: "report", color: "blue" },
  { title: "Risk threshold crossed", detail: "Induction coverage · Nigahi", actor: "AI", time: "08:22", type: "risk", color: "red" },
];

const navSubtitles: Record<string, string> = {
  Overview: "Good morning, admin. Here is the operating picture across your mines.",
  Compliance: "Track safety, environment, production, and labour statutes with inspections, violations, and corrective-action ownership.",
  "Field operations": "Capture geo-tagged, time-stamped inspections, safety observations, attendance, and incident reports—even when teams are offline.",
  Contractors: "Monitor contractor induction, labour attendance, licences, documents, and safety performance across every mine.",
  Reports: "Generate statutory reports, automate alerts and escalations, and preserve a transparent digital audit trail.",
  "Drone command": "Run coal-mine drone missions, review geo-tagged findings, and route evidence through a human approval checkpoint.",
  Scalability: "Model ingest, inference, storage, and human-review capacity from one drone to a multi-mine control room.",
  Costing: "Adjust deployment assumptions, inspect the transparent monthly estimate, and export a planning-ready cost model.",
};

const workspaceOptions = [
  { name: "Coal India · Central", mines: "6 mines connected" },
  { name: "Coal India · East", mines: "4 mines connected" },
  { name: "Coal India · North", mines: "5 mines connected" },
  { name: "Coal India · West", mines: "3 mines connected" },
];

type LocalObservation = {
  id: string;
  title: string;
  mine: string;
  level: string;
  description: string;
  age: string;
  color: "red" | "amber" | "blue";
};

type AutoReport = {
  id: string;
  title: string;
  category: string;
  mine: string;
  level: string;
  description: string;
  recipient: string;
  status: "Sent" | "Queued" | "Failed";
  createdAt: string;
};

type DetailPanel = {
  title: string;
  eyebrow: string;
  description: string;
  facts: string[];
  action?: string;
};

const observationsStorageKey = "minepulse-observations-v1";
const resolvedRisksStorageKey = "minepulse-resolved-risks-v1";
const autoReportsStorageKey = "minepulse-auto-reports-v1";

function relativeAge(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function mapRemoteObservation(row: { id: string; title: string; mine: string; severity: string; description: string; created_at: string }): LocalObservation {
  const level = row.severity as LocalObservation["level"];
  return { id: row.id, title: row.title, mine: row.mine, level, description: row.description, age: relativeAge(row.created_at), color: level === "Critical" ? "red" : level === "High" ? "amber" : "blue" };
}

function mapRemoteReport(row: { id: string; title: string; category: string; mine: string; severity: string; description: string; recipient: string; status: AutoReport["status"]; created_at: string }): AutoReport {
  return { id: row.id, title: row.title, category: row.category, mine: row.mine, level: row.severity, description: row.description, recipient: row.recipient, status: row.status, createdAt: new Date(row.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) };
}

function Sparkline({ points, color = "#a6e36a" }: { points: string; color?: string }) {
  return (
    <svg viewBox="0 0 120 36" className="sparkline" aria-hidden="true" preserveAspectRatio="none">
      <path d={points} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div className="score-ring" style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}>
      <div className="score-ring__inner">
        <strong>{score}</strong>
        <span>/ 100</span>
      </div>
    </div>
  );
}

function DetailDrawer({ detail, dataSource, onClose, onAction }: { detail: DetailPanel; dataSource: string; onClose: () => void; onAction: (label: string) => void }) {
  const [tab, setTab] = useState<"evidence" | "timeline" | "actions">("evidence");
  const [completed, setCompleted] = useState<number[]>([0]);
  const title = detail.title.toLowerCase();
  const isRisk = title.includes("risk") || title.includes("overdue") || title.includes("gap");
  const isReport = title.includes("report") || title.includes("export");
  const isCompliance = title.includes("compliance") || title.includes("statute") || title.includes("inspection");
  const profile = isRisk
    ? { status: "Needs attention", statusClass: "red", owner: "Safety cell", due: "Due today", score: 61, signal: "Escalation confidence", signalValue: "94%", facts: ["Signal crossed the configured high-risk threshold", "Two supporting observations are linked to this record", "Route to the mine safety officer before shift handover"], timeline: [["09:42", "Risk threshold crossed", "AI triage"], ["09:31", "Evidence packet attached", "Field operator"], ["08:56", "Last safe reading", "Telemetry"]], action: detail.action || "Assign safety owner" }
    : isReport
      ? { status: "Ready to send", statusClass: "blue", owner: "Regional reporting", due: "Generated 18 min ago", score: 96, signal: "Evidence coverage", signalValue: "98%", facts: ["All required mine records have a current timestamp", "One environmental attachment is awaiting checksum", "Recipients can review the source records before dispatch"], timeline: [["09:24", "Report generated", "Automation"], ["09:12", "Evidence reconciled", "Control room"], ["08:56", "Last source sync", "Supabase"]], action: detail.action || "Dispatch report" }
      : isCompliance
        ? { status: "Review in progress", statusClass: "amber", owner: "Compliance lead", due: "Next review in 2 days", score: 82, signal: "Readiness score", signalValue: "82/100", facts: ["DGMS inspection evidence is mapped to this review", "The latest field observation has a named responsible owner", "One follow-up check remains before closure can be recommended"], timeline: [["Today", "Owner acknowledged review", "N. Prakash"], ["Yesterday", "Inspection packet uploaded", "Field operations"], ["26 Sep", "Previous action closed", "Compliance"]], action: detail.action || "Open review checklist" }
        : { status: "Operational", statusClass: "green", owner: "Field operations", due: "Updated 2 min ago", score: 88, signal: "Field readiness", signalValue: "4.6/5", facts: ["Location, owner, and timestamp are attached to the observation", "The latest evidence is available for a second-person check", "Next handover is scheduled for the current shift supervisor"], timeline: [["09:42", "Observation logged", "Admin"], ["09:18", "Crew check-in received", "Shift 2"], ["08:56", "Mine sync completed", "Gateway"]], action: detail.action || "Assign field owner" };
  const progress = Math.round((completed.length / profile.facts.length) * 100);
  const toggleFact = (index: number) => setCompleted((items) => items.includes(index) ? items.filter((item) => item !== index) : [...items, index]);
  return <div className="detail-backdrop" onClick={onClose}><aside className="detail-drawer detail-drawer--contextual" onClick={(event) => event.stopPropagation()}>
    <div className="detail-drawer__header"><div><div className={`panel-kicker panel-kicker--${profile.statusClass}`}><span className="panel-kicker__dot" /> {detail.eyebrow}</div><h2>{detail.title}</h2><div className="drawer-status-row"><span className={`drawer-status drawer-status--${profile.statusClass}`}><span /> {profile.status}</span><span>{profile.due}</span></div></div><button className="icon-button" onClick={onClose} aria-label="Close details"><X size={18} /></button></div>
    <p className="detail-drawer__description">{detail.description}</p>
    <div className="drawer-kpi-grid"><div><span>OWNER</span><strong>{profile.owner}</strong></div><div><span>{profile.signal.toUpperCase()}</span><strong>{profile.signalValue}</strong></div><div><span>RECORD HEALTH</span><strong>{profile.score}%</strong></div></div>
    <div className="drawer-progress"><div><span>Review completion</span><b>{progress}%</b></div><i><em style={{ width: `${progress}%` }} /></i></div>
    <div className="drawer-tabs" role="tablist" aria-label="Detail sections"><button className={tab === "evidence" ? "is-active" : ""} onClick={() => setTab("evidence")}>Evidence</button><button className={tab === "timeline" ? "is-active" : ""} onClick={() => setTab("timeline")}>Timeline</button><button className={tab === "actions" ? "is-active" : ""} onClick={() => setTab("actions")}>Next actions</button></div>
    {tab === "evidence" && <div className="drawer-evidence"><div className="drawer-section-heading"><span>CHECKPOINTS</span><b>{completed.length}/{profile.facts.length} verified</b></div>{profile.facts.map((fact, index) => <button className={`drawer-check ${completed.includes(index) ? "is-complete" : ""}`} key={fact} onClick={() => toggleFact(index)}><span>{completed.includes(index) ? <CheckCircle2 size={16} /> : <span className="drawer-check-empty" />}</span><strong>{fact}</strong></button>)}</div>}
    {tab === "timeline" && <div className="drawer-timeline">{profile.timeline.map(([time, label, actor], index) => <div className="drawer-timeline-row" key={label}><span className={`drawer-timeline-dot ${index === 0 ? "is-current" : ""}`} /><div><strong>{label}</strong><small>{actor} · {time}</small></div>{index === 0 && <em>Now</em>}</div>)}</div>}
    {tab === "actions" && <div className="drawer-actions"><div className="drawer-action-card drawer-action-card--primary"><span><Zap size={15} /></span><div><strong>{profile.action}</strong><small>Moves this record to the next accountable step.</small></div><button onClick={() => onAction(profile.action)}><ArrowUpRight size={15} /></button></div><div className="drawer-action-card"><span><FileCheck2 size={15} /></span><div><strong>Open source packet</strong><small>Review attachments, location data, and audit history.</small></div><button onClick={() => setTab("evidence")}><ArrowUpRight size={15} /></button></div><div className="drawer-action-card"><span><Cloud size={15} /></span><div><strong>Share with shift lead</strong><small>Prepare a read-only handover summary.</small></div><button onClick={() => onAction("Share handover summary")}><ArrowUpRight size={15} /></button></div></div>}
    <div className="detail-drawer__footer"><span><Cloud size={14} /> {dataSource} · audit trail enabled</span><button className="button button--primary" onClick={() => onAction(profile.action)}><Zap size={14} /> {profile.action}</button></div>
  </aside></div>;
}

function WorkspaceView({ view, visibleRisks, autoReports, resolveRisk, onAction, onExport, onObservation, onCopilot, onNavigate }: { view: string; visibleRisks: any[]; autoReports: AutoReport[]; resolveRisk: (title: string) => void; onAction: (title: string, description: string) => void; onExport: (label: string) => void; onObservation: () => void; onCopilot: () => void; onNavigate: (label: string) => void }) {
  if (view === "Compliance") {
    return <div className="workspace-view">
      <section className="metric-grid" aria-label="Compliance summary">
        <article className="metric-card metric-card--featured"><div className="metric-card__top"><span className="metric-icon metric-icon--lime"><ShieldCheck size={18} /></span><span className="metric-trend metric-trend--up"><ArrowUpRight size={14} /> 4.8%</span></div><div className="metric-value">86.4<span>/100</span></div><div className="metric-label">Portfolio compliance score</div><div className="metric-footer"><Sparkline points="M0 27 C15 28, 19 20, 31 22 S48 25, 56 17 S70 18, 78 10 S94 15, 120 3" /><span>vs. 82.4 last month</span></div></article>
        <article className="metric-card"><div className="metric-card__top"><span className="metric-icon metric-icon--amber"><Siren size={18} /></span><span className="metric-trend metric-trend--down"><ArrowDownRight size={14} /> 3 critical</span></div><div className="metric-value">12</div><div className="metric-label">Open compliance findings</div><div className="metric-footer"><span>9 high priority</span><span>↓ 12.2%</span></div></article>
        <article className="metric-card"><div className="metric-card__top"><span className="metric-icon metric-icon--blue"><ClipboardCheck size={18} /></span><span className="metric-trend metric-trend--up">On track</span></div><div className="metric-value">94.2<span>%</span></div><div className="metric-label">Corrective actions on time</div><div className="metric-footer"><div className="progress-line"><span style={{ width: "94.2%" }} /></div><span>Target 90%</span></div></article>
        <article className="metric-card"><div className="metric-card__top"><span className="metric-icon metric-icon--purple"><CalendarClock size={18} /></span><span className="metric-trend metric-trend--neutral">This week</span></div><div className="metric-value">18</div><div className="metric-label">Reviews due</div><div className="metric-footer"><span>6 due today</span><span>4 owners</span></div></article>
      </section>
      <div className="statutory-lanes" aria-label="Statutory compliance domains"><button onClick={() => onAction("Safety statutes", "DGMS inspections and critical safety observations are ready to review.")}><ShieldCheck size={15} /><span><strong>Safety</strong><small>DGMS · 92% ready</small></span><b>3 open</b></button><button onClick={() => onAction("Environment statutes", "Dust suppression, water, and emissions evidence is ready to review.")}><Cloud size={15} /><span><strong>Environment</strong><small>Evidence · 88% ready</small></span><b>2 open</b></button><button onClick={() => onAction("Production statutes", "Production and dispatch reporting is ready to review.")}><Activity size={15} /><span><strong>Production</strong><small>Returns · 96% ready</small></span><b>1 open</b></button><button onClick={() => onAction("Labour statutes", "Attendance, grievances, and contractor labour records are ready to review.")}><UsersRound size={15} /><span><strong>Labour</strong><small>Welfare · 84% ready</small></span><b>6 open</b></button></div>
      <section className="dashboard-grid dashboard-grid--top">
        <article className="panel workspace-table-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot" /> STATUTORY COMPLIANCE CONTROL</div><h2>Statutory readiness by site</h2></div><button className="button button--secondary" onClick={() => onExport("Compliance register")}> <Download size={14} /> Export register</button></div><div className="workspace-table">{mines.map((mine) => <button className="workspace-table-row" key={mine.name} onClick={() => onAction(`${mine.name} compliance review`, "Open the site checklist, evidence gaps, responsible owner, and corrective-action history.")}><span className={`mini-status mini-status--${mine.color}`} /><span><strong>{mine.name}</strong><small>{mine.location}</small></span><b>{mine.score}/100</b><span className={`status-label status-label--${mine.color}`}>{mine.status}</span><ChevronRight size={15} /></button>)}</div></article>
        <article className="panel risk-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--amber" /> REVIEW QUEUE</div><h2>Violations & corrective actions</h2></div><button className="text-button" onClick={() => onNavigate("Reports")}>Audit trail <ChevronRight size={14} /></button></div><div className="risk-list">{visibleRisks.slice(0, 4).map((item, index) => { const Icon = item.icon; return <button className="risk-item" key={`${item.title}-${index}`} onClick={() => resolveRisk(item.title)}><span className={`risk-item__icon risk-item__icon--${item.color}`}><Icon size={16} /></span><span className="risk-item__copy"><strong>{item.title}</strong><small>{item.mine}</small></span><span className="risk-item__meta"><b className={`risk-pill risk-pill--${item.color}`}>{item.level}</b><small>{item.age}</small></span></button>; })}</div><button className="risk-footer" onClick={onObservation}><Siren size={15} /> Log a new finding <ChevronRight size={15} /></button></article>
      </section>
      <section className="dashboard-grid dashboard-grid--bottom"><article className="panel action-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--blue" /> DUE TODAY</div><h2>Close the loop</h2></div></div><div className="action-list"><button className="action-row" onClick={() => onAction("Review ventilation inspection", "Kusmunda inspection packet opened.")}><span className="action-check" /><span className="action-copy"><strong>Review ventilation inspection</strong><small>Kusmunda Mine · Due in 2 days</small></span><ChevronRight size={15} className="row-chevron" /></button><button className="action-row" onClick={() => onAction("Verify contractor induction", "Nigahi contractor records opened.")}><span className="action-check action-check--amber" /><span className="action-copy"><strong>Verify contractor induction</strong><small>Nigahi Project · Due today</small></span><ChevronRight size={15} className="row-chevron" /></button></div></article><article className="panel activity-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--green" /> RECENT AUDIT EVENTS</div><h2>What changed</h2></div></div><div className="workspace-stat-list"><div><CheckCircle2 size={16} /><span><strong>26</strong><small>checks completed today</small></span></div><div><AlertTriangle size={16} /><span><strong>4</strong><small>items escalated this week</small></span></div><div><FileCheck2 size={16} /><span><strong>98%</strong><small>evidence coverage</small></span></div></div></article><article className="panel pulse-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--purple" /> POLICY HEALTH</div><h2>Readiness pulse</h2></div></div><div className="pulse-value"><strong>91.8%</strong><span><ArrowUpRight size={14} /> 1.8% vs last week</span></div><div className="compliance-bars"><span style={{ height: "72%" }} /><span style={{ height: "88%" }} /><span style={{ height: "64%" }} /><span style={{ height: "93%" }} /><span style={{ height: "81%" }} /><span style={{ height: "98%" }} /></div></article></section>
    </div>;
  }

  if (view === "Field operations") {
    return <div className="workspace-view"><section className="metric-grid" aria-label="Field operations summary"><article className="metric-card metric-card--featured"><div className="metric-card__top"><span className="metric-icon metric-icon--lime"><HardHat size={18} /></span><span className="metric-trend metric-trend--up"><ArrowUpRight size={14} /> 2.4%</span></div><div className="metric-value">1,248</div><div className="metric-label">Workers checked in</div><div className="metric-footer"><span>98% attendance</span><span>Shift 2 live</span></div></article><article className="metric-card"><div className="metric-card__top"><span className="metric-icon metric-icon--blue"><ClipboardCheck size={18} /></span><span className="metric-trend metric-trend--up">+14 today</span></div><div className="metric-value">38</div><div className="metric-label">Inspections completed</div><div className="metric-footer"><span>Across 6 mines</span><span>92% on time</span></div></article><article className="metric-card"><div className="metric-card__top"><span className="metric-icon metric-icon--amber"><AlertTriangle size={18} /></span><span className="metric-trend metric-trend--neutral">Live</span></div><div className="metric-value">7</div><div className="metric-label">Open observations & violations</div><div className="metric-footer"><span>2 need escalation</span><span>Updated now</span></div></article><article className="metric-card"><div className="metric-card__top"><span className="metric-icon metric-icon--purple"><MapPin size={18} /></span><span className="metric-trend metric-trend--neutral">6 sites</span></div><div className="metric-value">4.6<span>/5</span></div><div className="metric-label">Field readiness</div><div className="metric-footer"><span>Best: Gevra OC</span><span>Stable</span></div></article></section><section className="dashboard-grid dashboard-grid--top"><article className="panel workspace-table-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--green" /> GEO-TAGGED FIELD BOARD</div><h2>Inspections & incident follow-up</h2></div><button className="button button--primary" onClick={onObservation}><MapPin size={14} /> Log observation</button></div><div className="workspace-table">{[{name:"Kusmunda",detail:"Ventilation inspection · Pit 04",status:"In progress",color:"red",owner:"NP"},{name:"Gevra OC",detail:"Dust suppression round · North haul",status:"Complete",color:"green",owner:"AS"},{name:"Dipka OC",detail:"Bench stability walkdown",status:"Queued",color:"amber",owner:"VR"},{name:"Nigahi",detail:"Contractor induction check",status:"In progress",color:"amber",owner:"RM"}].map((item) => <button className="workspace-table-row" key={item.name} onClick={() => onAction(item.name, "Open the inspection packet, location, owner, timestamp, and follow-up status.")}><span className={`mini-status mini-status--${item.color}`} /><span><strong>{item.name}</strong><small>{item.detail}</small></span><b className={`status-label status-label--${item.color}`}>{item.status}</b><span className="avatar avatar--small avatar--blue">{item.owner}</span><ChevronRight size={15} /></button>)}</div></article><article className="panel pulse-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--purple" /> ATTENDANCE & OFFLINE SYNC</div><h2>Attendance & sync health</h2></div><button className="icon-button icon-button--subtle" onClick={onCopilot}><Sparkles size={15} /></button></div><div className="pulse-value"><strong>98.1%</strong><span><ArrowUpRight size={14} /> 2.4% vs yesterday</span></div><div className="coverage-chart"><div className="chart-y-labels"><span>100</span><span>75</span><span>50</span><span>25</span></div><div className="chart-body"><div className="chart-grid" /><svg viewBox="0 0 320 110" preserveAspectRatio="none"><path d="M0 72 C24 67 29 50 52 60 S75 76 92 56 S111 47 131 49 S151 78 173 63 S190 39 212 51 S229 78 247 56 S276 58 290 28 S308 35 320 20" fill="none" stroke="#7ebfe7" strokeWidth="2.5" strokeLinecap="round" /></svg><div className="chart-x-labels"><span>06:00</span><span>09:00</span><span>12:00</span><span>15:00</span><span>Now</span></div></div></div></article></section></div>;
  }

  if (view === "Contractors") {
    return <div className="workspace-view"><section className="metric-grid" aria-label="Contractor summary"><article className="metric-card metric-card--featured"><div className="metric-card__top"><span className="metric-icon metric-icon--lime"><UsersRound size={18} /></span><span className="metric-trend metric-trend--up">+3.1%</span></div><div className="metric-value">42</div><div className="metric-label">Active contractors</div><div className="metric-footer"><span>6 mine sites</span><span>1,874 workers</span></div></article><article className="metric-card"><div className="metric-card__top"><span className="metric-icon metric-icon--blue"><CheckCircle2 size={18} /></span><span className="metric-trend metric-trend--up">+4.2%</span></div><div className="metric-value">91<span>%</span></div><div className="metric-label">Induction coverage</div><div className="metric-footer"><div className="progress-line"><span style={{ width: "91%" }} /></div><span>Target 95%</span></div></article><article className="metric-card"><div className="metric-card__top"><span className="metric-icon metric-icon--amber"><FileText size={18} /></span><span className="metric-trend metric-trend--down">Needs review</span></div><div className="metric-value">8</div><div className="metric-label">Documents expiring</div><div className="metric-footer"><span>Next 30 days</span><span>3 critical</span></div></article><article className="metric-card"><div className="metric-card__top"><span className="metric-icon metric-icon--purple"><ShieldCheck size={18} /></span><span className="metric-trend metric-trend--up">Healthy</span></div><div className="metric-value">87<span>%</span></div><div className="metric-label">Average safety rating</div><div className="metric-footer"><span>+6 pts this quarter</span></div></article></section><section className="dashboard-grid dashboard-grid--top"><article className="panel workspace-table-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--purple" /> CONTRACTOR & LABOUR REGISTER</div><h2>Induction, licences & labour health</h2></div><button className="button button--secondary" onClick={() => onExport("Contractor register")}><Download size={14} /> Export register</button></div><div className="workspace-table">{[{name:"M/s S S Earthmovers",detail:"Kusmunda · 428 workers",status:"92% ready",color:"green",owner:"SS"},{name:"R K Mining Services",detail:"Gevra OC · 312 workers",status:"96% ready",color:"green",owner:"RK"},{name:"NCL Operations Partner",detail:"Nigahi · 247 workers",status:"78% ready",color:"amber",owner:"NO"},{name:"Central Haulage Co.",detail:"Dipka OC · 186 workers",status:"64% ready",color:"red",owner:"CH"}].map((item) => <button className="workspace-table-row" key={item.name} onClick={() => onAction(item.name, "Open induction coverage, worker count, expiring documents, and safety performance.")}><span className={`mini-status mini-status--${item.color}`} /><span><strong>{item.name}</strong><small>{item.detail}</small></span><b className={`status-label status-label--${item.color}`}>{item.status}</b><span className="avatar avatar--small avatar--purple">{item.owner}</span><ChevronRight size={15} /></button>)}</div></article><article className="panel action-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--amber" /> DOCUMENT DIGITIZATION & RENEWALS</div><h2>Documents requiring action</h2></div></div><div className="action-list"><button className="action-row" onClick={() => onAction("Renew medical certificates", "8 contractor documents are due within 30 days.")}><span className="action-check action-check--amber" /><span className="action-copy"><strong>Medical certificates</strong><small>8 documents · Due in 12 days</small></span><ChevronRight size={15} className="row-chevron" /></button><button className="action-row" onClick={() => onAction("Review insurance cover", "Two policies need updated evidence.")}><span className="action-check action-check--red" /><span className="action-copy"><strong>Insurance cover</strong><small>2 policies · Evidence missing</small></span><ChevronRight size={15} className="row-chevron" /></button><button className="action-row" onClick={() => onAction("Approve induction batch", "The next induction batch has 34 workers.")}><span className="action-check" /><span className="action-copy"><strong>Approve induction batch</strong><small>34 workers · Scheduled tomorrow</small></span><ChevronRight size={15} className="row-chevron" /></button></div></article></section></div>;
  }

  return <div className="workspace-view"><section className="metric-grid" aria-label="Reports summary"><article className="metric-card metric-card--featured"><div className="metric-card__top"><span className="metric-icon metric-icon--lime"><FileText size={18} /></span><span className="metric-trend metric-trend--up">+18%</span></div><div className="metric-value">24</div><div className="metric-label">Reports generated this month</div><div className="metric-footer"><span>Across 6 mines</span><span>4 statutory</span></div></article><article className="metric-card"><div className="metric-card__top"><span className="metric-icon metric-icon--blue"><Download size={18} /></span><span className="metric-trend metric-trend--neutral">Ready</span></div><div className="metric-value">7</div><div className="metric-label">Reports ready to export</div><div className="metric-footer"><span>Last generated 2m ago</span></div></article><article className="metric-card"><div className="metric-card__top"><span className="metric-icon metric-icon--amber"><CalendarClock size={18} /></span><span className="metric-trend metric-trend--up">On schedule</span></div><div className="metric-value">12</div><div className="metric-label">Scheduled reports</div><div className="metric-footer"><span>Next: DGMS monthly</span></div></article><article className="metric-card"><div className="metric-card__top"><span className="metric-icon metric-icon--purple"><PackageCheck size={18} /></span><span className="metric-trend metric-trend--up">98%</span></div><div className="metric-value">A</div><div className="metric-label">Evidence completeness</div><div className="metric-footer"><span>Audit-ready portfolio</span></div></article></section><section className="dashboard-grid dashboard-grid--top"><article className="panel workspace-table-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--blue" /> AUTOMATED STATUTORY REPORTS</div><h2>Generate & distribute</h2></div><button className="button button--primary" onClick={() => onExport("Portfolio report")}><Download size={14} /> Export portfolio</button></div><div className="workspace-table">{[...autoReports.slice(0, 3).map((report) => ({ name: `Auto · ${report.title}`, detail: `${report.category} · ${report.mine} · ${report.recipient}`, status: "AUTO", color: report.level === "Critical" ? "red" : report.level === "High" ? "amber" : "blue" })), {name:"Monthly compliance register",detail:"All mines · Generated today",status:"CSV",color:"green"},{name:"DGMS safety review",detail:"Central India · Generated yesterday",status:"PDF",color:"blue"},{name:"Environment evidence pack",detail:"Kusmunda + Gevra · 28 Sep",status:"ZIP",color:"amber"},{name:"Contractor readiness report",detail:"6 sites · Updated 2 hours ago",status:"CSV",color:"purple"}].map((item) => <button className="workspace-table-row" key={item.name} onClick={() => onExport(item.name)}><span className={`mini-status mini-status--${item.color}`} /><span><strong>{item.name}</strong><small>{item.detail}</small></span><b className={`status-label status-label--${item.color}`}>{item.status}</b><Download size={15} /></button>)}</div></article><article className="panel activity-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--green" /> ESCALATIONS & AUDIT TRAIL</div><h2>Dispatch history</h2></div></div><div className="workspace-stat-list"><div><FileText size={16} /><span><strong>Monthly compliance register</strong><small>Generated by admin · 2 minutes ago</small></span></div><div><FileText size={16} /><span><strong>DGMS safety review</strong><small>Generated by S. Rao · Yesterday</small></span></div><div><FileText size={16} /><span><strong>Environment evidence pack</strong><small>Generated by A. Khan · 27 Sep</small></span></div></div><button className="panel-link" onClick={onCopilot}>Ask copilot about a report <ArrowUpRight size={14} /></button></article></section></div>;
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaceOptions[0]);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const initialNav = location === "/scalability" ? "Scalability" : location === "/costing" ? "Costing" : location === "/drone-command" ? "Drone command" : "Overview";
  const [activeNav, setActiveNav] = useState(initialNav);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMine, setSelectedMine] = useState(mines[2]);
  const [showAllRisks, setShowAllRisks] = useState(false);
  const [showObservationForm, setShowObservationForm] = useState(false);
  const [observationSaved, setObservationSaved] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [observations, setObservations] = useState<LocalObservation[]>([]);
  const [resolvedRisks, setResolvedRisks] = useState<string[]>([]);
  const [autoReports, setAutoReports] = useState<AutoReport[]>([]);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotQuestion, setCopilotQuestion] = useState("");
  const [copilotAnswer, setCopilotAnswer] = useState("");
  const [detailPanel, setDetailPanel] = useState<DetailPanel | null>(null);
  const [dataSource, setDataSource] = useState(isSupabaseConfigured ? "Supabase connecting" : "Browser fallback");
  const [syncing, setSyncing] = useState(false);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let channel: { unsubscribe: () => void } | null = null;
    const hydrateLocal = () => {
      try {
      const savedObservations = window.localStorage.getItem(observationsStorageKey);
      const savedResolvedRisks = window.localStorage.getItem(resolvedRisksStorageKey);
      const savedAutoReports = window.localStorage.getItem(autoReportsStorageKey);
      if (savedObservations) setObservations(JSON.parse(savedObservations));
      if (savedResolvedRisks) setResolvedRisks(JSON.parse(savedResolvedRisks));
      if (savedAutoReports) setAutoReports(JSON.parse(savedAutoReports));
        setDataSource("Browser fallback");
      } catch {
        toast.error("Local workspace data could not be restored");
      }
    };
    const hydrateRemote = async () => {
      const workspace = await loadWorkspaceData();
      if (disposed) return;
      setObservations(workspace.observations.map(mapRemoteObservation));
      setAutoReports(workspace.reports.map(mapRemoteReport));
      setDataSource("Supabase live");
    };
    const connect = async () => {
      if (!isSupabaseConfigured || !supabase) {
        hydrateLocal();
        return;
      }
      const session = await ensureSupabaseSession();
      if (!session.ok) {
        toast.warning("Supabase sign-in is unavailable", { description: "Enable anonymous sign-ins in Supabase Auth, or the dashboard will use local demo mode." });
        hydrateLocal();
        return;
      }
      try {
        await hydrateRemote();
        channel = supabase.channel("minepulse-live").on("postgres_changes", { event: "*", schema: "public", table: "observations" }, () => { void hydrateRemote(); }).on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => { void hydrateRemote(); }).subscribe();
      } catch (error) {
        console.warn("[MinePulse] Supabase workspace unavailable", error);
        toast.warning("Supabase tables are not ready", { description: "Run the included migration in Supabase SQL Editor. Local demo mode is active until then." });
        hydrateLocal();
      }
    };
    void connect();
    return () => {
      disposed = true;
      channel?.unsubscribe();
    };
  }, []);

  const visibleRisks = useMemo(() => {
    const localRisks = observations.map((observation) => ({
      title: observation.title,
      mine: `${observation.mine} · Field report`,
      age: observation.age,
      level: observation.level,
      color: observation.color,
      icon: AlertTriangle,
    }));
    const query = searchQuery.trim().toLowerCase();
    const allRisks = showAllRisks ? [...riskItems, ...localRisks, ...riskItems] : [...riskItems, ...localRisks];
    return allRisks.filter((item) => !resolvedRisks.includes(item.title)).filter((item) => !query || `${item.title} ${item.mine} ${item.level}`.toLowerCase().includes(query));
  }, [observations, resolvedRisks, searchQuery, showAllRisks]);

  const handleNav = (label: string) => {
    setActiveNav(label);
    setLocation(label === "Scalability" ? "/scalability" : label === "Costing" ? "/costing" : label === "Drone command" ? "/drone-command" : "/");
    setSidebarOpen(false);
    if (label !== "Overview") toast.success(`${label} view loaded`, { description: "Select any record to open its populated detail panel and next action." });
  };

  const openDetail = (title: string, description: string) => {
    const lower = `${title} ${description}`.toLowerCase();
    const facts = lower.includes("contract") || lower.includes("induction")
      ? ["Induction coverage and worker count are tracked by mine", "Licence, insurance, medical, and safety evidence can be reviewed here", "Non-compliant records can be escalated to the contractor owner"]
      : lower.includes("report") || lower.includes("export") || lower.includes("audit")
        ? ["Generated from the current mine and compliance register", "Dispatch status and recipient are recorded in the audit trail", "Export action produces a CSV using the live browser dataset"]
        : lower.includes("environment") || lower.includes("dust")
          ? ["Dust suppression evidence is overdue at Kusmunda", "CIL FY 2024–25 reported 2,915.47 lakh kilolitres of total water consumption", "CIL reported 2.27% of energy consumed from renewable sources; attach site evidence to close the issue"]
          : lower.includes("safety") || lower.includes("ventilation") || lower.includes("inspection")
            ? ["DGMS rules require mine-wide inspection and ventilation records", "Field observations include a timestamp, mine, severity, and description", "Critical findings can be routed to the compliance queue"]
            : ["This record is linked to the selected mine and current operations queue", "The panel is ready for assignment, evidence, and corrective-action tracking", "Use the action below to continue the workflow"];
    setDetailPanel({ title, eyebrow: activeNav.toUpperCase(), description, facts, action: lower.includes("report") ? "Export CSV" : "Assign owner" });
  };

  const completeDetailAction = (label: string) => {
    if (label === "Export CSV") exportReport();
    else toast.success(`${label} opened`, { description: "The next workflow step is ready for assignment." });
  };

  const resolveRisk = (title: string) => {
    setResolvedRisks((current) => {
      const next = Array.from(new Set([...current, title]));
      window.localStorage.setItem(resolvedRisksStorageKey, JSON.stringify(next));
      return next;
    });
    if (dataSource === "Supabase live") {
      void markRiskReviewed(title).catch((error) => console.warn("[MinePulse] Could not persist risk review", error));
    }
    toast.success("Risk marked as reviewed", { description: `${title} was removed from the active queue.` });
  };

  const askCopilot = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const question = copilotQuestion.trim().toLowerCase();
    if (!question) return;
    if (question.includes("risk") || question.includes("critical")) {
      setCopilotAnswer(`The portfolio has ${visibleRisks.length} active items in this view. The most urgent is “${visibleRisks[0]?.title ?? "no active risk"}”. Kusmunda is currently at 76/100 and needs the fastest follow-up.`);
    } else if (question.includes("mine") || question.includes("health")) {
      setCopilotAnswer(`Kusmunda is the lowest-scoring mine at 76/100, followed by Nigahi at 69/100. Gevra OC leads the network at 94/100. I would start with the dust suppression evidence in Kusmunda.`);
    } else if (question.includes("report") || question.includes("export")) {
      setCopilotAnswer("The portfolio CSV is ready from the Export report action. It includes mine, region, compliance score, status, and open risk count.");
    } else {
      setCopilotAnswer("I can help with portfolio risk, mine health, active observations, and report preparation. Try asking: Which mine needs attention first?");
    }
  };

  const exportReport = () => {
    const csv = [
      "Mine,Region,Compliance score,Status,Open risks",
      ...mines.map((mine) => `${mine.name},${mine.location},${mine.score},${mine.status},${visibleRisks.filter((risk) => risk.mine.startsWith(mine.name.split(" ")[0])).length}`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "minepulse-portfolio-report.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Portfolio report exported", { description: "CSV download is ready for your review." });
  };

  const selectEvidence = (file?: File) => {
    setEvidencePreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const submitObservation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const mine = String(formData.get("mine") || "Kusmunda");
    const level = String(formData.get("severity") || "High") as LocalObservation["level"];
    const category = String(formData.get("category") || "Safety hazard");
    const recipient = String(formData.get("recipient") || "Compliance queue");
    const title = String(formData.get("title") || "New field observation");
    const description = String(formData.get("description") || "");
    const evidence = formData.get("evidence") instanceof File && (formData.get("evidence") as File).size > 0 ? formData.get("evidence") as File : null;
    setSyncing(true);
    if (dataSource === "Supabase live") {
      try {
        const remoteObservation = await createRemoteObservation({ title, mine, severity: level, category, description, recipient });
        if (evidence) await uploadEvidence(remoteObservation.id, evidence);
        const workspace = await loadWorkspaceData();
        setObservations(workspace.observations.map(mapRemoteObservation));
        setAutoReports(workspace.reports.map(mapRemoteReport));
        setObservationSaved(true);
        setShowObservationForm(false);
        toast.success("Report automatically sent", { description: `${category} report for ${mine} was generated in Supabase${evidence ? " with evidence attached" : ""}.` });
        event.currentTarget.reset();
      } catch (error) {
        console.error("[MinePulse] Supabase observation failed", error);
        toast.error("Could not save the observation", { description: "Check the Supabase migration, RLS policies, and storage bucket before retrying." });
      } finally {
        setSyncing(false);
      }
      return;
    }
    const id = String(Date.now());
    const nextObservation: LocalObservation = { id, title, mine, level, description, age: "just now", color: level === "Critical" ? "red" : level === "High" ? "amber" : "blue" };
    const nextReport: AutoReport = { id: `report-${id}`, title, category, mine, level, description, recipient, status: "Sent", createdAt: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) };
    setObservations((current) => {
      const next = [nextObservation, ...current];
      window.localStorage.setItem(observationsStorageKey, JSON.stringify(next));
      return next;
    });
    setAutoReports((current) => {
      const next = [nextReport, ...current];
      window.localStorage.setItem(autoReportsStorageKey, JSON.stringify(next));
      return next;
    });
    setObservationSaved(true);
    setShowObservationForm(false);
    toast.success("Report automatically sent", { description: `${category} report for ${mine} was generated and sent to ${recipient}.` });
    event.currentTarget.reset();
    setSyncing(false);
  };

  return (
    <div className="app-shell">
      <div className={`mobile-scrim ${sidebarOpen ? "is-visible" : ""}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><span /><span /><span /></div>
          <div>
            <div className="brand-name">MINEPULSE</div>
            <div className="brand-subtitle">COMMAND CENTER</div>
          </div>
          <button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <div className="workspace-picker">
          <button className={`workspace-selector ${workspaceOpen ? "is-open" : ""}`} onClick={() => setWorkspaceOpen((value) => !value)} aria-expanded={workspaceOpen} aria-haspopup="listbox">
            <div className="workspace-icon"><Globe2 size={16} /></div>
            <div className="workspace-copy"><span>{selectedWorkspace.name}</span><small>{selectedWorkspace.mines}</small></div>
            <ChevronDown size={15} className="muted-icon" />
          </button>
          {workspaceOpen && <div className="workspace-menu" role="listbox" aria-label="Choose operations workspace">{workspaceOptions.map((workspace) => <button key={workspace.name} className={`workspace-option ${selectedWorkspace.name === workspace.name ? "is-selected" : ""}`} onClick={() => { setSelectedWorkspace(workspace); setWorkspaceOpen(false); toast.success(`${workspace.name} workspace selected`, { description: `${workspace.mines}. Dashboard filters are ready.` }); }} role="option" aria-selected={selectedWorkspace.name === workspace.name}><span className="workspace-option__icon"><Globe2 size={14} /></span><span><strong>{workspace.name}</strong><small>{workspace.mines}</small></span>{selectedWorkspace.name === workspace.name && <Check size={15} />}</button>)}</div>}
        </div>

        <div className="nav-label">COMMAND</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.label;
            return (
              <button key={item.label} className={`nav-item ${active ? "active" : ""}`} onClick={() => handleNav(item.label)}>
                <Icon size={17} strokeWidth={active ? 2.3 : 1.8} />
                <span>{item.label}</span>
                {item.count && <span className="nav-count">{item.count}</span>}
                {active && <span className="nav-active-line" />}
              </button>
            );
          })}
        </nav>

        <div className="nav-label nav-label--spaced">WORKSPACE</div>
        <nav className="primary-nav">
          <button className="nav-item" onClick={() => setCopilotOpen(true)}><Sparkles size={17} /><span>AI copilot</span><span className="ai-dot" /></button>
          <button className="nav-item theme-toggle" onClick={() => toggleTheme?.()} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}<span>{theme === "dark" ? "Light mode" : "Dark mode"}</span><span className="theme-toggle__state">{theme === "dark" ? "OFF" : "ON"}</span></button>
        </nav>

        <div className="sidebar-footer">
          <div className="sync-card">
            <div className="sync-icon"><RefreshCw size={15} /></div>
            <div><strong>{dataSource === "Supabase live" ? "Supabase synced" : dataSource === "Supabase connecting" ? "Connecting to Supabase" : "Local demo mode"}</strong><span>{syncing ? "Saving workspace changes…" : dataSource === "Supabase live" ? "Live data · realtime enabled" : "Run the Supabase migration to go live"}</span></div>
            <span className="status-dot status-dot--green" />
          </div>
          <div className="profile-row">
            <div className="avatar avatar--lime">AS</div>
            <div className="profile-copy"><strong>Admin</strong><span>Regional admin</span></div>
            <MoreHorizontal size={17} className="muted-icon" />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <div className="breadcrumb"><span>Central operations</span><ChevronRight size={14} /><strong>{activeNav}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className={`search-box ${searchOpen ? "is-open" : ""}`}>
              <Search size={16} />
              <input aria-label="Search minepulse" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search mine, report, person..." />
              <kbd>⌘ K</kbd>
            </div>
            <button className="icon-button mobile-search" onClick={() => setSearchOpen((value) => !value)} aria-label="Toggle search"><Search size={18} /></button>
            <button className="icon-button notification-button" onClick={() => toast.info("You are all caught up", { description: "No new critical alerts since your last visit." })} aria-label="Notifications"><Bell size={18} /><span /></button>
            <button className="help-button" onClick={() => toast.info("MinePulse help center", { description: "Your implementation guide will be available here." })}>Need help?</button>
          </div>
        </header>

        <div className="page-container">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="live-pulse" /> LIVE OPERATIONS · 28 SEP 2026</div>
              <h1>{activeNav === "Overview" ? "Good morning, admin" : activeNav}</h1>
              <p>{navSubtitles[activeNav]}</p>
            </div>
            <div className="heading-actions">
              {activeNav !== "Drone command" && <><button className="button button--secondary" onClick={exportReport}><Download size={16} /> Export report</button>
              <button className="button button--primary" onClick={() => { setObservationSaved(false); setShowObservationForm(true); }}><MapPin size={16} /> Log observation</button></>}
            </div>
          </section>

          {activeNav === "Drone command" ? <DroneCommand /> : activeNav === "Scalability" ? <ScaleCosting mode="Scalability" onNavigate={handleNav} /> : activeNav === "Costing" ? <ScaleCosting mode="Costing" onNavigate={handleNav} /> : activeNav === "Overview" ? <>
          <OverviewDetection onNavigate={handleNav} />

          <section className="metric-grid" aria-label="Portfolio summary">
            <article className="metric-card metric-card--featured">
              <div className="metric-card__top"><span className="metric-icon metric-icon--lime"><ShieldCheck size={18} /></span><span className="metric-trend metric-trend--up"><ArrowUpRight size={14} /> 4.8%</span></div>
              <div className="metric-value">86.4<span>/100</span></div>
              <div className="metric-label">Portfolio compliance score</div>
              <div className="metric-footer"><Sparkline points="M0 27 C15 28, 19 20, 31 22 S48 25, 56 17 S70 18, 78 10 S94 15, 120 3" /><span>vs. 82.4 last month</span></div>
            </article>
            <article className="metric-card">
              <div className="metric-card__top"><span className="metric-icon metric-icon--amber"><AlertTriangle size={18} /></span><span className="metric-trend metric-trend--down"><ArrowDownRight size={14} /> 12.2%</span></div>
              <div className="metric-value">12</div>
              <div className="metric-label">Open violations & high-risk items</div>
              <div className="metric-footer"><div className="mini-bars"><i style={{ height: "38%" }} /><i style={{ height: "54%" }} /><i style={{ height: "45%" }} /><i style={{ height: "72%" }} /><i style={{ height: "61%" }} /><i className="is-current" style={{ height: "29%" }} /></div><span>3 critical · 9 high</span></div>
            </article>
            <article className="metric-card">
              <div className="metric-card__top"><span className="metric-icon metric-icon--blue"><ClipboardCheck size={18} /></span><span className="metric-trend metric-trend--up"><ArrowUpRight size={14} /> 8.7%</span></div>
              <div className="metric-value">94.2<span>%</span></div>
              <div className="metric-label">Corrective actions on time</div>
              <div className="metric-footer"><div className="progress-line"><span style={{ width: "94.2%" }} /></div><span>Target 90%</span></div>
            </article>
            <article className="metric-card">
              <div className="metric-card__top"><span className="metric-icon metric-icon--purple"><HardHat size={18} /></span><span className="metric-trend metric-trend--neutral">6 sites</span></div>
              <div className="metric-value">1,248</div>
              <div className="metric-label">Workers in the field</div>
              <div className="metric-footer"><div className="worker-avatars"><span>RK</span><span>MS</span><span>+1.2k</span></div><span>98% attendance today</span></div>
            </article>
          </section>

          <section className="dashboard-grid dashboard-grid--top">
            <article className="panel map-panel">
              <div className="panel-header">
                <div><div className="panel-kicker"><span className="panel-kicker__dot" /> OPERATIONS MAP</div><h2>Mine network health</h2></div>
                <div className="panel-header-actions"><span className="last-sync"><RefreshCw size={13} /> 2 min ago</span><button className="icon-button icon-button--subtle" onClick={() => toast.success("Map refreshed", { description: "All mine telemetry is up to date." })}><MoreHorizontal size={17} /></button></div>
              </div>
              <div className="map-legend"><span><i className="legend-dot legend-dot--green" /> Healthy</span><span><i className="legend-dot legend-dot--amber" /> Watch</span><span><i className="legend-dot legend-dot--red" /> Action needed</span><span className="legend-location"><MapPin size={13} /> Central India cluster</span></div>
              <div className="mine-map">
                <div className="map-grid-lines" />
                <svg viewBox="0 0 740 300" className="map-outline" aria-hidden="true">
                  <path d="M82 65 146 40 190 63 240 44 287 67 350 47 405 71 459 52 510 72 575 51 653 84 628 132 654 176 612 207 631 258 564 266 530 234 474 258 434 226 373 250 334 220 275 249 227 214 176 235 141 198 87 211 104 166 68 126Z" />
                  <path d="M151 81 205 112 276 104 321 144 380 118 431 149 508 126 568 161 606 139" className="map-route" />
                  <path d="M101 180 169 158 239 176 300 154 355 188 417 168 483 188 555 179 623 201" className="map-route map-route--muted" />
                </svg>
                {mines.map((mine) => (
                  <button key={mine.name} className={`mine-pin mine-pin--${mine.color} ${selectedMine.name === mine.name ? "is-selected" : ""}`} style={{ left: mine.x, top: mine.y }} onClick={() => setSelectedMine(mine)} aria-label={`View ${mine.name}`}>
                    <span className="mine-pin__pulse" /><span className="mine-pin__core" /><span className="mine-pin__label">{mine.name}</span>
                  </button>
                ))}
                <div className="map-scale"><span /> 50 km</div>
                <div className="map-card"><div className="map-card__heading"><div className={`mini-status mini-status--${selectedMine.color}`} /> <strong>{selectedMine.name}</strong><button onClick={() => openDetail(`${selectedMine.name} mine telemetry`, `${selectedMine.location} · health ${selectedMine.score}/100 · ${selectedMine.status}. Review current risk signals, field activity, and compliance evidence.`)}><ChevronRight size={15} /></button></div><span>{selectedMine.location}</span><div className="map-card__metric"><ScoreRing score={selectedMine.score} /><div><small>Current health</small><strong>{selectedMine.status}</strong><em>+3.4% this month</em></div></div></div>
              </div>
            </article>

            <article className="panel risk-panel">
              <div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--amber" /> AI RISK RADAR</div><h2>Needs attention</h2></div><button className="text-button" onClick={() => setShowAllRisks((value) => !value)}>{showAllRisks ? "Show less" : "View all"}<ChevronRight size={14} /></button></div>
              <div className="risk-summary"><div className="risk-score"><strong>82</strong><span>risk index</span></div><div className="risk-summary-copy"><span>Portfolio risk is <b>moderate</b></span><small>AI model confidence · 94%</small><div className="risk-meter"><span style={{ width: "61%" }} /></div></div></div>
              <div className="risk-list">{visibleRisks.length ? visibleRisks.map((item, index) => { const Icon = item.icon; return <button className="risk-item" key={`${item.title}-${index}`} title="Click to mark this risk as reviewed" onClick={() => resolveRisk(item.title)}><span className={`risk-item__icon risk-item__icon--${item.color}`}><Icon size={16} /></span><span className="risk-item__copy"><strong>{item.title}</strong><small>{item.mine}</small></span><span className="risk-item__meta"><b className={`risk-pill risk-pill--${item.color}`}>{item.level}</b><small>{item.age}</small></span></button>; }) : <div className="risk-empty"><strong>Queue clear</strong>No active risks match your search.</div>}</div>
              <button className="risk-footer" onClick={() => handleNav("Compliance")}><Siren size={15} /> Open compliance queue <ChevronRight size={15} /></button>
            </article>
          </section>

          <section className="dashboard-grid dashboard-grid--bottom">
            <article className="panel action-panel">
              <div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--blue" /> ACTION QUEUE</div><h2>Move the work forward</h2></div><button className="icon-button icon-button--subtle" onClick={() => toast.info("Queue filters", { description: "Filter by owner, mine, or due date." })}><MoreHorizontal size={17} /></button></div>
              <div className="action-list">
                <button className="action-row" onClick={() => openDetail("Review ventilation inspection", "Kusmunda Mine · Pit 04 · due in 2 days. Assign a reviewer and attach the inspection evidence.")}><span className="action-check" /><span className="action-copy"><strong>Review ventilation inspection</strong><small>Kusmunda Mine <i>•</i> Due in 2 days</small></span><span className="avatar avatar--small avatar--blue">NP</span><ChevronRight size={15} className="row-chevron" /></button>
                <button className="action-row" onClick={() => openDetail("Verify contractor induction", "Nigahi Project · due today. Review induction coverage, worker records, and outstanding contractor documents.")}><span className="action-check action-check--amber" /><span className="action-copy"><strong>Verify contractor induction</strong><small>Nigahi Project <i>•</i> Due today</small></span><span className="avatar avatar--small avatar--purple">VR</span><ChevronRight size={15} className="row-chevron" /></button>
                <button className="action-row" onClick={() => openDetail("Upload dust suppression evidence", "Gevra OC · overdue. Attach the latest dust suppression round and route the evidence for compliance review.")}><span className="action-check action-check--red" /><span className="action-copy"><strong>Upload dust suppression evidence</strong><small>Gevra OC <i>•</i> Overdue</small></span><span className="avatar avatar--small avatar--lime">AS</span><ChevronRight size={15} className="row-chevron" /></button>
              </div>
              <button className="panel-link" onClick={() => handleNav("Compliance")}>View all 18 actions <ArrowUpRight size={14} /></button>
            </article>

            <article className="panel activity-panel">
              <div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--green" /> ACTIVITY STREAM</div><h2>What just happened</h2></div><span className="stream-live"><span /> Live</span></div>
              <div className="activity-list">{activityItems.map((item) => <div className="activity-row" key={item.title}><div className={`activity-icon activity-icon--${item.color}`}>{item.type === "closed" ? <CheckCircle2 size={15} /> : item.type === "report" ? <FileText size={15} /> : item.type === "risk" ? <AlertTriangle size={15} /> : <MapPin size={15} />}</div><div className="activity-copy"><strong>{item.title}</strong><span>{item.detail}</span></div><div className={`avatar avatar--small avatar--${item.color}`}>{item.actor}</div><time>{item.time}</time></div>)}</div>
              <button className="panel-link" onClick={() => openDetail("Activity history", "Review observations, corrective actions, report dispatches, and escalations in one chronological audit trail.")}>See full activity <ArrowUpRight size={14} /></button>
            </article>

            <article className="panel pulse-panel">
              <div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--purple" /> DAILY PULSE</div><h2>Field coverage</h2></div><button className="icon-button icon-button--subtle" onClick={() => openDetail("Field coverage details", "Attendance and field reports by shift. Review check-ins, offline submissions, and sync health across the mine network.")}><MoreHorizontal size={17} /></button></div>
              <div className="pulse-value"><strong>98.1%</strong><span><ArrowUpRight size={14} /> 2.4% vs yesterday</span></div>
              <div className="coverage-chart"><div className="chart-y-labels"><span>100</span><span>75</span><span>50</span><span>25</span></div><div className="chart-body"><div className="chart-grid" /><svg viewBox="0 0 320 110" preserveAspectRatio="none"><defs><linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b991ff" stopOpacity=".28" /><stop offset="1" stopColor="#b991ff" stopOpacity="0" /></linearGradient></defs><path d="M0 72 C24 67 29 50 52 60 S75 76 92 56 S111 47 131 49 S151 78 173 63 S190 39 212 51 S229 78 247 56 S276 58 290 28 S308 35 320 20 L320 110 L0 110Z" fill="url(#pulseGradient)" /><path d="M0 72 C24 67 29 50 52 60 S75 76 92 56 S111 47 131 49 S151 78 173 63 S190 39 212 51 S229 78 247 56 S276 58 290 28 S308 35 320 20" fill="none" stroke="#b991ff" strokeWidth="2.5" strokeLinecap="round" /></svg><div className="chart-x-labels"><span>06:00</span><span>09:00</span><span>12:00</span><span>15:00</span><span>Now</span></div></div></div>
              <div className="pulse-footer"><span><span className="status-dot status-dot--green" /> 1,224 checked in</span><span><Clock3 size={13} /> Shift 2 in progress</span></div>
            </article>
          </section>
          </> : <WorkspaceView view={activeNav} visibleRisks={visibleRisks} autoReports={autoReports} resolveRisk={resolveRisk} onAction={openDetail} onExport={(label) => { exportReport(); toast.success(`${label} exported`, { description: "Your CSV download is ready." }); }} onObservation={() => { setObservationSaved(false); setShowObservationForm(true); }} onCopilot={() => setCopilotOpen(true)} onNavigate={handleNav} />}

          {observationSaved && <div className="success-banner"><Check size={16} /> New observation captured and added to the review queue <button onClick={() => setObservationSaved(false)}><X size={14} /></button></div>}
        </div>
      </main>

      {detailPanel && <DetailDrawer detail={detailPanel} dataSource={dataSource} onClose={() => setDetailPanel(null)} onAction={(label) => { setDetailPanel(null); completeDetailAction(label); }} />}
      {showObservationForm && <div className="modal-backdrop" onClick={() => setShowObservationForm(false)}><section className="observation-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--amber" /> FIELD REPORTING</div><h2>Log an observation</h2><p>Capture a geo-tagged issue for the right owner.</p></div><button className="icon-button" onClick={() => setShowObservationForm(false)} aria-label="Close form"><X size={18} /></button></div><form onSubmit={submitObservation}><label>Observation title<input name="title" required placeholder="e.g. Missing PPE at haul road" /></label><div className="form-row"><label>Mine<select name="mine" defaultValue="Kusmunda"><option>Kusmunda</option><option>Gevra OC</option><option>Dipka OC</option><option>Jayant</option></select></label><label>Report type<select name="category" defaultValue="Safety hazard"><option>Safety hazard</option><option>Worker grievance</option><option>Environmental issue</option><option>Compliance concern</option></select></label></div><div className="form-row"><label>Severity<select name="severity" defaultValue="High"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label><label>Recipient<select name="recipient" defaultValue="Compliance queue"><option>Compliance queue</option><option>Mine safety officer</option><option>Regional grievance cell</option></select></label></div><label>What did you observe?<textarea name="description" required placeholder="Describe the condition, people involved, and immediate action taken..." rows={4} /></label><label className="evidence-upload">Evidence attachment <span>Optional · maximum 10 MB</span><input name="evidence" type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => selectEvidence(event.target.files?.[0])} />{evidencePreview && <div className="evidence-preview"><img src={evidencePreview} alt="Selected evidence preview" /><span>Preview ready · encrypted upload on submit</span></div>}</label><div className="capture-meta"><span><MapPin size={14} /> Geo-tagged · Kusmunda pit 04</span><span><Zap size={14} /> Auto-report enabled</span></div><div className="modal-actions"><button type="button" className="button button--secondary" onClick={() => setShowObservationForm(false)}>Cancel</button><button type="submit" className="button button--primary" disabled={syncing} aria-busy={syncing}><Zap size={16} /> {syncing ? "Saving…" : "Send automatic report"}</button></div></form></section></div>}
      {copilotOpen && <div className="modal-backdrop" onClick={() => setCopilotOpen(false)}><section className="copilot-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--purple" /> MINEPULSE COPILOT</div><h2>Ask the operating picture</h2><p>Answers are grounded in the current dashboard data.</p></div><button className="icon-button" onClick={() => setCopilotOpen(false)} aria-label="Close copilot"><X size={18} /></button></div><div className="copilot-suggestions"><button onClick={() => setCopilotQuestion("Which mine needs attention first?")}>Which mine needs attention first?</button><button onClick={() => setCopilotQuestion("What are the active risks?")}>What are the active risks?</button><button onClick={() => setCopilotQuestion("How do I export the report?")}>How do I export the report?</button></div>{copilotAnswer && <div className="copilot-answer"><Sparkles size={15} /><span>{copilotAnswer}</span></div>}<form className="copilot-form" onSubmit={askCopilot}><input autoFocus value={copilotQuestion} onChange={(event) => setCopilotQuestion(event.target.value)} placeholder="Ask about risk, mine health, or reports..." /><button className="button button--primary" type="submit"><ArrowUpRight size={16} /> Ask</button></form></section></div>}
    </div>
  );
}
