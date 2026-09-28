import { describe, expect, it } from "vitest";
import { calculateCostSummary, EXAMPLE_INPUTS, projectScale } from "./planning";

describe("MinePulse planning model", () => {
  it("calculates annual value, operating cost, and payback from explicit inputs", () => {
    const result = calculateCostSummary({
      ...EXAMPLE_INPUTS,
      currentMines: 2,
      manualHoursPerMinePerMonth: 10,
      loadedHourlyCostInr: 100,
      hoursSavedPercent: 50,
      platformMonthlyCostInr: 1000,
      supportPerMineMonthlyInr: 100,
      onboardingCostPerMineInr: 1200,
    });

    expect(result.annualManualWorkValueInr).toBe(24000);
    expect(result.annualHoursReleased).toBe(120);
    expect(result.annualValueReleasedInr).toBe(12000);
    expect(result.annualOperatingCostInr).toBe(14400);
    expect(result.oneTimeOnboardingInr).toBe(2400);
    expect(result.annualNetValueInr).toBe(-2400);
    expect(result.paybackMonths).toBeNull();
  });

  it("projects increasing sites, people, records, evidence, and cost by year", () => {
    const result = projectScale({
      ...EXAMPLE_INPUTS,
      currentMines: 2,
      newMinesPerYear: 1,
      years: 2,
      usersPerMine: 10,
      reportsPerMinePerMonth: 20,
      evidenceMbPerReport: 2,
      platformMonthlyCostInr: 1000,
      supportPerMineMonthlyInr: 100,
      onboardingCostPerMineInr: 50,
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ year: 1, mines: 3, users: 30, reportsPerMonth: 60 });
    expect(result[0].evidenceGbPerMonth).toBeCloseTo(60 * 2 / 1024);
    expect(result[1]).toMatchObject({ year: 2, mines: 4, users: 40, reportsPerMonth: 80 });
    expect(result[1].cumulativeEvidenceGb).toBeGreaterThan(result[0].cumulativeEvidenceGb);
    expect(result[1].cumulativeNetValueInr).toBeGreaterThanOrEqual(result[0].cumulativeNetValueInr - 1000000);
  });

  it("clamps percentages and prevents negative capacity assumptions", () => {
    const result = calculateCostSummary({ ...EXAMPLE_INPUTS, hoursSavedPercent: 180, currentMines: -7 });
    expect(result.annualHoursReleased).toBeGreaterThan(0);
    expect(result.annualValueReleasedInr).toBeLessThanOrEqual(result.annualManualWorkValueInr);
  });
});
