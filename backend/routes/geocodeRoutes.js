
const express = require("express");
const router = express.Router();

router.get("/search", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (query.length < 3) {
      return res.status(400).json({
        message: "Enter at least 3 characters."
      });
    }

    const url = new URL(
      "https://nominatim.openstreetmap.org/search"
    );

    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "lk");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, {
      headers: {
        "User-Agent": "RouteMate/1.0 (route search application)",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      return res.status(502).json({
        message: "Place search service is temporarily unavailable."
      });
    }

    const results = await response.json();

    const places = results.map((item) => ({
      placeName: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon)
    }));

    res.json({ results: places });

  } catch (error) {
    console.error("Nominatim search error:", error);

    res.status(500).json({
      message: "Unable to search for places."
    });
  }
});

module.exports = router;
