import { describe, expect, it } from "vitest";
import { coalDashboardSource, mineOutputSource, publicMineOutputs, subsidiaryProduction } from "./public-coal-data";

describe("public coal production reference snapshot", () => {
  it("keeps the current company snapshot tied to its published date and source", () => {
    expect(coalDashboardSource.asOf).toBe("26 Sep 2026");
    expect(coalDashboardSource.url).toContain("apps.coalindia.in/ords/");
    expect(subsidiaryProduction.map(({ shortName, actualMt, ytdTargetMt }) => [shortName, actualMt, ytdTargetMt])).toEqual([
      ["CIL", 312.92, 341.31],
      ["SECL", 75.14, 81.94],
      ["NCL", 56.70, 67.52],
    ]);
  });

  it("uses provisional mine-wise figures from the cited FY 2024–25 report", () => {
    expect(mineOutputSource.period).toContain("FY 2024–25");
    expect(mineOutputSource.url).toContain("coal.nic.in");
    expect(publicMineOutputs.filter((mine) => mine.outputMt !== null).map(({ name, outputMt }) => [name, outputMt])).toEqual([
      ["Gevra OC", 56.03],
      ["Dipka OC", 33.52],
      ["Kusmunda", 28.43],
      ["Jayant", 29.99],
      ["Nigahi", 25.00],
    ]);
  });

  it("marks Sohagpur as unreported in this table instead of inventing zero output", () => {
    const sohagpur = publicMineOutputs.find((mine) => mine.name === "Sohagpur");
    expect(sohagpur?.outputMt).toBeNull();
    expect(sohagpur?.annualTargetMt).toBeNull();
    expect(sohagpur?.reportingNote.toLowerCase()).toContain("does not mean zero production");
  });
});
