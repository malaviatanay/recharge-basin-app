// src/calcEngine.js
//
// Recharge Basin Assessment — Calc Engine (Excel-portable)
//
// This module centralizes ALL math so the React UI can stay simple.
// It mirrors the high-level spreadsheet logic using the same units
// (acres, inches/day, days, $/AF, etc.). If you later discover exact
// constants in the Excel workbook, tweak them here only.

// ---------- Unit & shared constants ----------
const FT2_PER_ACRE = 43_560;  // square feet in one acre
const IN_PER_FT     = 12;     // inches per foot
const SEC_PER_DAY   = 86_400; // 24 * 3600

// Format helpers (optional for callers)
// ✅ Safely format a number as currency
export const fmtCurrency = (n, digits = 0) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  try {
    return Number(n).toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: digits,
    });
  } catch {
    return "—";
  }
};

// ✅ Safely format a number with commas
export const fmtNumber = (n, digits = 2) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  try {
    return Number(n).toLocaleString(undefined, {
      maximumFractionDigits: digits,
    });
  } catch {
    return "—";
  }
};


// ---------- Core calculator ----------
// Inputs expected (keys + units):
// - landAcres: number (acres)
// - infiltrationInPerDay: number (in/day)
// - rechargeDays: number (days)
// - avgBasinDepthFt: number (ft)   // only for rough excavation
// - capexPerAcre: number ($/acre)
// - omPerAcreFoot: number ($/AF)
// - waterPricePerAF: number ($/AF) // “credit” or price
// - pumpingKWhPerAF: number (kWh/AF)
// - electricityPerKWh: number ($/kWh)
//
// Returns an object with:
// - surfaceAreaFt2, infilFtPerDay, dailyAF, seasonalAF, excavationYd3
// - capex, revenue, om, pumpingCost, totalAnnualCost, netAnnual, simplePaybackYrs
// - dailyCubicFt, cfs, gpm
export function computeRechargeEconomics(inputs) {
  const {
    landAcres = 0,
    infiltrationInPerDay = 0,
    rechargeDays = 0,
    avgBasinDepthFt = 0,
    capexPerAcre = 0,
    omPerAcreFoot = 0,
    waterPricePerAF = 0,
    pumpingKWhPerAF = 0,
    electricityPerKWh = 0,
  } = inputs ?? {};

  // 1) Geometry / hydraulics
  const surfaceAreaFt2 = landAcres * FT2_PER_ACRE;
  const infilFtPerDay = infiltrationInPerDay / IN_PER_FT;

  // Daily acre-feet = (ft² * ft/day) / ft² per acre
  const dailyAF = (surfaceAreaFt2 * infilFtPerDay) / FT2_PER_ACRE;

  // Seasonal recharge (AF)
  const seasonalAF = dailyAF * rechargeDays;

  // Rough excavation (cubic yards) for average basin depth
  const excavationYd3 = (surfaceAreaFt2 * avgBasinDepthFt) / 27;

  // Average daily cubic feet & flow conversions
  const dailyCubicFt = dailyAF * FT2_PER_ACRE; // AF/day → ft³/day
  const cfs = dailyCubicFt / SEC_PER_DAY;     // cubic feet per second
  const gpm = cfs * 448.831;                   // useful for pipe sizing tools

  // 2) Economics
  const capex = capexPerAcre * landAcres;              // one-time
  const revenue = seasonalAF * waterPricePerAF;        // value of credits / payments
  const om = seasonalAF * omPerAcreFoot;               // variable O&M
  const pumpingCost = seasonalAF * pumpingKWhPerAF * electricityPerKWh;

  const totalAnnualCost = om + pumpingCost;
  const netAnnual = revenue - totalAnnualCost;

  const simplePaybackYrs = netAnnual > 0 ? capex / netAnnual : Infinity;

  return {
    // hydraulics
    surfaceAreaFt2,
    infilFtPerDay,
    dailyAF,
    seasonalAF,
    excavationYd3,
    dailyCubicFt,
    cfs,
    gpm,
    // economics
    capex,
    revenue,
    om,
    pumpingCost,
    totalAnnualCost,
    netAnnual,
    simplePaybackYrs,
  };
}

// ---------- Parity helpers (for later Excel matching) ----------
// If your Excel workbook uses any hidden factors, safety factors,
// or per-district adjustments, encode them here so we can match
// numbers 1:1 without touching the React UI.
export const parityAdjust = {
  // Example knobs (set all to 1.0 initially; change only if needed):
  dailyAF: 1.0,
  seasonalAF: 1.0,
  cfs: 1.0,
  revenue: 1.0,
  om: 1.0,
  pumpingCost: 1.0,
};

export function applyParity(result) {
  // Apply optional multipliers if you discover Excel is using
  // implicit corrections/rounding you want to mirror exactly.
  return {
    ...result,
    dailyAF: result.dailyAF * parityAdjust.dailyAF,
    seasonalAF: result.seasonalAF * parityAdjust.seasonalAF,
    cfs: result.cfs * parityAdjust.cfs,
    revenue: result.revenue * parityAdjust.revenue,
    om: result.om * parityAdjust.om,
    pumpingCost: result.pumpingCost * parityAdjust.pumpingCost,
  };
}
