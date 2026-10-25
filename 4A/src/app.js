
const express = require("express");
const cityRoutes = require("./routes/cityRoutes");
const { getCityData } = require("./services/cityService");
const { getCache, setCache } = require("./utils/cache");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Weather and Currency Aggregator API",
    endpoints: [
      "GET /city/:name",
      "GET /compare?cities=Hyderabad,Pune,Bengaluru",
    ],
  });
});

app.get("/test", (req, res) => {
  res.json({ message: "Test route is working" });
});

app.get("/compare", async (req, res) => {
  const cities = (req.query.cities || "")
    .split(",")
    .map((city) => city.trim())
    .filter(Boolean);

  if (cities.length === 0) {
    return res.status(400).json({
      error: "Please provide cities separated by commas",
    });
  }

  if (cities.length > 10) {
    return res.status(400).json({
      error: "Maximum 10 cities allowed per request",
    });
  }

  const refresh = req.query.refresh === "true";
  const startTime = Date.now();

  try {
    const results = await Promise.allSettled(
      cities.map(async (cityName) => {
        const key = `city:${cityName.toLowerCase()}`;

        if (!refresh) {
          const cached = getCache(key);

          if (cached) {
            return {
              ...cached,
              cache: { hit: true },
            };
          }
        }

        const result = await getCityData(cityName);
        setCache(key, result);

        return {
          ...result,
          cache: { hit: false },
        };
      })
    );

    const data = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }

      return {
        city: cities[index],
        weather: null,
        currency: null,
        warnings: [
          {
            service: "city",
            message: result.reason.message,
          },
        ],
      };
    });

    res.set("X-Response-Time", `${Date.now() - startTime}ms`);

    return res.json({
      count: data.length,
      results: data,
    });
  } catch (error) {
    console.error("Compare route error:", error.message);

    return res.status(500).json({
      error: "Unable to compare cities",
    });
  }
});

app.use("/city", cityRoutes);

module.exports = app;
