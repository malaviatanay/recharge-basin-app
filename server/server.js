import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// ✅ Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// ✅ Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ USDA SoilDB endpoint
app.post("/api/soil", async (req, res) => {
  try {
    const coords = req.body.coordinates;
    if (!coords || coords.length < 3) {
      return res.status(400).json({ ok: false, error: "Invalid coordinates" });
    }

    // Round to 5 decimals for USDA API stability
    const rounded = coords.map(([lat, lng]) => [
      Number(lat.toFixed(5)),
      Number(lng.toFixed(5)),
    ]);

    // Build Well-Known Text (WKT) polygon
    const polygon = `POLYGON((${rounded
      .map(([lat, lng]) => `${lng} ${lat}`)
      .join(", ")}))`;

    console.log("🛰️ USDA SoilDB polygon query:", polygon);

    // USDA SDA SQL query
    const query = `
      SELECT TOP 10
        mu.mukey,
        mu.muname,
        mu.musym,
        ROUND(mu.musurfareaacres, 2) AS muacres
      FROM mapunit mu
      WHERE mu.mukey IN (
        SELECT DISTINCT mukey
        FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('${polygon}')
      )
    `;

    const response = await axios.post(
      "https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest",
      { query }
    );

    const soilData = response.data?.Table || [];

    if (!soilData.length) {
      console.warn("⚠️ SoilDB returned no data for polygon.");
      return res.json({
        ok: false,
        message:
          "No soil data found for this area. Try drawing a larger rectangle (1–2 km).",
      });
    }

    res.json({ ok: true, data: soilData });
  } catch (err) {
    console.error("❌ USDA SoilDB API error:", err.message);
    res.status(500).json({
      ok: false,
      error: "Failed to fetch soil data from USDA SoilDB.",
    });
  }
});

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.send("Recharge Basin API is running 🚀");
});

// ✅ Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
