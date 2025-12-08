import express from "express";
import axios from "axios";
import cors from "cors";
import xml2js from "xml2js";
import path from "path";

const app = express();
app.use(express.json());
app.use(cors());

function parseAndSortSoils(reportJSON) {
  try {
    const tbody = reportJSON?.section?.table?.[0]?.tbody?.[0];
    if (!tbody?.tr?.length) return null;

    const soils = tbody.tr
      .filter((row) => row.$?.class === "mapunit")
      .map((row) => {
        const text = row.td?.[0]?.para?.[0]?._ || "";
        const symbol = text.split("--")[0]?.trim();
        const desc = text.split("--")[1]?.trim() || "";
        const acresText = row.td?.[1]?.para?.[0]?._ || "";
        const acres = parseFloat(acresText.replace(/,/g, "")) || 0;
        return { symbol, desc, acres };
      });

    soils.sort((a, b) => b.acres - a.acres);
    return soils;
  } catch (err) {
    console.warn("Failed to parse soils:", err.message);
    return null;
  }
}

// Serve static files from the dist directory
// Use process.cwd() to get the project root (where npm start was run)
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

app.post("/soil", async (req, res) => {
  try {
    let ring = req.body.coordinates;

    if (!ring || ring.length < 4) {
      return res.status(400).json({ error: "Invalid coordinates from frontend." });
    }

    // convert lat/lon → lon/lat
    ring = ring.map(([lat, lon]) => [lon, lat]);

    // close ring
    if (JSON.stringify(ring[0]) !== JSON.stringify(ring[ring.length - 1])) {
      ring.push(ring[0]);
    }

    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "User selection" },
          geometry: { type: "Polygon", coordinates: [ring] },
        },
      ],
    };

    const url = "https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest";

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
    if (!AOIID)
      return res.status(500).json({ error: "AOI creation failed", raw: aoiResp.data });

    const catalog = await axios.post(
      url,
      {
        SERVICE: "report",
        REQUEST: "getcatalog",
        AOIID,
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const folders = catalog.data?.tables?.[0]?.folders;
    if (!folders) return res.status(500).json({ error: "Invalid catalog response" });

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

    const reportDataResp = await axios.post(
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

    const REPORTDATA = reportDataResp.data;

    const reportResp = await axios.post(
      url,
      {
        SERVICE: "report",
        REQUEST: "getreport",
        SHORTFORMDATA: JSON.stringify(REPORTDATA),
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const REPORTXML = reportResp.data;
    const REPORTJSON = await xml2js.parseStringPromise(REPORTXML);

    const soils = parseAndSortSoils(REPORTJSON);
    if (!soils || soils.length === 0)
      return res.status(404).json({ error: "No soils found." });

    res.json({
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

// Catch-all handler for client-side routing (SPA fallback)
// This runs after all other routes, so API routes won't be affected
app.use((_req, res) => {
  res.sendFile(path.join(process.cwd(), "dist/index.html"));
});

// required for Render
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
