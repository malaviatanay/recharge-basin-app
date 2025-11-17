app.post("/api/soil", async (req, res) => {
  try {
    const coords = req.body.coordinates;
    if (!coords || coords.length < 3) {
      return res.status(400).json({ ok: false, error: "Invalid coordinates" });
    }

    // Bounding box around the drawn rectangle
    const lats = coords.map((p) => p[0]);
    const lngs = coords.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // ✅ Expand the area to ensure USDA data is returned
    const expand = 0.02; // ~2 km
    const expandedPoly = `POLYGON((
      ${minLng - expand} ${maxLat + expand},
      ${maxLng + expand} ${maxLat + expand},
      ${maxLng + expand} ${minLat - expand},
      ${minLng - expand} ${minLat - expand},
      ${minLng - expand} ${maxLat + expand}
    ))`;

    // ✅ Use USDA extent-based function for higher reliability
    const query = `
      SELECT TOP 10 mukey, muname, muacres
      FROM mapunit
      WHERE mukey IN (
        SELECT DISTINCT mukey
        FROM SDA_Get_Mukey_from_intersection_with_WktWgs84_extent('${expandedPoly}')
      )
    `;

    const response = await axios.post(
      "https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest",
      { query }
    );

    const soilData = response.data?.Table || [];

    if (!soilData.length) {
      return res.json({
        ok: false,
        message: "No soil data found, even after expansion.",
      });
    }

    res.json({ ok: true, data: soilData });
  } catch (error) {
    console.error("❌ USDA API error:", error.message);
    res.status(500).json({ ok: false, error: "Failed to fetch soil data." });
  }
});
