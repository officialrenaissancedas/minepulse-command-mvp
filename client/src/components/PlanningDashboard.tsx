import { useEffect, useMemo, useState } from "react";
import { Activity, Calculator, Download, Gauge, HardDrive, Landmark, RotateCcw, UsersRound } from "lucide-react";
import { toast } from "sonner";
import {
  calculateCostSummary,
  clampPlanningInputs,
  EXAMPLE_INPUTS,
  projectScale,
  type PlanningInputs,
} from "../lib/planning";

const STORAGE_KEY = "minepulse-planning-inputs-v1";
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const wholeNumber = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

type Tab = "cost" | "scale";

function readInputs(): PlanningInputs {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? clampPlanningInputs({ ...EXAMPLE_INPUTS, ...JSON.parse(saved) }) : EXAMPLE_INPUTS;
  } catch {
    return EXAMPLE_INPUTS;
  }
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  help,
  min = 0,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="planning-field">
      <span>{label}</span>
      <span className="planning-input-wrap">
        <input type="number" inputMode="decimal" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        {suffix && <small>{suffix}</small>}
      </span>
      {help && <small className="planning-help">{help}</small>}
    </label>
  );
}

function Metric({ icon: Icon, label, value, note, tone = "lime" }: { icon: typeof Calculator; label: string; value: string; note: string; tone?: string }) {
  return (
    <article className="planning-metric">
      <div className={`planning-metric-icon planning-tone--${tone}`}><Icon size={17} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function exportScenario(inputs: PlanningInputs, rows: ReturnType<typeof projectScale>) {
  const lines = [
    ["MinePulse planning model", "Illustrative assumptions only; replace with measured data and provider quotes"],
    ["Input", "Value"],
    ...Object.entries(inputs),
    [],
    ["Year", "Mines", "Users", "Reports/month", "Evidence added GB/year", "Cumulative evidence GB", "Annual costs INR", "Value released INR", "Net value INR"],
    ...rows.map((row) => [row.year, row.mines, row.users, row.reportsPerMonth, row.evidenceGbAddedThisYear.toFixed(2), row.cumulativeEvidenceGb.toFixed(2), row.platformCostInr + row.supportCostInr + row.onboardingCostInr, row.valueReleasedInr.toFixed(0), row.netValueInr.toFixed(0)]),
  ].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([lines], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "minepulse-cost-scale-scenario.csv";
  link.click();
  URL.revokeObjectURL(url);
  toast.success("Scenario CSV downloaded");
}

export default function PlanningDashboard() {
  const [tab, setTab] = useState<Tab>("cost");
  const [inputs, setInputs] = useState<PlanningInputs>(readInputs);
  const [saved, setSaved] = useState(true);
  const summary = useMemo(() => calculateCostSummary(inputs), [inputs]);
  const scale = useMemo(() => projectScale(inputs), [inputs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [inputs]);

  const update = (key: keyof PlanningInputs, value: number) => {
    setInputs((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const reset = () => {
    setInputs(EXAMPLE_INPUTS);
    toast.info("Example planning assumptions restored", { description: "Replace these illustrative inputs with your own figures." });
  };

  const maxAnnual = Math.max(1, ...scale.map((row) => row.valueReleasedInr), ...scale.map((row) => row.platformCostInr + row.supportCostInr + row.onboardingCostInr));

  return (
    <div className="planning-workspace">
      <section className="planning-note" role="note">
        <div><strong>Planning model — not live mine data or a vendor quote</strong><p>Every input below is editable and saved only in this browser. The example numbers are illustrative. Use your measured workload, approved labour assumptions, and current Render/Vercel/Supabase quotes before making a budget decision.</p></div>
        <span className={saved ? "planning-saved" : "planning-save-pending"}>{saved ? "Saved in this browser" : "Saving…"}</span>
      </section>

      <div className="planning-toolbar">
        <div className="planning-tabs" role="tablist" aria-label="Planning dashboard">
          <button role="tab" aria-selected={tab === "cost"} className={tab === "cost" ? "is-active" : ""} onClick={() => setTab("cost")}><Calculator size={15} /> Cost model</button>
          <button role="tab" aria-selected={tab === "scale"} className={tab === "scale" ? "is-active" : ""} onClick={() => setTab("scale")}><Gauge size={15} /> Scale forecast</button>
        </div>
        <div className="planning-toolbar-actions">
          <button className="button button--secondary" onClick={reset}><RotateCcw size={14} /> Reset example</button>
          <button className="button button--secondary" onClick={() => exportScenario(inputs, scale)}><Download size={14} /> Export scenario</button>
        </div>
      </div>

      {tab === "cost" ? (
        <>
          <section className="planning-metrics" aria-label="Cost model results">
            <Metric icon={Landmark} label="Value of hours released / year" value={currency.format(summary.annualValueReleasedInr)} note={`${wholeNumber.format(summary.annualHoursReleased)} hours at the entered rate`} />
            <Metric icon={Activity} label="Estimated operating cost / year" value={currency.format(summary.annualOperatingCostInr)} note="Hosting quote + per-mine support" tone="amber" />
            <Metric icon={Calculator} label="One-time onboarding" value={currency.format(summary.oneTimeOnboardingInr)} note="Setup cost × current mine count" tone="blue" />
            <Metric icon={Gauge} label="Net value / year at current scale" value={currency.format(summary.annualNetValueInr)} note={summary.paybackMonths === null ? "No payback at current assumptions" : `Setup payback ≈ ${oneDecimal.format(summary.paybackMonths)} months`} tone="purple" />
          </section>

          <div className="planning-grid">
            <section className="panel planning-panel">
              <div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot" /> EDITABLE INPUTS</div><h2>Current operating assumptions</h2></div></div>
              <div className="planning-form-grid">
                <NumberField label="Mines in scope" value={inputs.currentMines} onChange={(v) => update("currentMines", v)} suffix="sites" min={1} />
                <NumberField label="Manual compliance hours / mine / month" value={inputs.manualHoursPerMinePerMonth} onChange={(v) => update("manualHoursPerMinePerMonth", v)} suffix="hours" step={1} help="Time spent on checks, follow-up, and report preparation." />
                <NumberField label="Loaded staff cost" value={inputs.loadedHourlyCostInr} onChange={(v) => update("loadedHourlyCostInr", v)} suffix="₹ / hour" step={50} />
                <NumberField label="Expected hours released" value={inputs.hoursSavedPercent} onChange={(v) => update("hoursSavedPercent", v)} suffix="%" min={0} max={100} step={5} help="Planning assumption only; validate with a pilot." />
                <NumberField label="Combined platform quote" value={inputs.platformMonthlyCostInr} onChange={(v) => update("platformMonthlyCostInr", v)} suffix="₹ / month" step={1000} help="Enter the current quotes you collect from your hosting/database vendors." />
                <NumberField label="Support per mine" value={inputs.supportPerMineMonthlyInr} onChange={(v) => update("supportPerMineMonthlyInr", v)} suffix="₹ / mine / month" step={500} />
                <NumberField label="Onboarding per mine" value={inputs.onboardingCostPerMineInr} onChange={(v) => update("onboardingCostPerMineInr", v)} suffix="₹ / mine" step={1000} />
              </div>
            </section>

            <section className="panel planning-panel">
              <div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--blue" /> HOW THE MATH WORKS</div><h2>Transparent estimate</h2></div></div>
              <div className="planning-equation"><span>Annual value released</span><b>sites × hours × hourly rate × saved % × 12</b></div>
              <div className="planning-equation"><span>Annual operating estimate</span><b>platform quote × 12 + sites × support × 12</b></div>
              <div className="planning-equation"><span>Net annual value</span><b>value released − operating estimate</b></div>
              <div className="planning-result"><span>First-year estimate after onboarding</span><strong>{currency.format(summary.firstYearNetValueInr)}</strong><small>Excludes taxes, procurement, devices, connectivity, and financing costs.</small></div>
              <p className="planning-footnote">This is a scenario calculator, not a financial forecast, savings guarantee, or provider price list. Replace every starting input with verified site data and written quotes.</p>
            </section>
          </div>
        </>
      ) : (
        <>
          <section className="planning-metrics" aria-label="Scale forecast summary">
            <Metric icon={Landmark} label="Mines at forecast horizon" value={wholeNumber.format(scale.at(-1)?.mines ?? inputs.currentMines)} note={`Starting from ${wholeNumber.format(inputs.currentMines)} sites`} />
            <Metric icon={UsersRound} label="Potential named users" value={wholeNumber.format(scale.at(-1)?.users ?? 0)} note={`${wholeNumber.format(inputs.usersPerMine)} users / mine`} tone="blue" />
            <Metric icon={Activity} label="Reports per month" value={wholeNumber.format(scale.at(-1)?.reportsPerMonth ?? 0)} note="Entered planning volume" tone="amber" />
            <Metric icon={HardDrive} label="Evidence added / month" value={`${oneDecimal.format(scale.at(-1)?.evidenceGbPerMonth ?? 0)} GB`} note="Before compression or deletion" tone="purple" />
          </section>

          <div className="planning-grid planning-grid--scale">
            <section className="panel planning-panel">
              <div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot" /> GROWTH INPUTS</div><h2>Choose a planning horizon</h2></div></div>
              <div className="planning-form-grid">
                <NumberField label="Mines today" value={inputs.currentMines} onChange={(v) => update("currentMines", v)} suffix="sites" min={1} />
                <NumberField label="New mines each year" value={inputs.newMinesPerYear} onChange={(v) => update("newMinesPerYear", v)} suffix="sites / year" />
                <NumberField label="Forecast length" value={inputs.years} onChange={(v) => update("years", v)} suffix="years" min={1} max={10} />
                <NumberField label="Users per mine" value={inputs.usersPerMine} onChange={(v) => update("usersPerMine", v)} suffix="people" />
                <NumberField label="Reports per mine" value={inputs.reportsPerMinePerMonth} onChange={(v) => update("reportsPerMinePerMonth", v)} suffix="/ month" />
                <NumberField label="Average evidence size" value={inputs.evidenceMbPerReport} onChange={(v) => update("evidenceMbPerReport", v)} suffix="MB / report" step={0.1} />
                <NumberField label="Combined platform quote" value={inputs.platformMonthlyCostInr} onChange={(v) => update("platformMonthlyCostInr", v)} suffix="₹ / month" step={1000} />
                <NumberField label="Support per mine" value={inputs.supportPerMineMonthlyInr} onChange={(v) => update("supportPerMineMonthlyInr", v)} suffix="₹ / mine / month" step={500} />
                <NumberField label="Onboarding per mine" value={inputs.onboardingCostPerMineInr} onChange={(v) => update("onboardingCostPerMineInr", v)} suffix="₹ / mine" step={1000} />
              </div>
            </section>

            <section className="panel planning-panel planning-projection-panel">
              <div className="panel-header"><div><div className="panel-kicker"><span className="panel-kicker__dot panel-kicker__dot--purple" /> CAPACITY & VALUE</div><h2>Year-by-year scenario</h2></div></div>
              <p className="planning-footnote">Evidence assumes all reported files are retained, uncompressed. Forecast uses year-end mine count for annual service cost; this is a conservative planning simplification, not a vendor capacity limit.</p>
              <div className="planning-chart" aria-label="Projected annual value and cost comparison">
                {scale.map((row) => {
                  const costs = row.platformCostInr + row.supportCostInr + row.onboardingCostInr;
                  return <div className="planning-chart-row" key={row.year}>
                    <div className="planning-chart-label"><strong>Year {row.year}</strong><span>{row.mines} mines · {currency.format(row.netValueInr)} net</span></div>
                    <div className="planning-chart-bars"><span className="planning-bar planning-bar--value" style={{ width: `${Math.max(1, row.valueReleasedInr / maxAnnual * 100)}%` }} title={`Value released ${currency.format(row.valueReleasedInr)}`} /><span className="planning-bar planning-bar--cost" style={{ width: `${Math.max(1, costs / maxAnnual * 100)}%` }} title={`Estimated costs ${currency.format(costs)}`} /></div>
                  </div>;
                })}
                <div className="planning-chart-legend"><span><i className="planning-bar--value" /> Potential value of hours released</span><span><i className="planning-bar--cost" /> Platform, support, onboarding</span></div>
              </div>
              <div className="planning-table-wrap"><table className="planning-table"><thead><tr><th>Year</th><th>Mines</th><th>Users</th><th>Reports / mo</th><th>New evidence / year</th><th>Retained evidence*</th></tr></thead><tbody>{scale.map((row) => <tr key={row.year}><td>Year {row.year}</td><td>{wholeNumber.format(row.mines)}</td><td>{wholeNumber.format(row.users)}</td><td>{wholeNumber.format(row.reportsPerMonth)}</td><td>{oneDecimal.format(row.evidenceGbAddedThisYear)} GB</td><td>{oneDecimal.format(row.cumulativeEvidenceGb)} GB</td></tr>)}</tbody></table></div>
            </section>
          </div>
          <section className="planning-review"><strong>Scale-up checklist</strong><span>Before adding each mine: verify role-based access and tenant isolation, connectivity/offline sync, backup and restore, evidence retention, alert recipients, and dashboard response times with real workloads.</span></section>
        </>
      )}
    </div>
  );
}
