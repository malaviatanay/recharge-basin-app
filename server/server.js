// ✅ Stable SoilDB (USDA SDA) endpoint
app.post("/api/soil", async (req, res) => {
  try {
    const coords = req.body.coordinates;
    if (!coords || coords.length < 3) {
      return res.status(400).json({ ok: false, error: "Invalid coordinates" });
    }

    // ✅ Round to 5 decimals (SoilDB fails with too many)
    const rounded = coords.map(([lat, lng]) => [
      Number(lat.toFixed(5)),
      Number(lng.toFixed(5)),
    ]);

    // ✅ Build Well-Known Text polygon (lng first)
    const polygon = `POLYGON((${rounded
      .map(([lat, lng]) => `${lng} ${lat}`)
      .join(", ")}))`;

    console.log("🛰️ USDA SoilDB polygon query:", polygon);

    // ✅ SDA SQL query
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

    // ✅ Send request
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
          "No soil data found for this area. Try drawing a slightly larger rectangle (1–2 km).",
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
