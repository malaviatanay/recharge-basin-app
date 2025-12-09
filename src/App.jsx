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
  const [selectedAreaAcres, setSelectedAreaAcres] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (key, value) => setInputs((s) => ({ ...s, [key]: value }));

  // Calculate area in acres from lat/lon coordinates
  const calculateAreaAcres = (coords) => {
    // coords = [[lat1, lon1], [lat2, lon2], [lat3, lon3], [lat4, lon4], [lat1, lon1]]
    // For a rectangle: get north, south, east, west
    const lats = coords.map(c => c[0]);
    const lons = coords.map(c => c[1]);
    const north = Math.max(...lats);
    const south = Math.min(...lats);
    const east = Math.max(...lons);
    const west = Math.min(...lons);

    // Calculate area using approximate formula for small areas
    // Latitude degree in meters (roughly constant)
    const latDegreeMiles = 69.0;
    // Longitude degree varies with latitude
    const avgLat = (north + south) / 2;
    const lonDegreeMiles = 69.0 * Math.cos((avgLat * Math.PI) / 180);

    const heightMiles = (north - south) * latDegreeMiles;
    const widthMiles = (east - west) * lonDegreeMiles;
    const areaSqMiles = heightMiles * widthMiles;
    const areaAcres = areaSqMiles * 640; // 640 acres per square mile

    return areaAcres;
  };

  const fetchSoilData = async (polygonCoords) => {
    try {
      setLoading(true);
      setError(null);

      // Calculate the actual selected area
      const selectedAcres = calculateAreaAcres(polygonCoords);
      setSelectedAreaAcres(selectedAcres);

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
        // Auto-populate the landAcres input with the selected area
        set("landAcres", Math.round(selectedAcres * 100) / 100);
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
      <section className="max-w-[1200px] mx-auto mb-10">
        <h2 className="text-4xl font-bold text-center mb-6">
          Groundwater Depletion in California's Central Valley
        </h2>
        <p className="text-gray-700 text-xl leading-relaxed mb-6 text-center max-w-5xl mx-auto">
          California's Central Valley, one of the most productive agricultural
          regions in the world, faces a critical challenge — decades of
          groundwater pumping, coupled with drought and reduced surface-water
          supplies, have caused aquifer levels to drop dramatically.
        </p>
        <p className="text-gray-700 text-lg leading-relaxed mb-8 text-center max-w-4xl mx-auto">
          As groundwater becomes scarcer, farmers face higher pumping costs, reduced crop yields,
          and land subsidence (sinking). Without action, our agricultural communities and food
          production systems are at risk. Replenishing groundwater is essential for long-term
          sustainability and the future of farming in the Central Valley.
        </p>

        <div className="max-w-4xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200 p-8">
          <h3 className="text-3xl font-semibold text-blue-800 mb-4">
            Our Collaborative Solution: Groundwater Recharge Basins
          </h3>
          <p className="text-gray-700 text-lg leading-relaxed mb-4">
            Working with the <strong>California Water Institute</strong>, this
            project encourages farmers to repurpose portions of their land into
            <strong> recharge basins</strong> — shallow flooded areas designed to
            capture available surface water (from winter storms, flood flows, or allocated water)
            and allow it to slowly percolate back into underground aquifers.
          </p>
          <p className="text-gray-700 text-lg leading-relaxed mb-4">
            <strong>How it works:</strong> During wet months when water is abundant,
            your recharge basin acts like a large, shallow pond. Water soaks through
            the soil naturally, refilling the underground aquifer. During dry months,
            you can pump this stored groundwater back up for irrigation — creating a
            natural water bank on your own property.
          </p>
          <p className="text-gray-700 text-lg leading-relaxed">
            <strong>Benefits for farmers:</strong> Lower long-term pumping costs, more
            reliable water supply during droughts, potential water credits or payments,
            and contribution to regional groundwater sustainability. This tool helps you
            estimate costs, water volumes, and financial returns for converting part of
            your land into a recharge basin.
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

              {selectedAreaAcres && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900 mb-2">
                    <strong>Your selected area:</strong> {fmtNumber(selectedAreaAcres, 2)} acres
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> The USDA SoilDB returns data for entire soil mapping units that overlap your selection.
                    The acres shown in the table below represent the full extent of each soil type in the mapping database,
                    not just your selected area. Use your selected area ({fmtNumber(selectedAreaAcres, 2)} acres) for calculations.
                  </p>
                </div>
              )}

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

        <section className="rounded-xl bg-white p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Glossary of Terms & Abbreviations</h2>
          <p className="text-sm text-gray-600 mb-4">
            Understanding the technical terms used in groundwater recharge calculations:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-900">AF (Acre-Feet)</h4>
              <p className="text-sm text-gray-700">
                Volume of water that covers one acre to a depth of one foot.
                Equals 325,851 gallons — enough to supply 2-3 households for a year.
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-900">CAPEX (Capital Expenditure)</h4>
              <p className="text-sm text-gray-700">
                Upfront construction costs including excavation, grading, inlet/outlet structures,
                and permits. One-time investment to build the recharge basin.
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-900">O&M (Operations & Maintenance)</h4>
              <p className="text-sm text-gray-700">
                Ongoing yearly costs for basin upkeep: vegetation management, sediment removal,
                inspections, and minor repairs.
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-900">CFS (Cubic Feet per Second)</h4>
              <p className="text-sm text-gray-700">
                Water flow rate. One CFS equals about 450 gallons per minute.
                Used to size pipes and pumps for the basin.
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-900">Infiltration Rate (in/day)</h4>
              <p className="text-sm text-gray-700">
                How fast water soaks through the soil measured in inches per day.
                Sandy soils infiltrate faster (2-10 in/day) than clay soils (0.1-1 in/day).
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-900">kWh (Kilowatt-Hour)</h4>
              <p className="text-sm text-gray-700">
                Unit of electrical energy. Pumping groundwater requires energy;
                deeper wells need more kWh per acre-foot pumped.
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-900">ROI (Return on Investment)</h4>
              <p className="text-sm text-gray-700">
                Financial gain compared to initial investment. Calculated from water value,
                reduced pumping costs, and potential credits minus construction and O&M costs.
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-900">USDA SoilDB</h4>
              <p className="text-sm text-gray-700">
                United States Department of Agriculture Soil Database.
                Official source for soil types and properties across the country.
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-900">Recharge Season (days)</h4>
              <p className="text-sm text-gray-700">
                Number of days per year water is available to flood the basin,
                typically during winter/spring months when surface water is abundant.
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-900">Simple Payback (years)</h4>
              <p className="text-sm text-gray-700">
                Time to recover initial investment through annual net benefits.
                Shorter payback means faster return on your investment.
              </p>
            </div>
          </div>
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
