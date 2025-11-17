// ---------- IMPORTS ----------
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// ---------- CREATE EXPRESS APP ----------
const app = express();
app.use(cors());
app.use(express.json());

// ---------- CONNECT TO MONGODB ----------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ---------- SCHEMA FOR FARMER ENTRIES ----------
const submissionSchema = new mongoose.Schema({
  landAcres: Number,
  infiltrationInPerDay: Number,
  rechargeDays: Number,
  avgBasinDepthFt: Number,
  capexPerAcre: Number,
  omPerAcreFoot: Number,
  waterPricePerAF: Number,
  pumpingKWhPerAF: Number,
  electricityPerKWh: Number,
  dateSubmitted: { type: Date, default: Date.now },
});

const Submission = mongoose.model("Submission", submissionSchema);

// ---------- CALCULATION ENDPOINT ----------
app.post("/api/calculate", async (req, res) => {
  try {
    const data = req.body;
    const entry = new Submission(data);
    await entry.save();

    const FT2_PER_ACRE = 43560;
    const IN_PER_FT = 12;
    const SEC_PER_DAY = 86400;

    const surfaceAreaFt2 = data.landAcres * FT2_PER_ACRE;
    const infilFtPerDay = data.infiltrationInPerDay / IN_PER_FT;
    const dailyAF = (surfaceAreaFt2 * infilFtPerDay) / FT2_PER_ACRE;
    const seasonalAF = dailyAF * data.rechargeDays;
    const excavationYd3 = (surfaceAreaFt2 * data.avgBasinDepthFt) / 27;

    const capex = data.capexPerAcre * data.landAcres;
    const revenue = seasonalAF * data.waterPricePerAF;
    const om = seasonalAF * data.omPerAcreFoot;
    const pumpingCost =
      seasonalAF * data.pumpingKWhPerAF * data.electricityPerKWh;
    const totalAnnualCost = om + pumpingCost;
    const netAnnual = revenue - totalAnnualCost;
    const simplePaybackYrs = netAnnual > 0 ? capex / netAnnual : Infinity;
    const cfs = (dailyAF * FT2_PER_ACRE) / SEC_PER_DAY;

    res.json({
      ok: true,
      results: {
        dailyAF,
        seasonalAF,
        excavationYd3,
        capex,
        revenue,
        om,
        pumpingCost,
        totalAnnualCost,
        netAnnual,
        simplePaybackYrs,
        cfs,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ---------- USDA SOIL DATA ENDPOINT ----------
app.post("/api/soil", async (req, res) => {
  try {
    const coords = req.body.coordinates;
    if (!coords || coords.length < 3) {
      return res
        .status(400)
        .json({ ok: false, error: "Invalid coordinates provided" });
    }

    const lats = coords.map((p) => p[0]);
    const lngs = coords.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    let expand = 0.02; // start with ~2 km buffer
    let soilData = [];

    // try progressively larger boxes until data appears or limit reached
    while (soilData.length === 0 && expand <= 0.1) {
      const poly = `POLYGON((
        ${minLng - expand} ${maxLat + expand},
        ${maxLng + expand} ${maxLat + expand},
        ${maxLng + expand} ${minLat - expand},
        ${minLng - expand} ${minLat - expand},
        ${minLng - expand} ${maxLat + expand}
      ))`;

      const query = `
        SELECT TOP 10 mukey, muname, muacres
        FROM mapunit
        WHERE mukey IN (
          SELECT DISTINCT mukey
          FROM SDA_Get_Mukey_from_intersection_with_WktWgs84_extent('${poly}')
        )
      `;

      const r = await axios.post(
        "https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest",
        { query }
      );

      soilData = r.data?.Table || [];
      expand += 0.01; // enlarge search radius ~1 km each time
    }

    if (!soilData.length)
      return res.json({
        ok: false,
        message: "No soil data found, even after expansion.",
      });

    res.json({ ok: true, data: soilData });
  } catch (err) {
    console.error("USDA API error:", err.message);
    res.status(500).json({ ok: false, error: "Failed to fetch soil data." });
  }
});

// ---------- HEALTH CHECK ----------
app.get("/", (req, res) => {
  res.send("Recharge Basin API is running 🚀");
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}`)
);
