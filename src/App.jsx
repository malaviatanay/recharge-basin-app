import React, { useState } from "react";
import SoilMap from "./SoilMap";
import { fmtCurrency, fmtNumber, computeRechargeEconomics } from "./calcEngine";

export default function App() {
  const [inputs, setInputs] = useState({
    landAcres: 10,
    infiltrationInPerDay: 2,
    rechargeDays: 120,
    avgBasinDepthFt: 4,
    capexPerAcre: 20000,
    omPerAcreFoot: 20,
    waterPricePerAF: 250,
    pumpingKWhPerAF: 150,
    electricityPerKWh: 0.18,
  });

  const [coords, setCoords] = useState(null);
  const [soilData, setSoilData] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (key, value) => setInputs((s) => ({ ...s, [key]: value }));

  const fetchSoilData = async (polygonCoords) => {
    try {
      setLoading(true);
      setError(null);
      const BACKEND_URL =
        import.meta.env.VITE_API_URL ||
        "https://recharge-basin-app.onrender.com";

      const response = await fetch(`${BACKEND_URL}/soil`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: polygonCoords }),
      });

      const data = await response.json();
      if (data.ok && data.allsoils) {
        setSoilData(data.allsoils);
      } else {
        setSoilData(null);
        setError(data.error || "No soil data found. Try a larger area.");
      }
    } catch (err) {
      console.error("Soil data fetch failed:", err);
      setError("Unable to fetch soil data.");
    } finally {
      setLoading(false);
    }
  };

  const calculateResults = () => {
    try {
      const calculatedResults = computeRechargeEconomics(inputs);
      setResults(calculatedResults);
    } catch (err) {
      console.error("Calculation failed:", err);
      setError("Failed to calculate results.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-6">
      <section className="max-w-[1000px] mx-auto mb-10">
        <h2 className="text-3xl font-bold text-center mb-4">
          Groundwater Depletion in California’s Central Valley
        </h2>
        <p className="text-gray-700 text-lg leading-relaxed mb-6 text-center">
          California’s Central Valley, one of the most productive agricultural
          regions in the world, faces a critical challenge — decades of
          groundwater pumping, coupled with drought and reduced surface-water
          supplies, have caused aquifer levels to drop dramatically.
        </p>

        <div className="max-w-3xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200 p-6">
          <h3 className="text-2xl font-semibold text-blue-800 mb-3">
            Our Collaborative Solution
          </h3>
          <p className="text-gray-700 leading-relaxed">
            Working with the <strong>California Water Institute</strong>, this
            project encourages farmers to repurpose portions of their land into
            <strong> recharge basins </strong> — shallow areas designed to
            capture surface water and allow it to percolate back into
            underground aquifers.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-[1000px] space-y-8">
        <section className="rounded-xl bg-white p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Land & Economics Inputs</h2>

          <Group title="Land & Recharge">
            <NumberInput label="Basin area" suffix="acres" value={inputs.landAcres} onChange={(v) => set("landAcres", v)} />
            <NumberInput label="Average infiltration rate" suffix="in/day" value={inputs.infiltrationInPerDay} onChange={(v) => set("infiltrationInPerDay", v)} />
            <NumberInput label="Recharge season" suffix="days" value={inputs.rechargeDays} onChange={(v) => set("rechargeDays", v)} />
            <NumberInput label="Average basin depth" suffix="ft" value={inputs.avgBasinDepthFt} onChange={(v) => set("avgBasinDepthFt", v)} />
          </Group>

          <Group title="Economics">
            <NumberInput label="Construction (CAPEX)" prefix="$" suffix="/acre" value={inputs.capexPerAcre} onChange={(v) => set("capexPerAcre", v)} />
            <NumberInput label="O&M cost" prefix="$" suffix="/AF" value={inputs.omPerAcreFoot} onChange={(v) => set("omPerAcreFoot", v)} />
            <NumberInput label="Water value / credit" prefix="$" suffix="/AF" value={inputs.waterPricePerAF} onChange={(v) => set("waterPricePerAF", v)} />
          </Group>

          <Group title="Pumping (optional)">
            <NumberInput label="Energy use" suffix="kWh/AF" value={inputs.pumpingKWhPerAF} onChange={(v) => set("pumpingKWhPerAF", v)} />
            <NumberInput label="Electricity price" prefix="$" suffix="/kWh" step={0.01} value={inputs.electricityPerKWh} onChange={(v) => set("electricityPerKWh", v)} />
          </Group>

          <div className="mt-5 flex justify-end">
            <button
              onClick={calculateResults}
              className="rounded-xl bg-blue-600 px-5 py-2 text-white font-medium hover:bg-blue-700"
            >
              Calculate Recharge
            </button>
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Select Your Land on the Map</h2>
          <p className="text-sm text-gray-600 mb-4">
            Draw a rectangle around your field to fetch official USDA SoilDB data.
          </p>
          <SoilMap
            onAreaSelect={(polygonCoords) => {
              setCoords(polygonCoords);
              fetchSoilData(polygonCoords);
            }}
          />
        </section>

        <section className="rounded-xl bg-white p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-3">Results</h2>

          {loading && <p className="text-gray-500">Loading results...</p>}
          {error && <p className="text-red-600">{error}</p>}

          {soilData && (
            <>
              <h3 className="text-lg font-semibold mt-4 mb-2">Soil Data (USDA SoilDB)</h3>
              <table className="min-w-full border text-sm mb-6">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-2 text-left">Soil Symbol</th>
                    <th className="p-2 text-left">Soil Name</th>
                    <th className="p-2 text-right">Area (acres)</th>
                  </tr>
                </thead>
                <tbody>
                  {soilData.map((row, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{row.symbol}</td>
                      <td className="p-2">{row.desc}</td>
                      <td className="p-2 text-right">{fmtNumber(row.acres || 0, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {results && (
            <>
              <h3 className="text-lg font-semibold mb-2">Recharge Basin Calculations</h3>
              <p>Average Flow: {fmtNumber(results.cfs, 3)} cfs</p>
              <p>Daily Recharge: {fmtNumber(results.dailyAF, 3)} AF/day</p>
              <p>Seasonal Recharge: {fmtNumber(results.seasonalAF, 2)} AF/season</p>
              <p>Simple Payback: {fmtNumber(results.simplePaybackYrs, 1)} years</p>
              <p>Net Annual Cash Flow: {fmtCurrency(results.netAnnual)}</p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <fieldset className="mb-5 rounded-lg border border-gray-200 p-4">
      <legend className="px-2 text-base font-semibold">{title}</legend>
      <div className="grid grid-cols-1 gap-3">{children}</div>
    </fieldset>
  );
}

function NumberInput({ label, prefix = "", suffix = "", value, onChange, step = 1 }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium">{label}</div>
      <div className="flex items-stretch overflow-hidden rounded-xl border border-gray-300">
        {prefix && <span className="grid place-items-center bg-gray-50 px-3 text-gray-600">{prefix}</span>}
        <input
          type="number"
          step={step}
          inputMode="decimal"
          value={value === 0 ? 0 : value || ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "" || val === null) {
              onChange("");
              return;
            }
            const num = Number(val);
            if (!isNaN(num)) onChange(num);
          }}
          className="w-full px-3 py-2 outline-none"
        />
        {suffix && <span className="grid place-items-center bg-gray-50 px-3 text-gray-600">{suffix}</span>}
      </div>
    </label>
  );
}
