import { useMemo, useState } from "react";
import { Download, FileText, Search } from "lucide-react";
import { toast } from "sonner";

type Report = {
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

function downloadCsv(reports: Report[]) {
  const rows = [["Title", "Category", "Mine", "Severity", "Recipient", "Status", "Created", "Description"], ...reports.map((report) => [report.title, report.category, report.mine, report.level, report.recipient, report.status, report.createdAt, report.description])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "minepulse-report-queue.csv";
  link.click();
  URL.revokeObjectURL(url);
  toast.success("Report queue CSV downloaded");
}

export default function ReportsDashboard({ reports }: { reports: Report[] }) {
  const [search, setSearch] = useState("");
  const visible = useMemo(() => reports.filter((report) => `${report.title} ${report.mine} ${report.category} ${report.recipient}`.toLowerCase().includes(search.trim().toLowerCase())), [reports, search]);
  const queued = reports.filter((report) => report.status === "Queued").length;
  const failed = reports.filter((report) => report.status === "Failed").length;
  const critical = reports.filter((report) => report.level === "Critical").length;

  return <div className="records-workspace">
    <section className="records-note"><div><strong>Dispatch is an in-app queue only</strong><p>Each saved observation creates a linked report record and audit event in Supabase. This MVP does not send email, SMS, WhatsApp, or official statutory filings.</p></div><span className="planning-saved">{reports.length} records</span></section>
    <section className="metric-grid records-metrics" aria-label="Report queue summary">
      {[{ label: "Reports created", value: reports.length, note: "Linked to saved observations" }, { label: "Queued", value: queued, note: "Stored in this app" }, { label: "Critical", value: critical, note: "Requires human follow-up" }, { label: "Delivery failures", value: failed, note: "External delivery is not configured" }].map((item, index) => <article className="metric-card" key={item.label}><div className="metric-card__top"><span className={`metric-icon ${index === 0 ? "metric-icon--blue" : index === 2 ? "metric-icon--amber" : "metric-icon--lime"}`}><FileText size={17} /></span><span className="metric-trend metric-trend--neutral">RECORDED</span></div><div className="metric-value">{item.value}</div><div className="metric-label">{item.label}</div><div className="metric-footer"><span>{item.note}</span></div></article>)}
    </section>
    <section className="panel records-panel">
      <div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--blue" /> REPORT LIBRARY</div><h2>Saved field reports</h2></div><button className="button button--secondary" onClick={() => downloadCsv(visible)}><Download size={14} /> Export visible CSV</button></div>
      <label className="report-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, mine, category, or recipient" /></label>
      {visible.length === 0 ? <div className="records-empty"><span className="metric-icon metric-icon--blue"><FileText size={18} /></span><strong>{reports.length ? "No reports match" : "No reports yet"}</strong><p>{reports.length ? "Try a shorter search." : "Submit a field observation to create the first linked report."}</p></div> : <div className="records-table-wrap"><table className="records-table"><thead><tr><th>Report</th><th>Mine</th><th>Category</th><th>Severity</th><th>Recipient</th><th>Status</th><th>Created</th></tr></thead><tbody>{visible.map((report) => <tr key={report.id}><td><strong>{report.title}</strong><small className="report-description">{report.description}</small></td><td>{report.mine}</td><td>{report.category}</td><td><span className={`records-status ${report.level === "Critical" || report.level === "High" ? "records-status--warn" : "records-status--good"}`}>{report.level}</span></td><td>{report.recipient}</td><td><span className="records-status records-status--warn">{report.status}</span></td><td>{report.createdAt}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
