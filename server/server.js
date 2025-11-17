// ✅ Improved Soil Data Endpoint (USDA API with fallback buffer)
app.post("/api/soil", async (req, res) => {
  try {
    const coords = req.body.coordinates;
    if (!coords || coords.length < 3) {
      return res.status(400).json({ ok: false, error: "Invalid coordinates" });
    }

    // Compute bounding box
    const lats = coords.map((p) => p[0]);
    const lngs = coords.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Compute center for fallback (if bounding box returns no data)
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Build a polygon WKT string (for SDA query)
    const polygon = `POLYGON((${minLng} ${maxLat}, ${maxLng} ${maxLat}, ${maxLng} ${minLat}, ${minLng} ${minLat}, ${minLng} ${maxLat}))`;

    // USDA Soil Data Access SQL query
    const query = `
      SELECT mukey, muname, muacres
      FROM mapunit
      WHERE mukey IN (
        SELECT DISTINCT mukey
        FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('${polygon}')
      )
    `;

    const response = await axios.post(
      "https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest",
      { query }
    );

    let soilData = response.data?.Table || [];

    // ✅ Fallback: if no data found, query within 0.02-degree buffer (~2 km)
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
