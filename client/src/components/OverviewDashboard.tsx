import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowUpRight, BookOpenCheck, CalendarDays, ClipboardList, Database, ExternalLink, FileText, MapPin, Target } from "lucide-react";
import {
  coalDashboardSource,
  mineOutputSource,
  publicMineOutputs,
  subsidiaryProduction,
  type PublicMineOutput,
} from "../lib/public-coal-data";

type OverviewDashboardProps = {
  searchQuery: string;
  observationCount: number;
  reportCount: number;
  pendingSyncCount: number;
  onLogObservation: () => void;
  onNavigate: (label: string) => void;
};

const gridVariants = {
  hidden: {},
  visible: { transition: { delayChildren: 0.05, staggerChildren: 0.075 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.985, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 260, damping: 26, mass: 0.72 },
  },
};

function AnimatedNumber({ value, digits = 2 }: { value: number; digits?: number }) {
  const valueMotion = useMotionValue(0);
  const spring = useSpring(valueMotion, { stiffness: 105, damping: 24, mass: 0.7 });
  const display = useTransform(spring, (latest) => new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(latest));
  useEffect(() => { valueMotion.set(value); }, [valueMotion, value]);
  return <motion.span>{display}</motion.span>;
}

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return <a className="public-source-link" href={href} target="_blank" rel="noreferrer">{children}<ExternalLink size={13} aria-hidden="true" /></a>;
}

function MineOutputRow({ mine, index, maxTarget, selected, onSelect }: {
  mine: PublicMineOutput;
  index: number;
  maxTarget: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const actualWidth = mine.outputMt === null ? 0 : (mine.outputMt / maxTarget) * 100;
  const targetWidth = mine.annualTargetMt === null ? null : (mine.annualTargetMt / maxTarget) * 100;

  return (
    <motion.button
      type="button"
      layout="position"
      className={`public-mine-row ${selected ? "is-selected" : ""} ${mine.outputMt === null ? "is-unreported" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 26, delay: index * 0.045 }}
      whileHover={{ x: 3 }}
    >
      <span className="public-mine-row__name">
        <strong>{mine.name}</strong>
        <small>{mine.operator} · {mine.location}</small>
      </span>
      <span className="public-bar-track" aria-hidden="true">
        {targetWidth !== null && <span className="public-target-marker" style={{ left: `${targetWidth}%` }} />}
        <motion.span className="public-bar-fill" initial={{ width: 0 }} animate={{ width: `${actualWidth}%` }} transition={{ type: "spring", stiffness: 72, damping: 18, delay: 0.18 + index * 0.06 }} />
      </span>
      <strong className="public-mine-row__value">{mine.outputMt === null ? "Not listed" : <><AnimatedNumber value={mine.outputMt} /> <span>MT</span></>}</strong>
      <span className="public-mine-row__chevron"><ArrowUpRight size={15} /></span>
    </motion.button>
  );
}

export default function OverviewDashboard({ searchQuery, observationCount, reportCount, pendingSyncCount, onLogObservation, onNavigate }: OverviewDashboardProps) {
  const [selectedMineName, setSelectedMineName] = useState(publicMineOutputs[0].name);
  const filteredMines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return publicMineOutputs.filter((mine) => !query || `${mine.name} ${mine.officialName} ${mine.operator} ${mine.location}`.toLowerCase().includes(query));
  }, [searchQuery]);
  const selectedMine = useMemo(
    () => filteredMines.find((mine) => mine.name === selectedMineName) ?? filteredMines[0] ?? publicMineOutputs[0],
    [filteredMines, selectedMineName],
  );
  const maxTarget = Math.max(...publicMineOutputs.map((mine) => mine.annualTargetMt ?? 0));

  return (
    <div className="public-dashboard">
      <motion.section className="public-snapshot-intro" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 220, damping: 25 }}>
        <div>
          <div className="public-intro-kicker"><Database size={14} /> PUBLIC REFERENCE SNAPSHOT <span>·</span> NOT LIVE TELEMETRY</div>
          <h2>Production, with provenance.</h2>
          <p>Official coal-production snapshots are separated from the field records your team creates in MinePulse.</p>
        </div>
        <div className="public-asof-chip"><CalendarDays size={15} /><span>Current snapshot</span><strong>{coalDashboardSource.asOf}</strong></div>
      </motion.section>

      <motion.section className="metric-grid public-kpi-grid" aria-label="Public production summary" variants={gridVariants} initial="hidden" animate="visible">
        {subsidiaryProduction.map((record, index) => {
          const tones = ["lime", "amber", "blue"] as const;
          const tone = tones[index] ?? "lime";
          return (
            <motion.article key={record.shortName} layout variants={cardVariants} whileHover={{ y: -4, scale: 1.008 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className={`metric-card public-kpi-card ${index === 0 ? "metric-card--featured" : ""}`}>
              <div className="metric-card__top">
                <span className={`metric-icon metric-icon--${tone}`}><Database size={17} /></span>
                <span className="public-source-chip">YTD · MT</span>
              </div>
              <div className="metric-value"><AnimatedNumber value={record.actualMt} />{" "}<span>MT</span></div>
              <div className="metric-label">{record.shortName} production</div>
              <div className="public-kpi-detail">
                <div className="public-progress-track"><motion.span initial={{ width: 0 }} animate={{ width: `${Math.min(record.achievedPercent, 100)}%` }} transition={{ type: "spring", stiffness: 70, damping: 18, delay: 0.35 + index * 0.08 }} /></div>
                <span>{record.achievedPercent.toFixed(1)}% of {record.ytdTargetMt.toFixed(2)} MT YTD target</span>
              </div>
            </motion.article>
          );
        })}
        <motion.article layout variants={cardVariants} whileHover={{ y: -4, scale: 1.008 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="metric-card public-kpi-card public-date-card">
          <div className="metric-card__top"><span className="metric-icon metric-icon--purple"><CalendarDays size={17} /></span><span className="public-source-chip">SOURCE DATE</span></div>
          <div className="public-date-value">26<span>SEP</span></div>
          <div className="metric-label">Latest available CIL dashboard snapshot</div>
          <div className="public-kpi-detail"><span>FY 2026–27 · year to date</span><SourceLink href={coalDashboardSource.url}>Open source</SourceLink></div>
        </motion.article>
      </motion.section>

      <section className="public-overview-grid">
        <article className="panel public-production-panel">
          <div className="panel-header">
            <div><div className="panel-kicker"><span className="panel-kicker__dot" /> MINE-WISE OUTPUT</div><h2>Five reported sites, one honest gap</h2></div>
            <span className="public-period-chip">FY 2024–25 · provisional</span>
          </div>
          <div className="public-chart-legend"><span><i className="public-legend-actual" /> Reported output</span><span><i className="public-legend-target" /> Annual target</span><span className="public-chart-unit">MT · million tonnes</span></div>
          <div className="public-mine-list" aria-label="Mine-wise annual production values">
            {filteredMines.length ? filteredMines.map((mine, index) => (
              <MineOutputRow key={mine.name} mine={mine} index={index} maxTarget={maxTarget} selected={selectedMine.name === mine.name} onSelect={() => setSelectedMineName(mine.name)} />
            )) : <div className="public-mine-filter-empty"><strong>No public mine matches “{searchQuery.trim()}”</strong><span>Search a site name, operator, or location.</span></div>}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={selectedMine.name} className="public-mine-detail" initial={{ opacity: 0, height: 0, y: 5 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -3 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              <div className="public-mine-detail__copy">
                <span className="public-detail-label"><MapPin size={13} /> SELECTED REFERENCE SITE</span>
                <strong>{selectedMine.officialName}</strong>
                <small>{selectedMine.outputMt === null ? selectedMine.reportingNote : `${selectedMine.reportingNote} ${selectedMine.sourceRow} in the Ministry table.`}</small>
              </div>
              <div className="public-mine-detail__value">
                <span>FY output</span>
                <strong>{selectedMine.outputMt === null ? "Not reported" : <><AnimatedNumber value={selectedMine.outputMt} /> MT</>}</strong>
                {selectedMine.outputMt !== null && selectedMine.annualTargetMt !== null && <small>{selectedMine.achievedPercent?.toFixed(2)}% of {selectedMine.annualTargetMt.toFixed(2)} MT annual target</small>}
              </div>
              <SourceLink href={mineOutputSource.url}>Open PDF · p. 11</SourceLink>
            </motion.div>
          </AnimatePresence>
          <div className="public-table-note"><Target size={14} /><span>Bars compare actual output with the published annual target. Sohagpur has no site-specific row in this Top-35 table; it is not treated as zero.</span></div>
        </article>

        <article className="panel public-workspace-panel">
          <div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--blue" /> YOUR MINEPULSE WORKSPACE</div><h2>Team records</h2></div><ClipboardList size={18} className="public-workspace-icon" /></div>
          <p className="public-workspace-intro">Public production figures do not create operational records. Reports and observations appear here after your team enters them.</p>
          <div className="public-record-grid">
            <div><span>Observations</span><strong><AnimatedNumber value={observationCount} digits={0} /></strong></div>
            <div><span>Reports</span><strong><AnimatedNumber value={reportCount} digits={0} /></strong></div>
          </div>
          <div className="public-sync-state"><span className={`status-dot ${pendingSyncCount > 0 ? "status-dot--amber" : "status-dot--green"}`} /><span>{pendingSyncCount > 0 ? `${pendingSyncCount} record${pendingSyncCount === 1 ? "" : "s"} waiting to sync` : "No records waiting to sync"}</span></div>
          {observationCount === 0 && reportCount === 0 ? <div className="public-empty-state"><strong>No team entries yet</strong><span>This is an empty workspace—not missing public data.</span></div> : <div className="public-empty-state"><strong>Workspace records are active</strong><span>Operational records stay separate from public production snapshots.</span></div>}
          <div className="public-workspace-actions"><button className="button button--primary" onClick={onLogObservation}><MapPin size={15} /> Log observation</button><button className="button button--secondary" onClick={() => onNavigate("Reports")}><FileText size={15} /> View reports</button></div>
        </article>
      </section>

      <section className="public-source-strip">
        <div className="public-source-strip__heading"><BookOpenCheck size={17} /><span><strong>Source notes</strong><small>Period and scope are shown with every reference figure.</small></span></div>
        <div className="public-source-strip__item"><span>CIL / SECL / NCL</span><strong>FY 2026–27 YTD to 26 Sep 2026</strong><SourceLink href={coalDashboardSource.url}>Ministry of Coal dashboard</SourceLink></div>
        <div className="public-source-strip__item"><span>Mine-wise output</span><strong>FY 2024–25 · provisional</strong><SourceLink href={mineOutputSource.url}>Ministry monthly statistics · p. 11</SourceLink></div>
      </section>
    </div>
  );
}
