import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// ✅ initialize express before using `app`
const app = express();
app.use(cors());
app.use(express.json());

// ✅ connect MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Soil API endpoint (PUT THIS AFTER app IS DEFINED)
app.post("/api/soil", async (req, res) => {
  try {
    const coords = req.body.coordinates;
    if (!coords || coords.length < 3) {
      return res.status(400).json({ ok: false, error: "Invalid coordinates" });
    }

    const lats = coords.map((p) => p[0]);
    const lngs = coords.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const polygon = `POLYGON((${minLng} ${maxLat}, ${maxLng} ${maxLat}, ${maxLng} ${minLat}, ${minLng} ${minLat}, ${minLng} ${maxLat}))`;

    let query = `
      SELECT TOP 10 mukey, muname, muacres
      FROM mapunit
      WHERE mukey IN (
        SELECT DISTINCT mukey
        FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('${polygon}')
      )
    `;

    let response = await axios.post(
      "https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest",
      { query }
    );

    let soilData = response.data?.Table || [];

    if (!soilData.length) {
      console.warn("No data found for polygon, using buffer fallback...");
      const bufferQuery = `
        SELECT TOP 10 mukey, muname, muacres
        FROM mapunit
        WHERE mukey IN (
          SELECT DISTINCT mukey
          FROM SDA_Get_Mukey_from_intersection_with_WktWgs84(
            'POLYGON((
              ${centerLng - 0.02} ${centerLat + 0.02},
              ${centerLng + 0.02} ${centerLat + 0.02},
              ${centerLng + 0.02} ${centerLat - 0.02},
              ${centerLng - 0.02} ${centerLat - 0.02},
              ${centerLng - 0.02} ${centerLat + 0.02}
            ))'
          )
        )
      `;
      const fallbackResponse = await axios.post(
        "https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest",
        { query: bufferQuery }
      );
      soilData = fallbackResponse.data?.Table || [];
    }

    if (!soilData.length) {
      return res.json({
        ok: false,
        message: "No soil data found, even in nearby buffer area.",
      });
    }

    res.json({ ok: true, data: soilData });
  } catch (error) {
    console.error("❌ USDA API error:", error.message);
    res.status(500).json({ ok: false, error: "Failed to fetch soil data." });
  }
});

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.send("Recharge Basin API is running 🚀");
});

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
