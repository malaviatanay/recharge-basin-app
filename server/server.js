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

    let expand = 0.02; // start ~2 km
    let soilData = [];

    // try progressively larger boxes until data appears or max reached
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
      expand += 0.01; // enlarge search radius 1 km each loop
    }

    if (!soilData.length)
      return res.json({ ok: false, message: "No soil data found in area." });

    res.json({ ok: true, data: soilData });
  } catch (err) {
    console.error("USDA API error:", err.message);
    res.status(500).json({ ok: false, error: "Failed to fetch soil data." });
  }
});
