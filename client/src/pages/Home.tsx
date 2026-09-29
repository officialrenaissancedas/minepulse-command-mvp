import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BookOpenCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Calculator,
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
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "../contexts/ThemeContext";
import PlanningDashboard from "../components/PlanningDashboard";
import OverviewDashboard from "../components/OverviewDashboard";
import FieldOperationsDashboard from "../components/FieldOperationsDashboard";
import RecordsDashboard from "../components/RecordsDashboard";
import ReportsDashboard from "../components/ReportsDashboard";
import { coalDashboardSource, mineOutputSource, publicMineOutputs, subsidiaryProduction } from "../lib/public-coal-data";
import {
  createRemoteObservation,
  ensureSupabaseSession,
  isSupabaseConfigured,
  loadWorkspaceData,
  supabase,
  uploadEvidence,
} from "../lib/supabase";

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Compliance", icon: ShieldCheck },
  { label: "Field operations", icon: ClipboardCheck },
  { label: "Contractors", icon: UsersRound },
  { label: "Reports", icon: FileText },
  { label: "Cost & scale", icon: Calculator },
];

const navSubtitles: Record<string, string> = {
  Overview: "Official production snapshots with clear reporting periods, source links, and your separate MinePulse workspace records.",
  Compliance: "Enter team-owned safety, environment, production, and labour requirements; set due dates, update status, and export the work register.",
  "Field operations": "Log time-stamped mine observations with optional geolocation and evidence attachments. Text and coordinates can queue offline and sync after reconnection.",
  Contractors: "Track contractor name, mine, worker count, induction coverage, renewal date, and active or on-hold status.",
  Reports: "Review queued field reports, export records, and preserve an in-app audit trail.",
  "Cost & scale": "Explore an editable rollout cost model and workload forecast using your own assumptions and provider quotes.",
};

const workspaceOptions = [
  { name: "Coal India · Central (Demo)", mines: "6 reference mines" },
  { name: "Coal India · East (Demo)", mines: "4 reference mines" },
  { name: "Coal India · North (Demo)", mines: "5 reference mines" },
  { name: "Coal India · West (Demo)", mines: "3 reference mines" },
];

type LocalObservation = {
  id: string;
  title: string;
  mine: string;
  level: string;
  description: string;
  age: string;
  color: "red" | "amber" | "blue";
  latitude?: number | null;
  longitude?: number | null;
};

type AutoReport = {
  id: string;
  title: string;
  category: string;
  mine: string;
  level: string;
  description: string;
  recipient: string;
  status: "Queued" | "Sent" | "Failed";
  createdAt: string;
};

type PendingObservation = {
  id: string;
  title: string;
  mine: string;
  severity: string;
  category: string;
  description: string;
  recipient: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
};

const observationsStorageKey = "minepulse-observations-v1";
const autoReportsStorageKey = "minepulse-auto-reports-v1";
const offlineQueueStorageKey = "minepulse-offline-outbox-v1";

function downloadCsv(fileName: string, rows: Array<Array<string | number | null | undefined>>) {
  const csvValue = (value: string | number | null | undefined) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map((row) => row.map(csvValue).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readOfflineQueue(): PendingObservation[] {
  try { return JSON.parse(window.localStorage.getItem(offlineQueueStorageKey) || "[]") as PendingObservation[]; }
  catch { return []; }
}

function writeOfflineQueue(items: PendingObservation[]) {
  window.localStorage.setItem(offlineQueueStorageKey, JSON.stringify(items));
}

function mapPendingObservation(item: PendingObservation): LocalObservation {
  const level = item.severity as LocalObservation["level"];
  return { id: item.id, title: item.title, mine: item.mine, level, description: item.description, latitude: item.latitude, longitude: item.longitude, age: relativeAge(item.createdAt), color: level === "Critical" ? "red" : level === "High" ? "amber" : "blue" };
}

function mapPendingReport(item: PendingObservation): AutoReport {
  return { id: `report-${item.id}`, title: item.title, category: item.category, mine: item.mine, level: item.severity, description: item.description, recipient: item.recipient, status: "Queued", createdAt: new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) };
}

function relativeAge(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function mapRemoteObservation(row: { id: string; title: string; mine: string; severity: string; description: string; latitude: number | null; longitude: number | null; created_at: string }): LocalObservation {
  const level = row.severity as LocalObservation["level"];
  return { id: row.id, title: row.title, mine: row.mine, level, description: row.description, latitude: row.latitude, longitude: row.longitude, age: relativeAge(row.created_at), color: level === "Critical" ? "red" : level === "High" ? "amber" : "blue" };
}

function mapRemoteReport(row: { id: string; title: string; category: string; mine: string; severity: string; description: string; recipient: string; status: AutoReport["status"]; created_at: string }): AutoReport {
  return { id: row.id, title: row.title, category: row.category, mine: row.mine, level: row.severity, description: row.description, recipient: row.recipient, status: row.status, createdAt: new Date(row.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) };
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaceOptions[0]);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showObservationForm, setShowObservationForm] = useState(false);
  const [observationSaved, setObservationSaved] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [observations, setObservations] = useState<LocalObservation[]>([]);
  const [autoReports, setAutoReports] = useState<AutoReport[]>([]);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotQuestion, setCopilotQuestion] = useState("");
  const [copilotAnswer, setCopilotAnswer] = useState("");
  const [dataSource, setDataSource] = useState(isSupabaseConfigured ? "Supabase connecting" : "Browser fallback");
  const [syncing, setSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [capturedLocation, setCapturedLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    let disposed = false;
    let channel: { unsubscribe: () => void } | null = null;

    const hydrateLocal = () => {
      try {
        const savedObservations = JSON.parse(window.localStorage.getItem(observationsStorageKey) || "[]") as LocalObservation[];
        const savedAutoReports = JSON.parse(window.localStorage.getItem(autoReportsStorageKey) || "[]") as AutoReport[];
        const pending = readOfflineQueue();
        const observationsById = new Map([...savedObservations, ...pending.map(mapPendingObservation)].map((row) => [row.id, row]));
        const reportsById = new Map([...savedAutoReports, ...pending.map(mapPendingReport)].map((row) => [row.id, row]));
        setObservations([...observationsById.values()]);
        setAutoReports([...reportsById.values()]);
        setPendingSyncCount(pending.length);
        setDataSource("Browser fallback");
      } catch {
        toast.error("Local workspace data could not be restored");
      }
    };

    const hydrateRemote = async () => {
      const workspace = await loadWorkspaceData();
      if (disposed) return;
      const pending = readOfflineQueue();
      const observationsById = new Map([...workspace.observations.map(mapRemoteObservation), ...pending.map(mapPendingObservation)].map((row) => [row.id, row]));
      const reportsById = new Map([...workspace.reports.map(mapRemoteReport), ...pending.map(mapPendingReport)].map((row) => [row.id, row]));
      setObservations([...observationsById.values()]);
      setAutoReports([...reportsById.values()]);
      setPendingSyncCount(pending.length);
      setDataSource("Supabase live");
    };

    const syncOfflineQueue = async () => {
      if (!isSupabaseConfigured || !supabase || !navigator.onLine || disposed) return;
      const queued = readOfflineQueue();
      setPendingSyncCount(queued.length);
      if (!queued.length) return;
      const session = await ensureSupabaseSession();
      if (!session.ok) return;
      const remaining = [...queued];
      let synced = 0;
      for (const item of queued) {
        try {
          await createRemoteObservation({ id: item.id, title: item.title, mine: item.mine, severity: item.severity, category: item.category, description: item.description, recipient: item.recipient, latitude: item.latitude, longitude: item.longitude });
          remaining.splice(remaining.findIndex((candidate) => candidate.id === item.id), 1);
          synced += 1;
        } catch (error) {
          console.warn("[MinePulse] Offline report is still waiting to sync", error);
          break;
        }
      }
      if (synced > 0) {
        writeOfflineQueue(remaining);
        setPendingSyncCount(remaining.length);
        await hydrateRemote();
        toast.success(`${synced} offline report${synced === 1 ? "" : "s"} synced to Supabase`);
      }
    };

    const connect = async () => {
      if (!isSupabaseConfigured || !supabase) {
        hydrateLocal();
        return;
      }
      try {
        const session = await ensureSupabaseSession();
        if (!session.ok) {
          toast.warning("Supabase sign-in is unavailable", { description: "Enable anonymous sign-ins in Supabase Auth, or this browser will use local demo mode." });
          hydrateLocal();
          return;
        }
        await hydrateRemote();
        await syncOfflineQueue();
        if (channel) channel.unsubscribe();
        channel = supabase.channel("minepulse-live").on("postgres_changes", { event: "*", schema: "public", table: "observations" }, () => { void hydrateRemote(); }).on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => { void hydrateRemote(); }).subscribe();
      } catch (error) {
        console.warn("[MinePulse] Supabase workspace unavailable", error);
        toast.warning("Supabase tables are not ready", { description: "Run the included migration in Supabase SQL Editor. Field reports will stay on this device and retry when available." });
        hydrateLocal();
      }
    };

    const onOffline = () => setDataSource("Browser fallback");
    window.addEventListener("online", connect);
    window.addEventListener("offline", onOffline);
    void connect();
    return () => {
      disposed = true;
      window.removeEventListener("online", connect);
      window.removeEventListener("offline", onOffline);
      channel?.unsubscribe();
    };
  }, []);

  const handleNav = (label: string) => {
    setActiveNav(label);
    setSidebarOpen(false);
    if (label !== "Overview") toast.success(`${label} view loaded`, { description: "Use the available actions and records in this workspace." });
  };

  const askCopilot = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const question = copilotQuestion.trim().toLowerCase();
    if (!question) return;
    if (question.includes("sohagpur") || question.includes("not report")) {
      setCopilotAnswer("Sohagpur has no site-specific row in the Ministry’s FY 2024–25 Top-35 mine production table. MinePulse marks it ‘Not reported’ for that source; it does not treat the absence as zero production.");
    } else if (question.includes("risk") || question.includes("health") || question.includes("compliance")) {
      setCopilotAnswer("This preview is not connected to live mine-risk, health, attendance, or compliance telemetry. Use the Compliance and Field operations registers for records your team enters; public production figures are not a substitute for operational status.");
    } else if (question.includes("production") || question.includes("output") || question.includes("mine")) {
      setCopilotAnswer(`The latest company snapshot shown is FY 2026–27 YTD through ${coalDashboardSource.asOf}: CIL ${subsidiaryProduction[0].actualMt.toFixed(2)} MT, SECL ${subsidiaryProduction[1].actualMt.toFixed(2)} MT, and NCL ${subsidiaryProduction[2].actualMt.toFixed(2)} MT. Mine-wise values are provisional FY 2024–25 figures.`);
    } else if (question.includes("report") || question.includes("export")) {
      setCopilotAnswer("Export production CSV downloads the dated public figures with source URLs and reporting periods. The Field operations tab separately exports observations entered by your team.");
    } else {
      setCopilotAnswer("I can explain the production snapshot, source periods, and why a mine may be marked not reported. These are fixed local response templates, not an AI service.");
    }
  };

  const exportPublicProduction = () => {
    const rows: Array<Array<string | number | null | undefined>> = [
      ["Dataset", "Entity", "Operator", "Reporting period", "Actual output (MT)", "Target (MT; YTD for company rows)", "Achievement (%)", "Data status", "Source URL", "Source row", "Snapshot date"],
      ...subsidiaryProduction.map((record) => ["Company YTD", record.name, record.shortName, coalDashboardSource.period, record.actualMt, record.ytdTargetMt, record.achievedPercent, "Reported company/subsidiary aggregate", coalDashboardSource.url, "Coal Production: Year (YTD)", coalDashboardSource.asOf]),
      ...publicMineOutputs.map((mine) => ["Mine FY output", mine.name, mine.operator, mineOutputSource.period, mine.outputMt, mine.annualTargetMt, mine.achievedPercent, mine.outputMt === null ? "Not reported in cited Top-35 table; not zero" : "Provisional published mine-wise value", mineOutputSource.url, mine.sourceRow ?? "No site-specific row", "Mar 2025"]),
    ];
    downloadCsv("minepulse-public-production.csv", rows);
    toast.success("Public production CSV exported", { description: "Includes source links, reporting periods, and the Sohagpur not-reported status." });
  };

  const exportObservations = () => {
    const rows: Array<Array<string | number | null | undefined>> = [
      ["ID", "Observation", "Mine", "Severity", "Description", "Latitude", "Longitude", "Recorded age"],
      ...observations.map((item) => [item.id, item.title, item.mine, item.level, item.description, item.latitude, item.longitude, item.age]),
    ];
    downloadCsv("minepulse-observations.csv", rows);
    toast.success(observations.length ? "Observation CSV exported" : "Empty observation CSV exported", { description: observations.length ? `${observations.length} user-entered record(s); public production data is not mixed in.` : "No field observations exist yet; the file contains the column headers only." });
  };

  const selectEvidence = (file?: File) => {
    setEvidencePreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const captureCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("This browser does not provide location access");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCapturedLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        toast.success("Location captured", { description: "Coordinates will be saved with this report." });
      },
      () => toast.error("Location was not captured", { description: "Allow location access or submit without coordinates." }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const submitObservation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const mine = String(formData.get("mine") || "Kusmunda");
    const level = String(formData.get("severity") || "High") as LocalObservation["level"];
    const category = String(formData.get("category") || "Safety hazard");
    const recipient = String(formData.get("recipient") || "Compliance queue");
    const title = String(formData.get("title") || "New field observation");
    const description = String(formData.get("description") || "");
    const evidence = formData.get("evidence") instanceof File && (formData.get("evidence") as File).size > 0 ? formData.get("evidence") as File : null;
    const latitude = capturedLocation?.latitude ?? null;
    const longitude = capturedLocation?.longitude ?? null;
    const observationId = crypto.randomUUID();
    if (evidence && evidence.size > 10 * 1024 * 1024) {
      toast.error("Evidence file is too large", { description: "Choose a file that is 10 MB or smaller." });
      return;
    }
    if (evidence && (dataSource !== "Supabase live" || !navigator.onLine)) {
      toast.error("Connect Supabase to store evidence", { description: "Demo mode can save report text in this browser, but it cannot persist uploaded files." });
      return;
    }
    setSyncing(true);
    if (isSupabaseConfigured) {
      let reportSaved = false;
      try {
        const remoteObservation = await createRemoteObservation({ id: observationId, title, mine, severity: level, category, description, recipient, latitude, longitude });
        reportSaved = true;
        if (evidence) await uploadEvidence(remoteObservation.id, evidence);
        const workspace = await loadWorkspaceData();
        setObservations(workspace.observations.map(mapRemoteObservation));
        setAutoReports(workspace.reports.map(mapRemoteReport));
        setObservationSaved(true);
        setShowObservationForm(false);
        toast.success("Report added to the dispatch queue", { description: `${category} report for ${mine} was saved in Supabase${evidence ? " with evidence attached" : ""}. External email/SMS is not enabled in this MVP.` });
        form.reset();
      } catch (error) {
        console.error("[MinePulse] Supabase observation failed", error);
        if (reportSaved) {
          const workspace = await loadWorkspaceData().catch(() => null);
          if (workspace) {
            setObservations(workspace.observations.map(mapRemoteObservation));
            setAutoReports(workspace.reports.map(mapRemoteReport));
          }
          setObservationSaved(true);
          setShowObservationForm(false);
          form.reset();
          toast.warning("Report saved; evidence upload failed", { description: "The report remains in the MinePulse queue. Check private Storage policies before attaching files." });
        } else if (isSupabaseConfigured) {
          const pendingItem: PendingObservation = { id: observationId, title, mine, severity: level, category, description, recipient, latitude, longitude, createdAt: new Date().toISOString() };
          const pending = [...readOfflineQueue().filter((item) => item.id !== observationId), pendingItem];
          writeOfflineQueue(pending);
          setPendingSyncCount(pending.length);
          const localObservation = mapPendingObservation(pendingItem);
          const localReport = mapPendingReport(pendingItem);
          setObservations((current) => { const next = [localObservation, ...current.filter((item) => item.id !== observationId)]; window.localStorage.setItem(observationsStorageKey, JSON.stringify(next)); return next; });
          setAutoReports((current) => { const next = [localReport, ...current.filter((item) => item.id !== localReport.id)]; window.localStorage.setItem(autoReportsStorageKey, JSON.stringify(next)); return next; });
          setObservationSaved(true);
          setShowObservationForm(false);
          form.reset();
          toast.warning("Report saved on this device; sync is pending", { description: "MinePulse will retry automatically when you reconnect. The text and optional coordinates are queued; evidence files need a connection." });
        } else {
          toast.error("Could not save the observation", { description: "Check browser storage and try again." });
        }
      } finally {
        setSyncing(false);
      }
      return;
    }
    const id = String(Date.now());
    const nextObservation: LocalObservation = { id, title, mine, level, description, latitude, longitude, age: "just now", color: level === "Critical" ? "red" : level === "High" ? "amber" : "blue" };
    const nextReport: AutoReport = { id: `report-${id}`, title, category, mine, level, description, recipient, status: "Queued", createdAt: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) };
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
    toast.success("Report saved in this browser", { description: `${category} report for ${mine} is stored locally only. Configure Supabase for shared records; this MVP does not send email/SMS.` });
    form.reset();
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
                {active && <motion.span layoutId="nav-active-pill" className="nav-active-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              </button>
            );
          })}
        </nav>

        <div className="nav-label nav-label--spaced">WORKSPACE</div>
        <nav className="primary-nav">
          <button className="nav-item" onClick={() => setCopilotOpen(true)}><Sparkles size={17} /><span>Copilot demo</span><span className="ai-dot" /></button>
          <button className="nav-item theme-toggle" onClick={() => toggleTheme?.()} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}<span>Dark mode</span><span className="theme-toggle__state">{theme === "dark" ? "ON" : "OFF"}</span></button>
        </nav>

        <div className="sidebar-footer">
          <div className="sync-card">
            <div className="sync-icon"><RefreshCw size={15} /></div>
            <div><strong>{dataSource === "Supabase live" ? "Supabase connected" : dataSource === "Supabase connecting" ? "Connecting to Supabase" : "Local demo mode"}</strong><span>{syncing ? "Saving workspace changes…" : dataSource === "Supabase live" ? "Reports sync · illustrative metrics remain" : "Run the Supabase migration to sync reports"}</span></div>
            <span className={`status-dot ${dataSource === "Supabase live" ? "status-dot--green" : "status-dot--amber"}`} />
          </div>
          <div className="profile-row">
            <div className="avatar avatar--lime">AS</div>
            <div className="profile-copy"><strong>Demo Admin</strong><span>Prototype workspace</span></div>
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
              <input aria-label="Search public mine data" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search public mines..." />
              <kbd>⌘ K</kbd>
            </div>
            <button className="icon-button mobile-search" onClick={() => setSearchOpen((value) => !value)} aria-label="Toggle search"><Search size={18} /></button>
            <button className="icon-button notification-button" onClick={() => toast.info("Alerts are not connected in this MVP", { description: "This preview has no live alert feed or outbound email, SMS, or WhatsApp delivery." })} aria-label="Notifications"><Bell size={18} /><span /></button>
            <button className="help-button" onClick={() => toast.info("Deployment guide", { description: "Start with the included DEPLOYMENT_GUIDE.md for Supabase and hosting setup." })}>Need help?</button>
          </div>
        </header>

        <div className="page-container">
          {activeNav !== "Cost & scale" && <div className="data-caveat"><AlertTriangle size={15} /><span><strong>Public data and your records are separate.</strong> Production figures are dated public snapshots—not live mine telemetry, safety, or compliance status. Observations and reports sync to Supabase for this anonymous browser identity; contractor and compliance registers and cost assumptions stay in this browser. Guest records are not shared across browsers or devices.{pendingSyncCount > 0 && ` ${pendingSyncCount} observation(s) are waiting to sync.`}</span></div>}
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="live-pulse" /> {activeNav === "Overview" ? "PUBLIC COAL PRODUCTION · SOURCE-DATED SNAPSHOT" : dataSource === "Supabase live" ? "SUPABASE CONNECTED · USER RECORDS" : "LOCAL PREVIEW · USER RECORDS"}</div>
              <h1>{activeNav === "Overview" ? "MinePulse Command" : activeNav}</h1>
              <p>{navSubtitles[activeNav]}</p>
            </div>
            <div className="heading-actions">
              {activeNav === "Overview" && <button className="button button--secondary" onClick={exportPublicProduction}><Download size={16} /> Export production CSV</button>}
              <button className="button button--primary" onClick={() => { setObservationSaved(false); setCapturedLocation(null); setShowObservationForm(true); }}><MapPin size={16} /> Log observation</button>
            </div>
          </section>

          <AnimatePresence mode="wait" initial={false}>
          <motion.div key={activeNav} className="workspace-view-transition" initial={{ opacity: 0, y: 12, filter: "blur(5px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -5, filter: "blur(3px)" }} transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}>
          {activeNav === "Overview" ? <OverviewDashboard searchQuery={searchQuery} observationCount={observations.length} reportCount={autoReports.length} pendingSyncCount={pendingSyncCount} onLogObservation={() => { setObservationSaved(false); setCapturedLocation(null); setShowObservationForm(true); }} onNavigate={handleNav} /> : activeNav === "Cost & scale" ? <PlanningDashboard /> : activeNav === "Contractors" ? <RecordsDashboard kind="contractors" /> : activeNav === "Compliance" ? <RecordsDashboard kind="compliance" /> : activeNav === "Reports" ? <ReportsDashboard reports={autoReports} /> : activeNav === "Field operations" ? <FieldOperationsDashboard observations={observations} pendingSyncCount={pendingSyncCount} dataSource={dataSource} onNewObservation={() => { setObservationSaved(false); setCapturedLocation(null); setShowObservationForm(true); }} onExport={exportObservations} /> : <div className="records-empty"><strong>Choose a section from the sidebar.</strong></div>}

          </motion.div>
          </AnimatePresence>
          {observationSaved && <div className="success-banner"><Check size={16} /> New observation captured and added to the review queue <button onClick={() => setObservationSaved(false)}><X size={14} /></button></div>}
        </div>
      </main>

      {showObservationForm && <div className="modal-backdrop" onClick={() => setShowObservationForm(false)}><section className="observation-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--amber" /> FIELD REPORTING</div><h2>Log an observation</h2><p>Capture an issue and optionally save your device location with it.</p></div><button className="icon-button" onClick={() => setShowObservationForm(false)} aria-label="Close form"><X size={18} /></button></div><form onSubmit={submitObservation}><label>Observation title<input name="title" required placeholder="e.g. Missing PPE at haul road" /></label><div className="form-row"><label>Mine<select name="mine" defaultValue="Kusmunda"><option>Kusmunda</option><option>Gevra OC</option><option>Dipka OC</option><option>Jayant</option></select></label><label>Report type<select name="category" defaultValue="Safety hazard"><option>Safety hazard</option><option>Worker grievance</option><option>Environmental issue</option><option>Compliance concern</option></select></label></div><div className="form-row"><label>Severity<select name="severity" defaultValue="High"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label><label>Recipient<select name="recipient" defaultValue="Compliance queue"><option>Compliance queue</option><option>Mine safety officer</option><option>Regional grievance cell</option></select></label></div><label>What did you observe?<textarea name="description" required placeholder="Describe the condition, people involved, and immediate action taken..." rows={4} /></label><label className="evidence-upload">Evidence attachment <span>Optional · maximum 10 MB</span><input name="evidence" type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => selectEvidence(event.target.files?.[0])} />{evidencePreview && <div className="evidence-preview"><img src={evidencePreview} alt="Selected evidence preview" /><span>Preview ready · private bucket upload on submit</span></div>}</label><div className="capture-meta"><button type="button" className="capture-location-button" onClick={captureCurrentLocation}><MapPin size={14} /> {capturedLocation ? `${capturedLocation.latitude.toFixed(5)}, ${capturedLocation.longitude.toFixed(5)}` : "Capture my location (optional)"}</button><span><Zap size={14} /> Report will be queued in MinePulse</span></div><div className="modal-actions"><button type="button" className="button button--secondary" onClick={() => setShowObservationForm(false)}>Cancel</button><button type="submit" className="button button--primary" disabled={syncing} aria-busy={syncing}><Zap size={16} /> {syncing ? "Saving…" : "Save & queue in MinePulse"}</button></div></form></section></div>}
      {copilotOpen && <div className="modal-backdrop" onClick={() => setCopilotOpen(false)}><section className="copilot-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--purple" /> RULE-BASED COPILOT PREVIEW</div><h2>Explore the public snapshot</h2><p>Uses fixed local response templates about the cited production figures. It cannot assess live mine risk, health, or compliance; no AI model or external service is connected.</p></div><button className="icon-button" onClick={() => setCopilotOpen(false)} aria-label="Close copilot"><X size={18} /></button></div><div className="copilot-suggestions"><button onClick={() => setCopilotQuestion("What is the latest production snapshot?")}>What is the latest production snapshot?</button><button onClick={() => setCopilotQuestion("Why is Sohagpur not reported?")}>Why is Sohagpur not reported?</button><button onClick={() => setCopilotQuestion("How do I export the data?")}>How do I export the data?</button></div>{copilotAnswer && <div className="copilot-answer"><Sparkles size={15} /><span>{copilotAnswer}</span></div>}<form className="copilot-form" onSubmit={askCopilot}><input autoFocus value={copilotQuestion} onChange={(event) => setCopilotQuestion(event.target.value)} placeholder="Ask about production sources, periods, or empty records..." /><button className="button button--primary" type="submit"><ArrowUpRight size={16} /> Ask</button></form></section></div>}
    </div>
  );
}
