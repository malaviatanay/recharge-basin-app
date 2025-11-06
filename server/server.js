import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

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
    // Save to MongoDB
    const entry = new Submission(data);
    await entry.save();

    // Use your same logic from calcEngine.js
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

// ✅ Health check
app.get("/", (req, res) => {
  res.send("Recharge Basin API is running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
