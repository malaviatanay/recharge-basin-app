// tests/calcEngine.test.js
import { describe, it, expect } from "vitest";
import { computeRechargeEconomics } from "../src/calcEngine.js";

describe("Recharge Basin Calculator parity check", () => {
  it("matches baseline Excel example", () => {
    //  Excel baseline input (10 acres, 2 in/day, 120 days, etc.)
    const inputs = {
      landAcres: 10,
      infiltrationInPerDay: 2,
      rechargeDays: 120,
      avgBasinDepthFt: 4,
      capexPerAcre: 20000,
      omPerAcreFoot: 20,
      waterPricePerAF: 250,
      pumpingKWhPerAF: 150,
      electricityPerKWh: 0.18,
    };

    const result = computeRechargeEconomics(inputs);

    //  Expected results based on Excel / UI parity
    // (tolerances allow for minor rounding differences)
    expect(result.dailyAF).toBeCloseTo(1.667, 3);
    expect(result.seasonalAF).toBeCloseTo(200, 0);
    expect(result.cfs).toBeCloseTo(0.84, 2);
    expect(result.revenue).toBeCloseTo(50_000, 0);
    expect(result.om).toBeCloseTo(4_000, 0);
    expect(result.pumpingCost).toBeCloseTo(5_400, 0);
    expect(result.netAnnual).toBeCloseTo(40_600, 0);
    expect(result.simplePaybackYrs).toBeCloseTo(4.9, 1);
  });
});
