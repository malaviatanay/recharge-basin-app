import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios"; // ✅ NEW: for USDA API calls

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Simple Schema to save farmer entries
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

// ✅ Calculation endpoint
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
    const pumpingCost = seasonalAF * data.pumpingKWhPerAF * data.electricityPerKWh;
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

// ✅ NEW: Soil Data Endpoint (USDA API)
app.post("/api/soil", async (req, res) => {
  try {
    const coords = req.body.coordinates;
    if (!coords || coords.length < 3) {
      return res.status(400).json({ ok: false, error: "Invalid coordinates" });
    }

    // Convert polygon coordinates to WKT (Well-Known Text)
    const polygon = `POLYGON((${coords
      .map(([lat, lng]) => `${lng} ${lat}`)
      .join(", ")}))`;

    // USDA Soil Data Access (SDA) API SQL query
    const query = `
      SELECT mukey, muname, muacres
      FROM mapunit
      WHERE mukey IN (
        SELECT DISTINCT mukey
        FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('${polygon}')
      )
    `;

    // Send request to USDA SDA API
    const response = await axios.post(
      "https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest",
      { query }
    );

    if (response.data && response.data.Table && response.data.Table.length > 0) {
      res.json({ ok: true, data: response.data.Table });
    } else {
      res.json({ ok: false, message: "No soil data found for this area." });
    }
  } catch (error) {
    console.error("❌ USDA API error:", error.message);
    res.status(500).json({ ok: false, error: "Failed to fetch soil data." });
  }
});

// ✅ Health check
app.get("/", (req, res) => {
  res.send("Recharge Basin API is running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
