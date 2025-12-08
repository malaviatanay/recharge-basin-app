const express = require("express");
const axios = require("axios");
const cors = require("cors");
const xml2js = require("xml2js");

const app = express();
app.use(express.json());
app.use(cors());

function parseAndSortSoils(reportJSON) {
  try {
    const tbody = reportJSON?.section?.table?.[0]?.tbody?.[0];
    if (!tbody?.tr?.length) return null;

    const rows = tbody.tr;
    const soils = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.$?.class === "mapunit") {
        const cell = row.td?.[0];
        const text = cell?.para?.[0]?._ || "";
        const symbol = text.split("--")[0]?.trim();
        const desc = text.split("--")[1]?.trim() || "";

        const acresText = row.td?.[1]?.para?.[0]?._ || "";
        const acres = parseFloat(acresText.replace(/,/g, "")) || 0;

        soils.push({ symbol, desc, acres });
      }
    }

    if (!soils.length) return null;

    soils.sort((a, b) => b.acres - a.acres);
    return soils;
  } catch (err) {
    console.warn("Failed to parse soils:", err.message);
    return null;
  }
}

app.get("/", (_req, res) => res.send("Soil API running"));

app.post("/soil", async (req, res) => {
  try {
    // ============================
    // 🔥 FIXED: Use frontend coords
    // ============================
    let ring = req.body.coordinates;

    if (!ring || ring.length < 4) {
      return res.status(400).json({ error: "Invalid coordinates from frontend." });
    }

    // Convert (lat,lon) to (lon,lat)
    ring = ring.map(([lat, lon]) => [lon, lat]);

    // Close ring if not closed
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([...first]);
    }

    // ============================
    // Build GeoJSON AOI
    // ============================
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "User Selection" },
          geometry: {
            type: "Polygon",
            coordinates: [ring],
          },
        },
      ],
    };

    const url = "https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest";

    // 1. Create AOI
    const aoiResp = await axios.post(
      url,
      {
        SERVICE: "aoi",
        REQUEST: "create",
        AOICOORDS: JSON.stringify(geojson),
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const AOIID = aoiResp.data?.id;
    if (!AOIID) {
      return res.status(502).json({ error: "AOI creation failed", raw: aoiResp.data });
    }

    // 2. Get catalog
    const aoiCatalog = await axios.post(
      url,
      {
        SERVICE: "report",
        REQUEST: "getcatalog",
        AOIID,
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const folders = aoiCatalog.data?.tables?.[0]?.folders;
    if (!folders) {
      return res.status(502).json({ error: "Invalid catalog format", raw: aoiCatalog.data });
    }

    // Find Component Legend report
    let selected = null;
    for (const folder of folders) {
      const found = folder.reports.find((r) =>
        r.reportname.toLowerCase().includes("component legend")
      );
      if (found) {
        selected = found;
        break;
      }
    }
    if (!selected) selected = folders[0].reports[0];

    const REPORTID = selected.reportid;

    // 3. Get Report Metadata
    const aoiReportData = await axios.post(
      url,
      {
        SERVICE: "report",
        REQUEST: "getreportdata",
        REPORTID,
        AOIID,
        FORMAT: "short",
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const REPORTDATA = aoiReportData.data;

    // 4. Run Report → Book XML format
    const aoiReport = await axios.post(
      url,
      {
        SERVICE: "report",
        REQUEST: "getreport",
        SHORTFORMDATA: JSON.stringify(REPORTDATA),
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const REPORTXML = aoiReport.data;
    if (!REPORTXML) {
      return res.status(502).json({ error: "Failed to fetch report", raw: aoiReport.data });
    }

    // Convert XML → JSON
    const REPORTJSON = await xml2js.parseStringPromise(REPORTXML);
    if (!REPORTJSON) {
      return res.status(502).json({ error: "Failed to convert report XML" });
    }

    // Parse soils
    const soils = parseAndSortSoils(REPORTJSON);
    if (!soils || soils.length === 0) {
      return res.status(404).json({ error: "No soils found in selected area." });
    }

    // Return top soil AND the full list
    return res.status(200).json({
      ok: true,
      dominant: soils[0],
      allsoils: soils,
    });
  } catch (err) {
    console.error("SDA ERROR:", err.response?.data || err.message);
    res.status(500).json({
      error: "SoilDB service failure",
      details: err.response?.data || err.message,
    });
  }
});

// ==========================
// FIXED: Proper port binding
// ==========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
