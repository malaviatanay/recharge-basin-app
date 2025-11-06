import React, { useMemo, useState } from "react";
import { computeRechargeEconomics, fmtCurrency, fmtNumber, applyParity } from "./calcEngine";
import soilRates from "./soilRates.json";
import SoilMap from "./SoilMap";

export default function App() {
  const [inputs, setInputs] = useState({
    // Land & recharge
    landAcres: 10,
    infiltrationInPerDay: 2,
    rechargeDays: 120,
    avgBasinDepthFt: 4,

    // Economics
    capexPerAcre: 20000,
    omPerAcreFoot: 20,
    waterPricePerAF: 250,

    // Pumping
    pumpingKWhPerAF: 150,
    electricityPerKWh: 0.18,
  });

  const set = (key, value) => setInputs((s) => ({ ...s, [key]: value }));

  // All math handled by calcEngine.js
  const results = useMemo(() => {
    const base = computeRechargeEconomics(inputs);
    const adjusted = applyParity(base);
    return adjusted;
  }, [inputs]);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 text-base leading-relaxed">
     {/* ---------- HERO / PROBLEM + APP INTRO ---------- */}
<section className="relative w-full bg-gradient-to-b from-blue-50 to-gray-50 border-b border-gray-200">
  <div className="mx-auto max-w-[1600px] px-10 py-16 text-center">
    {/* Problem statement */}
    <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">
      Groundwater Depletion in California’s Central Valley
    </h2>
    <p className="text-gray-700 text-lg leading-relaxed max-w-4xl mx-auto mb-8">
      California’s Central Valley, one of the most productive agricultural regions in the world, faces a critical challenge — 
      decades of groundwater pumping, coupled with drought and reduced surface-water supplies, have caused aquifer levels 
      to drop dramatically. Lower water tables increase pumping costs, dry up wells, and cause land subsidence that damages infrastructure.
    </p>

    {/* Solution box */}
    <div className="max-w-4xl mx-auto text-left bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200 p-8 mb-14">
      <h3 className="text-2xl font-semibold text-blue-800 mb-3">Our Collaborative Solution</h3>
      <p className="text-gray-700 leading-relaxed">
        Working with the <strong>California Water Institute</strong>, this project encourages farmers to repurpose portions of 
        their land into <strong>recharge basins</strong> — shallow areas designed to capture surface water and allow it to percolate 
        back into underground aquifers. This web application helps estimate <em>potential recharge volume, project costs, and 
        return on investment (ROI)</em>, empowering landowners to make informed, sustainable decisions that benefit both 
        their farms and California’s groundwater future.
      </p>
    </div>

    {/* App title & tagline (previous header content) */}
    <div className="max-w-[1000px] mx-auto text-center">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
        Recharge Basin Assessment – MVP
      </h1>
      <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
        Groundwater recharge projects capture surface water and let it soak back into the ground to replenish aquifers. 
        This tool helps farmers and water managers estimate recharge volume, costs, and simple ROI when setting aside land for a basin.
      </p>
    </div>
  </div>
</section>



      {/* ---------- MAIN CONTENT GRID ---------- */}
      <main className="mx-auto grid max-w-[1600px] gap-8 px-8 py-10 lg:grid-cols-[1.2fr_1fr] items-start">
        {/* ---------- INPUTS PANEL ---------- */}
        <section className="rounded-xl bg-white p-5 border border-gray-200 shadow-sm">
          <h2 className="mb-3 text-xl font-semibold">Inputs</h2>

          <Group title="Land & Recharge">
            <NumberInput label="Basin area" suffix="acres" value={inputs.landAcres} onChange={(v) => set("landAcres", v)} />

            {/* Soil type selector */}
            <label className="block">
              <div className="mb-1 text-sm font-medium">Soil type</div>
              <select
                className="w-full rounded-xl border border-gray-300 px-3 py-2 bg-white"
                value={inputs.soilKey ?? "loam"}
                onChange={(e) => {
                  const soilKey = e.target.value;
                  const sel = soilRates.find((s) => s.key === soilKey);
                  if (!sel) return;
                  setInputs((s) => ({
                    ...s,
                    soilKey,
                    infiltrationInPerDay: sel.inPerDay ?? s.infiltrationInPerDay,
                  }));
                }}
              >
                {soilRates.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <div className="mt-1 text-xs text-gray-500">
                Choose a soil profile to prefill a typical infiltration rate. You can still edit the rate below.
              </div>
            </label>

            <NumberInput
              label="Average infiltration rate"
              suffix="in/day"
              value={inputs.infiltrationInPerDay}
              onChange={(v) => set("infiltrationInPerDay", v)}
              help="Use field data or Web Soil Survey to refine."
            />
            <NumberInput label="Recharge season" suffix="days" value={inputs.rechargeDays} onChange={(v) => set("rechargeDays", v)} />
            <NumberInput
              label="Average basin depth (for rough excavation)"
              suffix="ft"
              value={inputs.avgBasinDepthFt}
              onChange={(v) => set("avgBasinDepthFt", v)}
            />
          </Group>

          {/* Interactive soil map */}
          <SoilMap
            onSoilSelect={(soil) => {
              if (!soil) return;
              setInputs((s) => ({
                ...s,
                soilKey: soil.key,
                infiltrationInPerDay: soil.inPerDay ?? s.infiltrationInPerDay,
              }));
            }}
          />

          <Group title="Economics">
            <NumberInput label="Construction (CAPEX)" prefix="$" suffix="/acre" value={inputs.capexPerAcre} onChange={(v) => set("capexPerAcre", v)} />
            <NumberInput label="O&M cost" prefix="$" suffix="/AF" value={inputs.omPerAcreFoot} onChange={(v) => set("omPerAcreFoot", v)} />
            <NumberInput label="Water value / credit" prefix="$" suffix="/AF" value={inputs.waterPricePerAF} onChange={(v) => set("waterPricePerAF", v)} />
          </Group>

          <Group title="Pumping (optional)">
            <NumberInput label="Energy use" suffix="kWh/AF" value={inputs.pumpingKWhPerAF} onChange={(v) => set("pumpingKWhPerAF", v)} />
            <NumberInput label="Electricity price" prefix="$" suffix="/kWh" step={0.01} value={inputs.electricityPerKWh} onChange={(v) => set("electricityPerKWh", v)} />
          </Group>

          <div className="mt-5 flex gap-3">
            <button
              className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
              onClick={() =>
                setInputs({
                  landAcres: 10,
                  infiltrationInPerDay: 2,
                  rechargeDays: 120,
                  avgBasinDepthFt: 4,
                  capexPerAcre: 20000,
                  omPerAcreFoot: 20,
                  waterPricePerAF: 250,
                  pumpingKWhPerAF: 150,
                  electricityPerKWh: 0.18,
                })
              }
            >
              Reset defaults
            </button>
          </div>
        </section>

        {/* ---------- RESULTS PANEL ---------- */}
        <section className="rounded-xl bg-white p-5 border border-gray-200 shadow-sm overflow-y-auto max-h-[75vh]">
          <h2 className="mb-3 text-xl font-semibold">Results</h2>
          <div className="grid grid-cols-1 gap-5 md:gap-6">
            <Card title="Average flow (CFS)">{fmtNumber(results.cfs, 3)} cfs</Card>
            <Card title="Daily recharge">{fmtNumber(results.dailyAF, 3)} AF/day</Card>
            <Card title="Seasonal recharge">{fmtNumber(results.seasonalAF, 2)} AF / season</Card>
            <Card title="Rough excavation">{fmtNumber(results.excavationYd3, 0)} yd³</Card>

            <div className="my-2 border-t pt-3" />

            <StatRow label="CAPEX (one-time)">{fmtCurrency(results.capex)}</StatRow>
            <StatRow label="Annual revenue (credits)">{fmtCurrency(results.revenue)}</StatRow>
            <StatRow label="Annual O&M">{fmtCurrency(results.om)}</StatRow>
            <StatRow label="Annual pumping cost">{fmtCurrency(results.pumpingCost)}</StatRow>
            <StatRow label="Total annual cost">{fmtCurrency(results.totalAnnualCost)}</StatRow>
            <StatRow label="Net annual cash flow">{fmtCurrency(results.netAnnual)}</StatRow>
            <StatRow label="Simple payback">
              {results.simplePaybackYrs === Infinity
                ? "No payback (negative cash flow)"
                : `${fmtNumber(results.simplePaybackYrs, 1)} years`}
            </StatRow>

            <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm leading-relaxed">
              <p className="font-semibold">Heads-up:</p>
              <ul className="ml-5 list-disc">
                <li>
                  For pipe sizing and hydraulic checks, use the spikevm calculator linked on the class brief.
                  Enter the average flow above (cfs → convert to gpm if needed).
                </li>
                <li>
                  Refine infiltration rates using NRCS Web Soil Survey and field tests; the default is a placeholder.
                </li>
                <li>This MVP mirrors the spreadsheet logic at a high level. Your backend can later port exact formulas.</li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-2 text-white font-medium hover:bg-blue-700"
          >
            Print or Save as PDF
          </button>
        </section>
      </main>

      {/* ---------- ABBREVIATIONS / GLOSSARY ---------- */}
      <section className="mx-auto max-w-[1600px] mt-10 px-10 rounded-xl bg-white p-6 border border-gray-200 shadow-sm print:shadow-none print:mt-4">
        <h2 className="text-xl font-semibold mb-3">Abbreviations & Units</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <p><strong>AF</strong> — Acre-Foot (volume of water covering one acre to a depth of 1 ft)</p>
          <p><strong>cfs</strong> — Cubic Feet per Second (flow rate)</p>
          <p><strong>gpm</strong> — Gallons per Minute (flow rate)</p>
          <p><strong>O&M</strong> — Operation and Maintenance Cost</p>
          <p><strong>CAPEX</strong> — Capital Expenditure (Cost to build)</p>
          <p><strong>kWh</strong> — Kilowatt-hour (unit of electric energy)</p>
          <p><strong>$/AF</strong> — Dollars per Acre-Foot of water</p>
          <p><strong>$/acre</strong> — Dollars per Acre of land area</p>
          <p><strong>in/day</strong> — Inches per Day (infiltration rate)</p>
          <p><strong>yd³</strong> — Cubic Yard (27 ft³ — used for earthwork volume)</p>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          These definitions follow standard hydrologic and engineering units used in recharge basin design and reporting.
        </p>
      </section>

      <footer className="mx-auto max-w-[1600px] px-10 pb-10 text-sm text-gray-600">
        Built for CSCI 130 • Prototype calculator only. Validate inputs and assumptions with your water district/consultant.
      </footer>
    </div>
  );
}

/* ---------- Reusable Components ---------- */

function Group({ title, children }) {
  return (
    <fieldset className="mb-4 rounded-lg border border-gray-200 p-3">
      <legend className="px-2 text-base font-semibold">{title}</legend>
      <div className="grid grid-cols-1 gap-3">{children}</div>
    </fieldset>
  );
}

function NumberInput({ label, prefix = "", suffix = "", value, onChange, step = 1, help }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium">{label}</div>
      <div className="flex items-stretch overflow-hidden rounded-xl border border-gray-300">
        {prefix ? <span className="grid place-items-center bg-gray-50 px-3 text-gray-600">{prefix}</span> : null}
        <input
          type="number"
          step={step}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className="w-full px-3 py-2 outline-none"
        />
        {suffix ? <span className="grid place-items-center bg-gray-50 px-3 text-gray-600">{suffix}</span> : null}
      </div>
      {help ? <div className="mt-1 text-xs text-gray-500">{help}</div> : null}
    </label>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{children}</div>
    </div>
  );
}

function StatRow({ label, children }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-lg font-medium">{children}</div>
    </div>
  );
}
