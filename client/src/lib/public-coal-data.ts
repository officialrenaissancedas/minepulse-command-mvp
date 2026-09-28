export const coalDashboardSource = {
  title: "Ministry of Coal dashboard — Coal Production: Year (YTD)",
  url: "https://apps.coalindia.in/ords/f?p=119:2:::::P2_SUB_CODE:CIL:",
  asOf: "26 Sep 2026",
  period: "FY 2026–27, year to date through 26 Sep 2026",
  note: "Source reports company/subsidiary production, not mine-level output or live safety/compliance status.",
} as const;

export const subsidiaryProduction = [
  { name: "Coal India Limited", shortName: "CIL", actualMt: 312.92, ytdTargetMt: 341.31, achievedPercent: 91.68 },
  { name: "South Eastern Coalfields Limited", shortName: "SECL", actualMt: 75.14, ytdTargetMt: 81.94, achievedPercent: 91.70 },
  { name: "Northern Coalfields Limited", shortName: "NCL", actualMt: 56.70, ytdTargetMt: 67.52, achievedPercent: 83.97 },
] as const;

export const mineOutputSource = {
  title: "Ministry of Coal — Monthly Statistics for Mar 2025 (provisional), Top 35 Mines Production table",
  url: "https://coal.nic.in/sites/default/files/2025-04/msg-march25.pdf",
  period: "FY 2024–25, cumulative output to March 2025",
  locator: "PDF page 11, table: “Top 35 Mines Production during Mar’2025 (provisional)”",
  note: "The source marks this mine table provisional. Values are million tonnes (MT). Sites without a row are shown as unreported in this table, not as zero output.",
} as const;

export type PublicMineOutput = {
  name: string;
  officialName: string;
  operator: "SECL" | "NCL";
  location: string;
  outputMt: number | null;
  annualTargetMt: number | null;
  achievedPercent: number | null;
  sourceRow: string | null;
  reportingNote: string;
};

export const publicMineOutputs: readonly PublicMineOutput[] = [
  {
    name: "Gevra OC",
    officialName: "GEVRA OC",
    operator: "SECL",
    location: "Korba · Chhattisgarh",
    outputMt: 56.03,
    annualTargetMt: 63.00,
    achievedPercent: 88.95,
    sourceRow: "Row 18",
    reportingNote: "Official mine-wise row; provisional FY cumulative.",
  },
  {
    name: "Dipka OC",
    officialName: "DIPKA OC",
    operator: "SECL",
    location: "Korba · Chhattisgarh",
    outputMt: 33.52,
    annualTargetMt: 40.00,
    achievedPercent: 83.82,
    sourceRow: "Row 20",
    reportingNote: "Official mine-wise row; provisional FY cumulative.",
  },
  {
    name: "Kusmunda",
    officialName: "KUSUMUNDA OC",
    operator: "SECL",
    location: "Korba · Chhattisgarh",
    outputMt: 28.43,
    annualTargetMt: 52.00,
    achievedPercent: 54.68,
    sourceRow: "Row 19",
    reportingNote: "Official mine-wise row; provisional FY cumulative.",
  },
  {
    name: "Sohagpur",
    officialName: "Sohagpur reference area",
    operator: "SECL",
    location: "Umaria · Madhya Pradesh",
    outputMt: null,
    annualTargetMt: null,
    achievedPercent: null,
    sourceRow: null,
    reportingNote: "No site-specific row for this reference area was found in the published Top 35 table; this does not mean zero production.",
  },
  {
    name: "Jayant",
    officialName: "JAYANT OC MINE",
    operator: "NCL",
    location: "Singrauli · Madhya Pradesh",
    outputMt: 29.99,
    annualTargetMt: 30.00,
    achievedPercent: 100.00,
    sourceRow: "Row 9",
    reportingNote: "Official mine-wise row; provisional FY cumulative.",
  },
  {
    name: "Nigahi",
    officialName: "NIGAHI OC MINE",
    operator: "NCL",
    location: "Singrauli · Madhya Pradesh",
    outputMt: 25.00,
    annualTargetMt: 25.00,
    achievedPercent: 100.04,
    sourceRow: "Row 11",
    reportingNote: "Official mine-wise row; provisional FY cumulative.",
  },
] as const;
