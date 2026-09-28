import { useEffect, useMemo, useState } from "react";
import { Download, Plus, RefreshCw, ShieldCheck, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import { ensureSupabaseSession, isSupabaseConfigured, supabase } from "../lib/supabase";

export type RecordsKind = "compliance" | "contractors";
type RecordStatus = "Open" | "In review" | "Complete" | "Active" | "On hold";
type RegisterRow = {
  id: string;
  mine: string;
  status: RecordStatus;
  created_at?: string;
  name?: string;
  workers?: number;
  induction_pct?: number;
  next_renewal?: string | null;
  requirement?: string;
  domain?: string;
  due_date?: string | null;
  notes?: string;
};

const mines = ["Kusmunda", "Gevra OC", "Dipka OC", "Sohagpur", "Jayant", "Nigahi"];
const tableFor: Record<RecordsKind, string> = { contractors: "contractors", compliance: "compliance_checks" };
const storageFor: Record<RecordsKind, string> = { contractors: "minepulse-contractors-v1", compliance: "minepulse-compliance-checks-v1" };
const statusesFor: Record<RecordsKind, RecordStatus[]> = {
  contractors: ["Active", "On hold"],
  compliance: ["Open", "In review", "Complete"],
};

function readLocal(kind: RecordsKind): RegisterRow[] {
  try { return JSON.parse(localStorage.getItem(storageFor[kind]) || "[]") as RegisterRow[]; }
  catch { return []; }
}

function saveLocal(kind: RecordsKind, rows: RegisterRow[]) {
  localStorage.setItem(storageFor[kind], JSON.stringify(rows));
}

function makeCsv(rows: RegisterRow[], kind: RecordsKind) {
  const headers = kind === "contractors"
    ? ["Company", "Mine", "Workers", "Induction %", "Next renewal", "Status"]
    : ["Mine", "Requirement", "Domain", "Due date", "Status", "Notes"];
  const records = rows.map((row) => kind === "contractors"
    ? [row.name, row.mine, row.workers, row.induction_pct, row.next_renewal, row.status]
    : [row.mine, row.requirement, row.domain, row.due_date, row.status, row.notes]);
  const csv = [headers, ...records].map((line) => line.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `minepulse-${kind}-register.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success("Register CSV downloaded");
}

export default function RecordsDashboard({ kind }: { kind: RecordsKind }) {
  const contractorMode = kind === "contractors";
  const [rows, setRows] = useState<RegisterRow[]>([]);
  const [mode, setMode] = useState<"loading" | "supabase" | "browser">("loading");
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState(mines[0]);
  const [formError, setFormError] = useState("");

  const refresh = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setRows(readLocal(kind));
      setMode("browser");
      return;
    }
    try {
      const auth = await ensureSupabaseSession();
      if (!auth.ok) throw auth.error;
      const { data, error } = await supabase.from(tableFor[kind]).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as RegisterRow[]);
      setMode("supabase");
    } catch (error) {
      console.warn(`[MinePulse] ${kind} register is using browser storage`, error);
      setRows(readLocal(kind));
      setMode("browser");
    }
  };

  useEffect(() => { void refresh(); }, [kind]);

  const summary = useMemo(() => {
    if (contractorMode) {
      const contractors = rows.length;
      const workers = rows.reduce((sum, row) => sum + Number(row.workers || 0), 0);
      const avgInduction = contractors ? Math.round(rows.reduce((sum, row) => sum + Number(row.induction_pct || 0), 0) / contractors) : 0;
      const onHold = rows.filter((row) => row.status === "On hold").length;
      return [{ label: "Contractors", value: String(contractors), note: "Records created in this workspace" }, { label: "Workers represented", value: workers.toLocaleString("en-IN"), note: "Entered by the register owner" }, { label: "Average induction", value: `${avgInduction}%`, note: "Average of entered percentages" }, { label: "On hold", value: String(onHold), note: "Contractor records flagged on hold" }];
    }
    const open = rows.filter((row) => row.status !== "Complete").length;
    const overdue = rows.filter((row) => row.status !== "Complete" && row.due_date && row.due_date < new Date().toISOString().slice(0, 10)).length;
    const complete = rows.length - open;
    return [{ label: "Checks registered", value: String(rows.length), note: "Requirements entered by your team" }, { label: "Open checks", value: String(open), note: "Open or under review" }, { label: "Overdue", value: String(overdue), note: "Based on due date and status" }, { label: "Completed", value: String(complete), note: "Marked complete in this workspace" }];
  }, [contractorMode, rows]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const record: RegisterRow = contractorMode
      ? { id, mine, name: String(values.get("name") || "").trim(), workers: Number(values.get("workers") || 0), induction_pct: Number(values.get("induction_pct") || 0), next_renewal: String(values.get("next_renewal") || "") || null, status: "Active", created_at: now }
      : { id, mine, requirement: String(values.get("requirement") || "").trim(), domain: String(values.get("domain") || "Safety"), due_date: String(values.get("due_date") || "") || null, notes: String(values.get("notes") || "").trim(), status: "Open", created_at: now };
    if (contractorMode && (!record.name || Number(record.workers) < 0 || Number(record.induction_pct) < 0 || Number(record.induction_pct) > 100)) {
      setFormError("Enter a company name, non-negative worker count, and induction coverage from 0–100%.");
      return;
    }
    if (!contractorMode && !record.requirement) {
      setFormError("Enter the requirement or inspection check to track.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "supabase" && supabase) {
        const { error } = await supabase.from(tableFor[kind]).insert(record);
        if (error) throw error;
        await refresh();
        toast.success(contractorMode ? "Contractor saved to Supabase" : "Compliance check saved to Supabase");
      } else {
        const next = [record, ...rows];
        saveLocal(kind, next);
        setRows(next);
        toast.success("Saved in this browser only", { description: "Add Supabase settings and run the database migration to share records." });
      }
      setFormOpen(false);
      form.reset();
    } catch (error) {
      console.error(`[MinePulse] Could not save ${kind} record`, error);
      setFormError("Could not save. Check that the Supabase migration is applied and this browser is online.");
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (row: RegisterRow, status: RecordStatus) => {
    const next = rows.map((item) => item.id === row.id ? { ...item, status } : item);
    if (mode === "supabase" && supabase) {
      const { error } = await supabase.from(tableFor[kind]).update({ status }).eq("id", row.id);
      if (error) { toast.error("Status update failed", { description: error.message }); return; }
    } else saveLocal(kind, next);
    setRows(next);
  };

  const remove = async (row: RegisterRow) => {
    const label = contractorMode ? row.name : row.requirement;
    if (!window.confirm(`Delete “${label}” from this register? This cannot be undone.`)) return;
    if (mode === "supabase" && supabase) {
      const { error } = await supabase.from(tableFor[kind]).delete().eq("id", row.id);
      if (error) { toast.error("Delete failed", { description: error.message }); return; }
    }
    const next = rows.filter((item) => item.id !== row.id);
    if (mode !== "supabase") saveLocal(kind, next);
    setRows(next);
    toast.success("Record deleted");
  };

  return <div className="records-workspace">
    <section className="records-note"><div><strong>{mode === "supabase" ? "Synced to this browser's anonymous Supabase account" : mode === "loading" ? "Loading register…" : "Browser-only mode"}</strong><p>{contractorMode ? "Add contractor records, track induction and renewal, update status, and export the register." : "Create a mine-specific requirement/check, record a due date, track its status, and export the register."} This is a team-entered work register, not a verified statutory legal register.</p></div><button className="button button--secondary" onClick={() => void refresh()}><RefreshCw size={14} /> Refresh</button></section>

    <section className="metric-grid records-metrics">{summary.map((item) => <article className="metric-card" key={item.label}><div className="metric-card__top"><span className={`metric-icon ${contractorMode ? "metric-icon--purple" : "metric-icon--lime"}`}>{contractorMode ? <UsersRound size={17} /> : <ShieldCheck size={17} />}</span><span className="metric-trend metric-trend--neutral">{mode === "supabase" ? "SAVED" : "LOCAL"}</span></div><div className="metric-value">{item.value}</div><div className="metric-label">{item.label}</div><div className="metric-footer"><span>{item.note}</span></div></article>)}</section>

    <section className="panel records-panel">
      <div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--blue" /> {contractorMode ? "CONTRACTOR REGISTER" : "COMPLIANCE WORK REGISTER"}</div><h2>{contractorMode ? "Companies, induction & renewals" : "Mine requirements & follow-up"}</h2></div><div className="records-actions"><button className="button button--secondary" onClick={() => makeCsv(rows, kind)}><Download size={14} /> Export CSV</button><button className="button button--primary" onClick={() => { setFormError(""); setFormOpen(true); }}><Plus size={14} /> {contractorMode ? "Add contractor" : "Add check"}</button></div></div>
      {rows.length === 0 ? <div className="records-empty"><span className="metric-icon metric-icon--blue">{contractorMode ? <UsersRound size={18} /> : <ShieldCheck size={18} />}</span><strong>No {contractorMode ? "contractors" : "compliance checks"} yet</strong><p>Add your first real record; dashboards and exports calculate from the entries you create.</p><button className="button button--secondary" onClick={() => setFormOpen(true)}><Plus size={14} /> Create first record</button></div> : <div className="records-table-wrap"><table className="records-table"><thead><tr>{contractorMode ? <><th>Company</th><th>Mine</th><th>Workers</th><th>Induction</th><th>Renewal</th><th>Status</th></> : <><th>Requirement / check</th><th>Mine</th><th>Domain</th><th>Due date</th><th>Status</th><th>Notes</th></>}<th>Manage</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{contractorMode ? <><td><strong>{row.name}</strong></td><td>{row.mine}</td><td>{Number(row.workers || 0).toLocaleString("en-IN")}</td><td><span className="records-progress"><i style={{ width: `${Math.min(100, Math.max(0, Number(row.induction_pct || 0)))}%` }} /></span>{row.induction_pct}%</td><td>{row.next_renewal || "Not set"}</td></> : <><td><strong>{row.requirement}</strong></td><td>{row.mine}</td><td>{row.domain}</td><td>{row.due_date || "Not set"}</td><td><span className={`records-status ${row.status === "Complete" ? "records-status--good" : "records-status--warn"}`}>{row.status}</span>{row.status !== "Complete" && row.due_date && row.due_date < new Date().toISOString().slice(0, 10) && <small className="is-overdue">OVERDUE</small>}</td><td>{row.notes || "—"}</td></>}
        {contractorMode && <td><span className={`records-status ${row.status === "Active" ? "records-status--good" : "records-status--warn"}`}>{row.status}</span></td>}
        <td><div className="records-manage"><select aria-label={`Update ${contractorMode ? row.name : row.requirement} status`} className="records-status-select" value={row.status} onChange={(event) => void updateStatus(row, event.target.value as RecordStatus)}>{statusesFor[kind].map((status) => <option key={status}>{status}</option>)}</select><button className="records-delete" onClick={() => void remove(row)} aria-label={`Delete ${contractorMode ? row.name : row.requirement}`}><X size={15} /></button></div></td></tr>)}</tbody></table></div>}
    </section>

    {formOpen && <div className="modal-backdrop" onClick={() => setFormOpen(false)}><section className="observation-modal records-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--blue" /> {contractorMode ? "CONTRACTOR MANAGEMENT" : "COMPLIANCE FOLLOW-UP"}</div><h2>{contractorMode ? "Add contractor" : "Add compliance check"}</h2></div><button className="icon-button" onClick={() => setFormOpen(false)} aria-label="Close form"><X size={18} /></button></div><form onSubmit={submit}><label>Mine<select value={mine} onChange={(event) => setMine(event.target.value)}>{mines.map((name) => <option key={name}>{name}</option>)}</select></label>{contractorMode ? <><label>Company name<input name="name" required maxLength={180} placeholder="e.g. Contractor or service provider" /></label><div className="form-row"><label>Workers<input name="workers" type="number" min="0" step="1" defaultValue="0" /></label><label>Induction coverage (%)<input name="induction_pct" type="number" min="0" max="100" step="1" defaultValue="0" /></label></div><label>Next document renewal<input name="next_renewal" type="date" /></label></> : <><label>Requirement or inspection check<input name="requirement" required maxLength={300} placeholder="e.g. Monthly ventilation inspection" /></label><div className="form-row"><label>Domain<select name="domain"><option>Safety</option><option>Environment</option><option>Production</option><option>Labour</option></select></label><label>Due date<input name="due_date" type="date" /></label></div><label>Notes<textarea name="notes" rows={3} maxLength={3000} placeholder="Owner, evidence needed, or follow-up note" /></label></>}{formError && <p className="records-form-error" role="alert">{formError}</p>}<div className="modal-actions"><button type="button" className="button button--secondary" onClick={() => setFormOpen(false)}>Cancel</button><button type="submit" className="button button--primary" disabled={busy}>{busy ? "Saving…" : "Save record"}</button></div></form></section></div>}
  </div>;
}
