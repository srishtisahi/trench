const path = require("path");
const express = require("express");
const { getTechnicalsSnapshot, TIMEFRAMES } = require("./src/technicals");
const { STOCKS, normalizeTicker, isValidTickerSymbol } = require("./src/stocks");

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_TTL_MS = 30 * 1000;
const snapshotCache = new Map();

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/stocks", (_req, res) => {
  res.json({ stocks: STOCKS });
});

app.get("/api/timeframes", (_req, res) => {
  res.json({ timeframes: TIMEFRAMES });
});

app.get("/api/technicals", async (req, res) => {
  const ticker = normalizeTicker(req.query.ticker || "NVDA");
  const timeframe = String(req.query.timeframe || "1D").trim().toUpperCase();
  const cacheKey = `${ticker}:${timeframe}`;

  if (!isValidTickerSymbol(ticker)) {
    return res.status(400).json({
      error: "Enter a valid ticker symbol.",
    });
  }

  try {
    const cached = snapshotCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.payload);
    }

    const payload = await getTechnicalsSnapshot(ticker, timeframe);
    snapshotCache.set(cacheKey, {
      payload,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    res.json(payload);
  } catch (error) {
    const message = error.message || "Unable to load technical data for this ticker.";
    const statusCode =
      /unable to fetch|fetch failed|getaddrinfo|timed out/i.test(message) ? 502 : 400;

    res.status(statusCode).json({
      error: message,
    });
  }
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Trench running at http://localhost:${PORT}`);
});
