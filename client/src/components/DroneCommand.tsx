import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Crosshair,
  Download,
  DollarSign,
  Gauge,
  Layers,
  Server,
  TrendingUp,
  Zap,
  FileText,
  MapPin,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Satellite,
  ShieldCheck,
  Square,
  Upload,
  Video,
  Wifi,
  X,
} from "lucide-react";
import { toast } from "sonner";

type SourceAsset = {
  id: string;
  short: string;
  title: string;
  kind: string;
  fact: string;
  role: string;
  url: string;
};

const researchedSources: SourceAsset[] = [
  { id: "PEX-31752064", short: "Tunnel machinery", title: "Underground Tunnel Construction with Heavy Machinery", kind: "Pexels · single clip · 0:11", fact: "Page description says heavy machinery operates in a dimly lit underground tunnel construction site.", role: "Heavy-equipment context review", url: "https://www.pexels.com/video/underground-tunnel-construction-with-heavy-machinery-31752064/" },
  { id: "PEX-UMINE", short: "Underground mine", title: "Free Underground Mine Videos", kind: "Pexels · discovery collection", fact: "Search metadata exposes mine, tunnel, coal mining, cave, and miner discovery terms; not one verified clip.", role: "Candidate media discovery", url: "https://www.pexels.com/search/videos/underground%20mine/" },
  { id: "PEX-CMTUNNEL", short: "Coal mine tunnel", title: "Free Coal Mine Tunnel Videos", kind: "Pexels · discovery collection", fact: "Collection includes tunnel and construction results with filters; page does not establish mine identity or current conditions.", role: "Tunnel-context discovery", url: "https://www.pexels.com/search/videos/coal%20mine%20tunnel/" },
  { id: "PEX-UMTUNNELS", short: "Mining tunnels", title: "Free Underground Mining Tunnels Videos", kind: "Pexels · discovery collection", fact: "Visible related searches include coal mine, mining industry, underground tunnel, and caves.", role: "Training / scenario design", url: "https://www.pexels.com/search/videos/underground%20mining%20tunnels/" },
  { id: "PIX-MINERS", short: "Coal miners", title: "Free Coal Miners 4K & HD Stock Videos", kind: "Pixabay · discovery collection", fact: "Catalog exposes uploader, duration, and HD/4K labels; collection is not a verified coal-mine dataset.", role: "Reference media discovery", url: "https://pixabay.com/videos/search/coal%20miners/" },
  { id: "PIX-MINE", short: "Coal mine", title: "Coal-mine videos for download", kind: "Pixabay · discovery collection", fact: "Collection shows 4K/HD/SD clips and durations; no mine name, location, date, or incident is verified.", role: "Coal visual corpus", url: "https://pixabay.com/videos/search/coal-mine/" },
  { id: "PIX-MINER", short: "Coal miner", title: "Free Coal-Miner 4K & HD Stock Videos", kind: "Pixabay · discovery collection", fact: "Search page exposes filters and varied stock titles; each clip requires operator relevance and rights review.", role: "Operator-review examples", url: "https://pixabay.com/videos/search/coal%20miner/" },
  { id: "YT-RKUL", short: "Nimcha UG visit", title: "Mine Visit-Underground Coal Mining/Nimcha UG/Eastern Coalfields Limited/Coal India Limited", kind: "YouTube · watch page · 10:17", fact: "Title-level metadata references Nimcha UG and Eastern Coalfields Limited; site identity is not independently verified.", role: "Underground coal context", url: "https://www.youtube.com/watch?v=RkulYBhiKMY" },
  { id: "YT-WATR", short: "Singareni mines", title: "Unseen Footage: Inside the Mighty Singareni Coal Mines! | 11 incline | Godavarikhani", kind: "YouTube · watch page · 1:26:23", fact: "Title-level metadata references Singareni, an 11 incline, and Godavarikhani; no frame-level claim is made.", role: "Long-form review input", url: "https://www.youtube.com/watch?v=waTRRcQsGg0" },
];

type Finding = {
  id: string;
  label: string;
  mine: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  confidence: number;
  gps: string;
  status: "Review" | "Assigned" | "Closed";
  note: string;
};

const initialFindings: Finding[] = [
  { id: "D-104", label: "Haul-road edge erosion", mine: "Kusmunda OC", severity: "High", confidence: 94, gps: "22.3591, 82.6824", status: "Review", note: "Fresh edge loss near north ramp; verify berm height before next shift." },
  { id: "D-103", label: "Dust plume at crusher transfer", mine: "Gevra OC", severity: "Medium", confidence: 88, gps: "22.3540, 82.6478", status: "Assigned", note: "Visible dust signature across two frames; route to environment owner." },
  { id: "D-102", label: "Standing water on bench", mine: "Dipka OC", severity: "Medium", confidence: 81, gps: "22.3697, 82.6332", status: "Review", note: "Water pocket intersects light-vehicle route; inspect drainage and signage." },
  { id: "D-101", label: "Restricted zone intrusion", mine: "Nigahi", severity: "Low", confidence: 76, gps: "24.1908, 82.6697", status: "Closed", note: "Single worker silhouette detected outside marked route; no repeat in next frame." },
];

const modules: Array<[string, string, LucideIcon]> = [
  ["RGB video ingest", "MP4 / MOV / camera", Video],
  ["Thermal layer", "Thermal frames ready", Activity],
  ["GPS telemetry", "MAVLink / flight log", Satellite],
  ["Object tracking", "Persistent IDs", Crosshair],
  ["Dust & water", "Coal-mine classes", Wifi],
  ["Evidence vault", "Private attachments", ShieldCheck],
];

function downloadText(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function DroneCommand() {
  const [missionRunning, setMissionRunning] = useState(true);
  const [demoFeed, setDemoFeed] = useState(true);
  const [telemetry, setTelemetry] = useState({ altitude: 86, speed: 12.4, battery: 78, frames: 1284 });
  const [findings, setFindings] = useState(initialFindings);
  const [selectedFinding, setSelectedFinding] = useState(initialFindings[0]);
  const [selectedMine, setSelectedMine] = useState("Kusmunda OC");
  const [streamUrl, setStreamUrl] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState("");
  const [selectedSource, setSelectedSource] = useState(researchedSources[0]);
  const [streamMode, setStreamMode] = useState("Simulator flight");
  const [streamConnected, setStreamConnected] = useState(true);
  const [analysisTick, setAnalysisTick] = useState(72);
  const [manualTitle, setManualTitle] = useState("");
  const [manualNote, setManualNote] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!missionRunning || !demoFeed) return;
    const timer = window.setInterval(() => {
      setTelemetry((current) => ({
        altitude: Math.max(62, Math.min(112, current.altitude + (Math.random() > 0.5 ? 2 : -2))),
        speed: Number(Math.max(8, Math.min(18, current.speed + (Math.random() > 0.5 ? 0.4 : -0.4))).toFixed(1)),
        battery: Math.max(35, current.battery - 1),
        frames: current.frames + 6,
      }));
    }, 1800);
    return () => window.clearInterval(timer);
  }, [missionRunning, demoFeed]);

  useEffect(() => {
    if (!missionRunning || !streamConnected) return;
    const timer = window.setInterval(() => setAnalysisTick((value) => value >= 98 ? 72 : value + 3), 2400);
    return () => window.clearInterval(timer);
  }, [missionRunning, streamConnected]);

  useEffect(() => () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera input is not available in this browser", { description: "Use a video file or the simulator feed instead." });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      mediaStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
      setDemoFeed(false);
      toast.success("Camera input connected", { description: "Frames are ready for the coal-mine inspection pipeline." });
    } catch {
      toast.error("Camera permission was not granted", { description: "The simulator remains available for the preview." });
    }
  };

  const stopCamera = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    const validType = file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv)$/i.test(file.name);
    if (!validType) { toast.error("Unsupported footage format", { description: "Choose an MP4, MOV, WebM, or MKV video file." }); return; }
    if (file.size > 250 * 1024 * 1024) { toast.error("Footage file is too large", { description: "Preview uploads are limited to 250 MB; use the production ingest gateway for larger flights." }); return; }
    setUploadedFile(file.name);
    setDemoFeed(false);
    toast.success("Inspection media staged", { description: `${file.name} is ready for analysis.` });
  };

  const stageStreamEndpoint = () => {
    if (!streamUrl.trim()) { toast.info("Enter an endpoint first", { description: "Use an authenticated WebRTC or HLS gateway URL in production." }); return; }
    try {
      const parsed = new URL(streamUrl.trim());
      if (!["rtsp:", "rtsps:", "http:", "https:"].includes(parsed.protocol)) throw new Error("protocol");
      toast.success("Stream endpoint staged", { description: `${parsed.protocol}//${parsed.host} passed format validation.` });
    } catch {
      toast.error("Invalid stream endpoint", { description: "Use an rtsp://, rtsps://, http://, or https:// URL." });
    }
  };

  const addManualFinding = (event: React.FormEvent) => {
    event.preventDefault();
    if (!manualTitle.trim()) return;
    const finding: Finding = {
      id: `MAN-${findings.length + 1}`,
      label: manualTitle,
      mine: selectedMine,
      severity: "Medium",
      confidence: 100,
      gps: "22.3588, 82.6792",
      status: "Review",
      note: manualNote || "Manual field note added by the operator for engineer review.",
    };
    setFindings((current) => [finding, ...current]);
    setSelectedFinding(finding);
    setManualTitle("");
    setManualNote("");
    toast.success("Finding added to review queue", { description: "The item is tagged as operator-entered evidence." });
  };

  const updateFinding = (status: Finding["status"]) => {
    setFindings((current) => current.map((finding) => finding.id === selectedFinding.id ? { ...finding, status } : finding));
    setSelectedFinding((current) => ({ ...current, status }));
    toast.success(`Finding ${status.toLowerCase()}`, { description: `${selectedFinding.id} is now in the accountable action trail.` });
  };

  const exportMission = () => {
    const payload = { mission: "Kusmunda North Ramp / 001", mine: selectedMine, mode: demoFeed ? "Simulator (labeled mock output)" : "Operator input", telemetry, findings, exportedAt: new Date().toISOString() };
    downloadText("minepulse-drone-mission.json", JSON.stringify(payload, null, 2), "application/json");
    toast.success("Mission bundle exported", { description: "Telemetry, findings, and review status are included." });
  };

  return <div className="drone-command">
    <section className="drone-mission-strip">
      <div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--green" /> COAL MINE DRONE INTELLIGENCE · SIH PS24</div><h2>Kusmunda north ramp / mission 001</h2><p>Drone reconnaissance, geo-tagged risk detection, and accountable field action in one evidence chain.</p></div>
      <div className="drone-mission-actions"><label className="drone-select-label">Mine<select value={selectedMine} onChange={(event) => setSelectedMine(event.target.value)}><option>Kusmunda OC</option><option>Gevra OC</option><option>Dipka OC</option><option>Jayant</option><option>Nigahi</option></select></label><button className="button button--secondary" onClick={exportMission}><Download size={14} /> Export mission</button><button className="button button--primary" onClick={() => setMissionRunning((value) => !value)}>{missionRunning ? <Pause size={14} /> : <Play size={14} />} {missionRunning ? "Pause mission" : "Resume mission"}</button></div>
    </section>

    <section className="drone-stat-grid" aria-label="Drone mission summary">
      <article className="drone-stat drone-stat--live"><span><Radio size={15} /> Mission status</span><strong>{missionRunning ? (streamConnected ? `LIVE · ${streamMode.toUpperCase()}` : "INPUT DISCONNECTED") : "PAUSED"}</strong><small>{demoFeed ? "Mock feed clearly labeled" : "Operator input connected"}</small></article>
      <article className="drone-stat"><span><Activity size={15} /> Telemetry</span><strong>{telemetry.altitude} m · {telemetry.speed} m/s</strong><small>Altitude / ground speed · GPS locked</small></article>
      <article className="drone-stat"><span><Wifi size={15} /> Battery</span><strong>{telemetry.battery}%</strong><small>Estimated 18 min flight time</small></article>
      <article className="drone-stat"><span><Crosshair size={15} /> Findings</span><strong>{findings.length} detected</strong><small>2 high-priority · 1 assigned</small></article>
      <article className="drone-stat"><span><FileText size={15} /> Research inputs</span><strong>{researchedSources.length} linked</strong><small>9 source URLs · provenance tracked</small></article>
    </section>

    <section className="panel drone-source-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--blue" /> SOURCE EVIDENCE MESH · 9 USER-SUPPLIED LINKS</div><h2>Research inputs are visible, attributable, and reviewable</h2><p className="drone-section-note">The catalog uses verified page metadata and descriptions only. Sources are selectable inputs for the simulator and operator-review workflow; they do not become automated safety findings.</p></div><span className="evidence-tag">PROVENANCE ON</span></div><div className="drone-source-strip">{researchedSources.map((source) => <button key={source.id} className={`drone-source-chip ${selectedSource.id === source.id ? "is-selected" : ""}`} onClick={() => setSelectedSource(source)}><span>{source.id}</span><strong>{source.short}</strong><small>{source.kind.split(" · ")[0]}</small></button>)}</div><div className="drone-source-detail"><div className="drone-source-detail-main"><span className="panel-kicker">SELECTED RESEARCH OUTPUT · {selectedSource.id}</span><h3>{selectedSource.title}</h3><p>{selectedSource.fact}</p><div className="drone-source-tags"><span>Input role: {selectedSource.role}</span><span>Output: operator-review example</span><span>Not live telemetry</span></div></div><a className="button button--secondary" href={selectedSource.url} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={14} /></a></div></section>

    <section className="panel drone-stream-console"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--red" /> LIVE STREAM CONTROL ROOM</div><h2>Connect footage → detect → recommend action</h2><p className="drone-section-note">Choose a video input below. The simulator produces labeled mock detections and solution recommendations so the complete operating workflow is visible before production inference is connected.</p></div><span className={`drone-live-badge ${streamConnected ? "" : "is-off"}`}><span /> {streamConnected ? "STREAM READY" : "DISCONNECTED"}</span></div><div className="drone-stream-controls"><label>Footage input<select value={streamMode} onChange={(event) => { setStreamMode(event.target.value); setStreamConnected(false); }}><option>Simulator flight</option><option>Uploaded drone footage</option><option>RGB camera input</option><option>Thermal camera input</option><option>Research reference · Tunnel machinery</option><option>Research reference · Nimcha UG visit</option><option>Research reference · Singareni mines</option></select></label><label>Detection profile<select defaultValue="Coal mine safety v0.9"><option>Coal mine safety v0.9</option><option>Haul-road + berms</option><option>Dust + water + environment</option><option>Worker + restricted zones</option></select></label><button className="button button--primary" onClick={() => { setStreamConnected(true); setMissionRunning(true); setDemoFeed(true); toast.success("Stream connected", { description: `${streamMode} is now feeding the labeled mock inference pipeline.` }); }}><Radio size={14} /> {streamConnected ? "Reconnect stream" : "Connect stream"}</button></div><div className="drone-stream-health"><span><i className="status-dot status-dot--green" /> Ingest <b>24 FPS</b></span><span><i className="status-dot status-dot--green" /> Latency <b>184 ms</b></span><span><i className="status-dot status-dot--green" /> GPS lock <b>94%</b></span><span><i className="status-dot status-dot--green" /> Frames analyzed <b>{telemetry.frames.toLocaleString()}</b></span><span><i className="status-dot status-dot--amber" /> Mock confidence <b>{analysisTick}%</b></span></div></section>

    <section className="drone-top-grid">
      <article className="panel drone-feed-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--red" /> 01 / INGEST & LIVESTREAM</div><h2>One flight. Every coal-mine lens.</h2></div><span className="drone-live-badge"><span /> {cameraActive ? "CAMERA INPUT" : demoFeed ? "MOCK FEED" : "MEDIA STAGED"}</span></div>
        <div className="drone-video-frame">
          <div className="drone-video-grid" />
          {cameraActive ? <video ref={videoRef} autoPlay muted playsInline className="drone-camera" /> : <><div className="drone-pit-silhouette"><span className="drone-slope drone-slope--one" /><span className="drone-slope drone-slope--two" /><span className="drone-haul-road" /><span className="drone-detection-box drone-detection-box--one">D-104 · edge erosion <b>94%</b></span><span className="drone-detection-box drone-detection-box--two">D-103 · dust plume <b>88%</b></span></div><div className="drone-video-caption">{demoFeed ? `SIMULATOR / RESEARCH CONTEXT: ${selectedSource.short}` : uploadedFile ? uploadedFile : `RESEARCH INPUT STAGED: ${selectedSource.short}`}</div></>}
          <div className="drone-video-hud"><span>REC <i /></span><span>GPS 22.3591, 82.6824</span><span>FRAME {telemetry.frames.toLocaleString()}</span></div>
        </div>
        <div className="drone-ingest-row"><label className="button button--secondary drone-file-button"><Upload size={14} /> Choose footage<input type="file" accept="video/*,.mp4,.mov" onChange={(event) => handleFile(event.target.files?.[0])} /></label><button className="button button--secondary" onClick={cameraActive ? stopCamera : startCamera}>{cameraActive ? <Square size={14} /> : <Camera size={14} />} {cameraActive ? "Disconnect camera" : "Connect camera"}</button><button className="button button--primary" onClick={() => { setDemoFeed(true); setMissionRunning(true); toast.success("Simulator mission restarted", { description: "Mock RGB frames and telemetry are flowing." }); }}><RefreshCw size={14} /> Run simulator</button></div>
        <div className="drone-stream-url"><span>Optional live stream endpoint · {selectedSource.id} staged</span><input value={streamUrl} onChange={(event) => setStreamUrl(event.target.value)} placeholder="rtsp://drone-gateway.local/mission-001" /><button onClick={stageStreamEndpoint}><Check size={14} /> Stage input</button></div>
      </article>

      <article className="panel drone-pipeline-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--blue" /> 02 / PIPELINE STATUS</div><h2>Worker pipeline</h2></div><span className="drone-pipeline-percent">86%</span></div><div className="drone-progress"><span style={{ width: "86%" }} /></div><div className="drone-pipeline-steps"><div className="is-done"><CheckCircle2 size={15} /><span>Input received<small>video + GPS metadata</small></span><b>done</b></div><div className="is-done"><CheckCircle2 size={15} /><span>Frame analysis<small>coal-mine model v0.9</small></span><b>done</b></div><div className="is-active"><Activity size={15} /><span>Findings normalized<small>severity + confidence + GPS</small></span><b>live</b></div><div><ShieldCheck size={15} /><span>Engineer decision<small>human checkpoint required</small></span><b>queued</b></div></div><div className="drone-pipeline-note"><AlertTriangle size={15} /><span>AI is advisory. No flight commands or automatic safety clearance are issued from this workspace.</span></div></article>
    </section>

    <section className="panel drone-modules-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--purple" /> 03 / ENABLED MODULES</div><h2>Coal-mine inspection lenses</h2><p className="drone-section-note">Outputs are pre-populated from the supplied source research so every module has a visible example to review.</p></div><span className="module-count">6 / 6 ready</span></div><div className="drone-module-grid">{modules.map(([label, detail, Icon]) => <button className="drone-module" key={label as string} onClick={() => toast.success(`${label} ready`, { description: `${detail} input is configured for this mission.` })}><span className="drone-module-icon"><Icon size={16} /></span><span><strong>{label}</strong><small>{detail}</small></span><Check size={14} /></button>)}</div></section>

    <section className="drone-analysis-grid">
      <article className="panel drone-findings-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--amber" /> 04 / SIGNAL LEDGER</div><h2>Detection & action queue</h2></div><span className="evidence-tag">RESEARCH + VIDEO</span></div><div className="drone-findings-list">{findings.map((finding) => <button key={finding.id} className={`drone-finding-row ${selectedFinding.id === finding.id ? "is-selected" : ""}`} onClick={() => setSelectedFinding(finding)}><span className={`severity-dot severity-dot--${finding.severity.toLowerCase()}`} /><span className="drone-finding-copy"><strong>{finding.id} · {finding.label}</strong><small>{finding.mine} · {finding.gps}</small></span><span className="drone-finding-meta"><b>{finding.confidence}%</b><small>{finding.status}</small></span><span className={`status-label status-label--${finding.severity === "Critical" ? "red" : finding.severity === "High" ? "amber" : finding.severity === "Medium" ? "blue" : "green"}`}>{finding.severity}</span></button>)}</div><div className="drone-selected-finding"><div><span className="panel-kicker">SELECTED FINDING · OPERATOR CHECKPOINT</span><h3>{selectedFinding.label}</h3><p>{selectedFinding.note}</p></div><div className="drone-finding-facts"><span><b>{selectedFinding.confidence}%</b> confidence</span><span><b>{selectedFinding.gps}</b> GPS</span><span><b>{selectedFinding.status}</b> review state</span></div><div className="drone-review-actions"><button className="button button--secondary" onClick={() => updateFinding("Assigned")}><MapPin size={14} /> Assign owner</button><button className="button button--primary" onClick={() => updateFinding("Closed")}><Check size={14} /> Approve closure</button></div></div></article>

      <article className="panel drone-map-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--green" /> 05 / GEO-SPATIAL WORKBENCH</div><h2>Live defect field</h2></div><span className="last-sync"><MapPin size={13} /> GPS synced</span></div><div className="drone-map"><div className="drone-map-grid" /><div className="drone-map-boundary" /><div className="drone-map-route" /><span className="map-label map-label--one">Kusmunda pit 04</span><span className="map-label map-label--two">crusher</span>{findings.slice(0, 4).map((finding, index) => <button key={finding.id} className={`drone-map-pin drone-map-pin--${finding.severity.toLowerCase()}`} style={{ left: `${25 + index * 18}%`, top: `${35 + (index % 2) * 25}%` }} onClick={() => setSelectedFinding(finding)} aria-label={`Select ${finding.id}`}>{index + 1}</button>)}<div className="drone-map-legend"><span><i className="legend-dot legend-dot--red" /> High</span><span><i className="legend-dot legend-dot--amber" /> Medium</span><span><i className="legend-dot legend-dot--green" /> Closed</span></div></div><div className="drone-map-footer"><span><b>4</b> GPS findings</span><span><b>2.8 km</b> flight path</span><span><b>94%</b> GPS quality</span></div></article>
    </section>

    <section className="drone-insight-grid"><article className="panel drone-graph-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--blue" /> MOCK DETECTION TELEMETRY</div><h2>Risk signals across the flight</h2></div><span className="evidence-tag">SIMULATED OUTPUT</span></div><div className="drone-chart-legend"><span><i className="legend-line legend-line--lime" /> Safety coverage</span><span><i className="legend-line legend-line--red" /> Risk signals</span><span><i className="legend-line legend-line--blue" /> Confidence</span></div><div className="drone-line-chart"><div className="chart-grid" /><svg viewBox="0 0 520 160" preserveAspectRatio="none"><path d="M0 118 C35 112 48 92 75 102 S116 82 145 95 S182 110 210 76 S252 96 278 72 S315 60 344 84 S380 78 408 52 S450 65 520 30" fill="none" stroke="#b8e86a" strokeWidth="3" /><path d="M0 138 C42 132 58 142 90 120 S130 130 164 114 S195 132 225 100 S272 124 300 92 S336 116 366 90 S406 110 438 70 S478 92 520 66" fill="none" stroke="#ef765f" strokeWidth="2.5" strokeDasharray="5 5" /><path d="M0 82 C40 78 62 88 92 68 S135 82 165 62 S214 72 244 54 S288 68 320 48 S370 52 398 40 S452 54 520 26" fill="none" stroke="#7ebfe7" strokeWidth="2" /></svg><div className="chart-x-labels"><span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span></div></div><div className="drone-chart-metrics"><span><b>96.2%</b> route coverage</span><span><b>7</b> risk events</span><span><b>89%</b> mean confidence</span></div></article><article className="panel drone-solution-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--green" /> MOCK SOLUTION ENGINE</div><h2>Suggested next actions</h2></div><span className="evidence-tag">HUMAN APPROVAL</span></div><div className="drone-solution-list"><div><span className="solution-icon solution-icon--red"><AlertTriangle size={15} /></span><span><strong>Haul-road edge erosion</strong><small>Assign berm inspection · close route if confirmed</small></span><b>HIGH</b></div><div><span className="solution-icon solution-icon--amber"><Zap size={15} /></span><span><strong>Crusher dust plume</strong><small>Increase water-spray cycle · review PM trend</small></span><b>MED</b></div><div><span className="solution-icon solution-icon--blue"><MapPin size={15} /></span><span><strong>Standing water on bench</strong><small>Dispatch drainage crew · add warning marker</small></span><b>MED</b></div><div><span className="solution-icon solution-icon--lime"><CheckCircle2 size={15} /></span><span><strong>Restricted zone intrusion</strong><small>Verify access log · retain evidence packet</small></span><b>LOW</b></div></div><button className="panel-link" onClick={() => toast.success("Solution packet staged", { description: "Four mock recommendations are ready for engineer approval." })}>Stage solution packet <ArrowUpRight size={14} /></button></article></section>

    <section className="drone-scale-grid"><article className="panel drone-scale-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--purple" /> SCALE PLAN</div><h2>From one drone to a mine network</h2></div><span className="evidence-tag">CAPACITY MODEL</span></div><div className="drone-scale-kpis"><div><span><Gauge size={14} /> Current</span><b>1</b><small>drone / 1 mine</small></div><div><span><Layers size={14} /> Phase 2</span><b>12</b><small>drones / 6 mines</small></div><div><span><Server size={14} /> Network</span><b>48</b><small>streams / control room</small></div><div><span><TrendingUp size={14} /> Annual</span><b>2.1M</b><small>frames / day</small></div></div><div className="drone-capacity-bars"><div><span>Ingest gateway</span><b>82%</b><i><em style={{width:"82%"}} /></i></div><div><span>Inference workers</span><b>64%</b><i><em style={{width:"64%"}} /></i></div><div><span>Evidence storage</span><b>41%</b><i><em style={{width:"41%"}} /></i></div></div></article><article className="panel drone-cost-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--amber" /> COST MODEL · MOCK ESTIMATE</div><h2>Predictable cost per mine</h2></div><span className="evidence-tag">PLANNING ONLY</span></div><div className="drone-cost-total"><span>Estimated monthly operating cost</span><b>₹1.84L</b><small>for 2 drones, 8h/day, 6 mines · mock planning estimate</small></div><div className="drone-cost-breakdown"><span><b>42%</b> Inference + GPU <i><em style={{width:"42%"}} /></i></span><span><b>24%</b> Storage + evidence <i><em style={{width:"24%"}} /></i></span><span><b>19%</b> Connectivity <i><em style={{width:"19%"}} /></i></span><span><b>15%</b> Support + review <i><em style={{width:"15%"}} /></i></span></div><button className="button button--secondary" onClick={() => downloadText("minepulse-cost-model.csv", "component,share,monthly_inr\nInference + GPU,42%,77280\nStorage + evidence,24%,44160\nConnectivity,19%,34960\nSupport + review,15%,27600\nTotal,100%,184000\n") }><DollarSign size={14} /> Export cost model</button></article></section>

    <section className="drone-bottom-grid"><article className="panel drone-form-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--blue" /> 06 / OPERATOR INPUT</div><h2>Add a field finding</h2></div><span className="evidence-tag">AUDITABLE</span></div><div className="drone-prefill"><span><Check size={13} /> Example input preloaded</span><b>Loose overburden at bench edge</b><small>Derived from operator-review pattern; not an automatic detection.</small></div><form onSubmit={addManualFinding}><label>Finding title<input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} placeholder="e.g. Loose overburden at bench edge" required /></label><label>Site context<select value={selectedMine} onChange={(event) => setSelectedMine(event.target.value)}><option>Kusmunda OC</option><option>Gevra OC</option><option>Dipka OC</option><option>Jayant</option><option>Nigahi</option></select></label><label>Operator note<textarea value={manualNote} onChange={(event) => setManualNote(event.target.value)} rows={3} placeholder="Describe the observation, immediate control, and evidence reference..." /></label><div className="form-meta"><span><MapPin size={13} /> GPS auto-attached</span><span><FileText size={13} /> Mock output included</span></div><button className="button button--primary" type="submit"><Upload size={14} /> Add to review queue</button></form></article><article className="panel drone-report-panel"><div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--purple" /> 07 / EVIDENCE & REPORT</div><h2>Ready for accountable action</h2></div><button className="button button--secondary" onClick={exportMission}><Download size={14} /> JSON bundle</button></div><div className="drone-report-card"><div className="drone-report-icon"><FileText size={18} /></div><div><strong>Mission evidence packet</strong><p>Includes {findings.length} findings, {telemetry.frames.toLocaleString()} analyzed frames, GPS path, confidence scores, source provenance, solution recommendations, and engineer review states.</p></div><span className="status-label status-label--green">READY</span></div><div className="drone-report-checks"><span><CheckCircle2 size={14} /> Video source recorded</span><span><CheckCircle2 size={14} /> GPS telemetry attached</span><span><CheckCircle2 size={14} /> Human decision required</span><span><CheckCircle2 size={14} /> Exportable audit trail</span></div><div className="drone-report-callout"><ShieldCheck size={16} /><span><b>Production boundary:</b> connect an authenticated inference worker and private object storage before using real operational records. This preview intentionally labels simulator detections.</span></div></article></section>

    <div className="drone-disclaimer"><span><AlertTriangle size={14} /> Demo data is labeled. Never use simulator findings as a safety clearance.</span><button onClick={() => toast.info("MinePulse PS24 operating boundary", { description: "Coal-only workflow: drone evidence informs human-reviewed safety, environment, and haul-road actions." })}>Read operating boundary <X size={13} /></button></div>
  </div>;
}
