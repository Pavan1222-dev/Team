
const express = require("express");
const { getCityData } = require("../services/cityService");
const { getCache, setCache } = require("../utils/cache");

const router = express.Router();

router.get("/:name", async (req, res) => {
  const cityName = req.params.name.trim();
  const cacheKey = `city:${cityName.toLowerCase()}`;
  const refresh = req.query.refresh === "true";
  const startTime = Date.now();

  try {
    // 1. Check cache unless refresh=true
    if (!refresh) {
      const cachedData = getCache(cacheKey);

      if (cachedData) {
        res.set("X-Cache", "HIT");
        res.set(
          "X-Response-Time",
          `${Date.now() - startTime}ms`
        );

        return res.json({
          ...cachedData,
          cache: { hit: true },
        });
      }
    }

    // 2. Fetch fresh data
    const result = await getCityData(cityName);

    // 3. Store the result for 10 minutes
    setCache(cacheKey, result);

    res.set("X-Cache", "MISS");
    res.set(
      "X-Response-Time",
      `${Date.now() - startTime}ms`
    );

    return res.json({
      ...result,
      cache: { hit: false },
    });
  } catch (error) {
    console.error("City route error:", error.message);

    return res.status(500).json({
      error: "Unable to retrieve city data",
      message: error.message,
    });
  }
});

module.exports = router;
