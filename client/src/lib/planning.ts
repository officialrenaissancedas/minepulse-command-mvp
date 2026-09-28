export type PlanningInputs = {
  currentMines: number;
  newMinesPerYear: number;
  years: number;
  usersPerMine: number;
  reportsPerMinePerMonth: number;
  evidenceMbPerReport: number;
  manualHoursPerMinePerMonth: number;
  loadedHourlyCostInr: number;
  hoursSavedPercent: number;
  platformMonthlyCostInr: number;
  supportPerMineMonthlyInr: number;
  onboardingCostPerMineInr: number;
};

export const EXAMPLE_INPUTS: PlanningInputs = {
  currentMines: 6,
  newMinesPerYear: 2,
  years: 3,
  usersPerMine: 250,
  reportsPerMinePerMonth: 150,
  evidenceMbPerReport: 1,
  manualHoursPerMinePerMonth: 120,
  loadedHourlyCostInr: 350,
  hoursSavedPercent: 30,
  platformMonthlyCostInr: 20000,
  supportPerMineMonthlyInr: 4000,
  onboardingCostPerMineInr: 25000,
};

export type CostSummary = {
  annualManualWorkValueInr: number;
  annualHoursReleased: number;
  annualValueReleasedInr: number;
  annualPlatformCostInr: number;
  annualSupportCostInr: number;
  annualOperatingCostInr: number;
  oneTimeOnboardingInr: number;
  annualNetValueInr: number;
  firstYearNetValueInr: number;
  costPerMineMonthlyInr: number;
  paybackMonths: number | null;
};

export function clampPlanningInputs(input: PlanningInputs): PlanningInputs {
  return {
    currentMines: Math.max(1, Math.min(10000, Math.round(input.currentMines || 1))),
    newMinesPerYear: Math.max(0, Math.min(10000, Math.round(input.newMinesPerYear || 0))),
    years: Math.max(1, Math.min(10, Math.round(input.years || 1))),
    usersPerMine: Math.max(0, Math.min(1000000, Math.round(input.usersPerMine || 0))),
    reportsPerMinePerMonth: Math.max(0, Math.min(10000000, Math.round(input.reportsPerMinePerMonth || 0))),
    evidenceMbPerReport: Math.max(0, Math.min(100000, Number(input.evidenceMbPerReport) || 0)),
    manualHoursPerMinePerMonth: Math.max(0, Math.min(1000000, Number(input.manualHoursPerMinePerMonth) || 0)),
    loadedHourlyCostInr: Math.max(0, Math.min(100000000, Number(input.loadedHourlyCostInr) || 0)),
    hoursSavedPercent: Math.max(0, Math.min(100, Number(input.hoursSavedPercent) || 0)),
    platformMonthlyCostInr: Math.max(0, Math.min(1000000000, Number(input.platformMonthlyCostInr) || 0)),
    supportPerMineMonthlyInr: Math.max(0, Math.min(1000000000, Number(input.supportPerMineMonthlyInr) || 0)),
    onboardingCostPerMineInr: Math.max(0, Math.min(1000000000, Number(input.onboardingCostPerMineInr) || 0)),
  };
}

export function calculateCostSummary(raw: PlanningInputs): CostSummary {
  const input = clampPlanningInputs(raw);
  const annualHoursReleased = input.currentMines * input.manualHoursPerMinePerMonth * 12 * input.hoursSavedPercent / 100;
  const annualManualWorkValueInr = input.currentMines * input.manualHoursPerMinePerMonth * 12 * input.loadedHourlyCostInr;
  const annualValueReleasedInr = annualHoursReleased * input.loadedHourlyCostInr;
  const annualPlatformCostInr = input.platformMonthlyCostInr * 12;
  const annualSupportCostInr = input.supportPerMineMonthlyInr * input.currentMines * 12;
  const annualOperatingCostInr = annualPlatformCostInr + annualSupportCostInr;
  const oneTimeOnboardingInr = input.onboardingCostPerMineInr * input.currentMines;
  const annualNetValueInr = annualValueReleasedInr - annualOperatingCostInr;
  const firstYearNetValueInr = annualNetValueInr - oneTimeOnboardingInr;
  const monthlyNetValue = annualNetValueInr / 12;

  return {
    annualManualWorkValueInr,
    annualHoursReleased,
    annualValueReleasedInr,
    annualPlatformCostInr,
    annualSupportCostInr,
    annualOperatingCostInr,
    oneTimeOnboardingInr,
    annualNetValueInr,
    firstYearNetValueInr,
    costPerMineMonthlyInr: annualOperatingCostInr / (input.currentMines * 12),
    paybackMonths: monthlyNetValue > 0 ? oneTimeOnboardingInr / monthlyNetValue : null,
  };
}

export type ScaleYear = {
  year: number;
  mines: number;
  users: number;
  reportsPerMonth: number;
  evidenceGbPerMonth: number;
  evidenceGbAddedThisYear: number;
  cumulativeEvidenceGb: number;
  platformCostInr: number;
  supportCostInr: number;
  onboardingCostInr: number;
  valueReleasedInr: number;
  netValueInr: number;
  cumulativeNetValueInr: number;
};

export function projectScale(raw: PlanningInputs): ScaleYear[] {
  const input = clampPlanningInputs(raw);
  const years: ScaleYear[] = [];
  let cumulativeEvidenceGb = 0;
  let cumulativeNetValueInr = 0;

  for (let year = 1; year <= input.years; year += 1) {
    const mines = input.currentMines + input.newMinesPerYear * year;
    const averageMines = input.currentMines + input.newMinesPerYear * (year - 0.5);
    const users = mines * input.usersPerMine;
    const reportsPerMonth = mines * input.reportsPerMinePerMonth;
    const evidenceGbPerMonth = reportsPerMonth * input.evidenceMbPerReport / 1024;
    const evidenceGbAddedThisYear = evidenceGbPerMonth * 12;
    cumulativeEvidenceGb += evidenceGbAddedThisYear;
    const platformCostInr = input.platformMonthlyCostInr * 12;
    const supportCostInr = mines * input.supportPerMineMonthlyInr * 12;
    const rolloutMines = year === 1 ? mines : input.newMinesPerYear;
    const onboardingCostInr = rolloutMines * input.onboardingCostPerMineInr;
    const valueReleasedInr = averageMines * input.manualHoursPerMinePerMonth * 12 * input.hoursSavedPercent / 100 * input.loadedHourlyCostInr;
    const netValueInr = valueReleasedInr - platformCostInr - supportCostInr - onboardingCostInr;
    cumulativeNetValueInr += netValueInr;

    years.push({
      year,
      mines,
      users,
      reportsPerMonth,
      evidenceGbPerMonth,
      evidenceGbAddedThisYear,
      cumulativeEvidenceGb,
      platformCostInr,
      supportCostInr,
      onboardingCostInr,
      valueReleasedInr,
      netValueInr,
      cumulativeNetValueInr,
    });
  }

  return years;
}
