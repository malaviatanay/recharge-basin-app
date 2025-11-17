import React, { useState, useEffect } from "react";
import SoilMap from "./SoilMap";
import { fmtCurrency, fmtNumber } from "./calcEngine";

// ---------- MAIN APP COMPONENT ----------
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

  const [step, setStep] = useState("form"); // form → map → results
  const [coords, setCoords] = useState(null);
  const [soilData, setSoilData] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (key, value) => setInputs((s) => ({ ...s, [key]: value }));

  // ---------- Fetch Calculation Results ----------
  const fetchCalculation = async () => {
    try {
      setLoading(true);
      const BACKEND_URL =
        import.meta.env.VITE_API_URL ||
        "https://recharge-basin-app.onrender.com";

      const response = await fetch(`${BACKEND_URL}/api/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });
      const data = await response.json();
      if (data.ok) setResults(data.results);
    } catch (err) {
      console.error("Calculation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Fetch Soil Data ----------
  const fetchSoilData = async (polygonCoords) => {
    try {
      setLoading(true);
      const BACKEND_URL =
        import.meta.env.VITE_API_URL ||
        "https://recharge-basin-app.onrender.com";

      const response = await fetch(`${BACKEND_URL}/api/soil`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: polygonCoords }),
      });

      const data = await response.json();
      if (data.ok) {
        setSoilData(data.data);
        alert("✅ Soil data fetched successfully!");
        setStep("results");
        fetchCalculation();
      } else {
        alert("⚠️ No soil data found. Try a larger area.");
      }
    } catch (err) {
      console.error("Soil data fetch failed:", err);
      setError("Unable to fetch soil data.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- FORM VIEW ----------
  const renderForm = () => (
    <section className="rounded-xl bg-white p-6 border border-gray-200 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Step 1: Enter Basin Details</h2>

      <Group title="Land & Recharge">
        <NumberInput label="Basin area" suffix="acres" value={inputs.landAcres} onChange={(v) => set("landAcres", v)} />
        <NumberInput label="Average infiltration rate" suffix="in/day" value={inputs.infiltrationInPerDay} onChange={(v) => set("infiltrationInPerDay", v)} />
        <NumberInput label="Recharge season" suffix="days" value={inputs.rechargeDays} onChange={(v) => set("rechargeDays", v)} />
        <NumberInput label="Average basin depth (for rough excavation)" suffix="ft" value={inputs.avgBasinDepthFt} onChange={(v) => set("avgBasinDepthFt", v)} />
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

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setStep("map")}
          className="rounded-xl bg-blue-600 px-5 py-2 text-white font-medium hover:bg-blue-700"
        >
          Next → Select Land
        </button>
      </div>
    </section>
  );

  // ---------- MAP VIEW ----------
  const renderMap = () => (
    <section className="rounded-xl bg-white p-6 border border-gray-200 shadow-sm">
      <h2 className="text-xl font-semibold mb-3">Step 2: Select Your Land on the Map</h2>
      <p className="text-sm text-gray-600 mb-4">
        Draw a rectangle around your field to fetch official USDA soil data.
      </p>
      <SoilMap
        onAreaSelect={(polygonCoords) => {
          setCoords(polygonCoords);
          fetchSoilData(polygonCoords);
        }}
      />
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setStep("form")}
          className="rounded-xl bg-gray-100 px-5 py-2 text-sm font-medium hover:bg-gray-200"
        >
          ← Back to Form
        </button>
      </div>
    </section>
  );

  // ---------- RESULTS VIEW ----------
  const renderResults = () => (
    <section className="rounded-xl bg-white p-6 border border-gray-200 shadow-sm">
      <h2 className="text-xl font-semibold mb-3">Step 3: Results</h2>

      {loading && <p className="text-gray-500">Loading results...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {soilData && (
        <>
          <h3 className="text-lg font-semibold mt-4 mb-2">USDA Soil Data</h3>
          <table className="min-w-full border text-sm mb-6">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-2 text-left">Soil Type</th>
                <th className="p-2 text-right">Acres</th>
              </tr>
            </thead>
            <tbody>
              {soilData.map((row) => (
                <tr key={row.mukey} className="border-b">
                  <td className="p-2">{row.muname}</td>
                  <td className="p-2 text-right">
                    {fmtNumber(row.muacres || 0, 1)}
                  </td>
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

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setStep("form")}
          className="rounded-xl bg-gray-100 px-5 py-2 text-sm font-medium hover:bg-gray-200"
        >
          ← Start Over
        </button>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-6">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Recharge Basin Assessment – MVP</h1>
        <p className="text-gray-700 mt-2">
          Complete the form, select your land, and view recharge + soil data results.
        </p>
      </header>

      <main className="mx-auto max-w-[1000px] space-y-8">
        {step === "form" && renderForm()}
        {step === "map" && renderMap()}
        {step === "results" && renderResults()}
      </main>
    </div>
  );
}

/* ---------- Reusable Components ---------- */
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
        {prefix && (
          <span className="grid place-items-center bg-gray-50 px-3 text-gray-600">{prefix}</span>
        )}
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
        {suffix && (
          <span className="grid place-items-center bg-gray-50 px-3 text-gray-600">{suffix}</span>
        )}
      </div>
    </label>
  );
}
