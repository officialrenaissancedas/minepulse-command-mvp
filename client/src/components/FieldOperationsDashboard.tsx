import { Download, MapPin, Plus, Radio, ClipboardCheck } from "lucide-react";

type Observation = {
  id: string;
  title: string;
  mine: string;
  level: string;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  age: string;
};

export default function FieldOperationsDashboard({ observations, pendingSyncCount, dataSource, onNewObservation, onExport }: {
  observations: Observation[];
  pendingSyncCount: number;
  dataSource: string;
  onNewObservation: () => void;
  onExport: () => void;
}) {
  const urgent = observations.filter((item) => item.level === "Critical" || item.level === "High").length;
  const geotagged = observations.filter((item) => typeof item.latitude === "number" && typeof item.longitude === "number").length;
  return <div className="records-workspace">
    <section className="records-note"><div><strong>Field observations, not invented activity</strong><p>Log a time-stamped observation, optionally capture the device location, and attach an evidence file when online. Reports sync to Supabase when configured; offline text and coordinates wait on this device and retry after reconnection.</p></div><span className="planning-saved"><Radio size={13} /> {pendingSyncCount ? `${pendingSyncCount} waiting` : dataSource}</span></section>
    <section className="metric-grid records-metrics" aria-label="Field report summary">
      {[{ label: "Observations", value: observations.length, note: "Saved field reports" }, { label: "High-priority", value: urgent, note: "Critical or high severity" }, { label: "Geo-tagged", value: geotagged, note: "Browser location captured" }, { label: "Waiting to sync", value: pendingSyncCount, note: "Held in this browser outbox" }].map((item, index) => <article className="metric-card" key={item.label}><div className="metric-card__top"><span className={`metric-icon ${index === 1 ? "metric-icon--amber" : "metric-icon--blue"}`}><ClipboardCheck size={17} /></span><span className="metric-trend metric-trend--neutral">RECORDED</span></div><div className="metric-value">{item.value}</div><div className="metric-label">{item.label}</div><div className="metric-footer"><span>{item.note}</span></div></article>)}
    </section>
    <section className="panel records-panel">
      <div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--green" /> FIELD LOG</div><h2>Observations and location evidence</h2></div><div className="records-actions"><button className="button button--secondary" onClick={onExport}><Download size={14} /> Export CSV</button><button className="button button--primary" onClick={onNewObservation}><Plus size={14} /> Log observation</button></div></div>
      {observations.length === 0 ? <div className="records-empty"><span className="metric-icon metric-icon--blue"><ClipboardCheck size={18} /></span><strong>No field observations yet</strong><p>Submit a report to create the first operational record. Device location is optional.</p><button className="button button--secondary" onClick={onNewObservation}><Plus size={14} /> Create first report</button></div> : <div className="records-table-wrap"><table className="records-table"><thead><tr><th>Observation</th><th>Mine</th><th>Severity</th><th>Location</th><th>Age</th></tr></thead><tbody>{observations.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><small className="report-description">{item.description}</small></td><td>{item.mine}</td><td><span className={`records-status ${item.level === "Critical" || item.level === "High" ? "records-status--warn" : "records-status--good"}`}>{item.level}</span></td><td>{typeof item.latitude === "number" && typeof item.longitude === "number" ? <span className="coordinate-label"><MapPin size={12} />{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</span> : "Not tagged"}</td><td>{item.age}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
