const path = require("path");
const express = require("express");
const { getTechnicalsSnapshot, TIMEFRAMES } = require("./src/technicals");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/timeframes", (_req, res) => {
  res.json({ timeframes: TIMEFRAMES });
});

app.get("/api/technicals", async (req, res) => {
  const ticker = String(req.query.ticker || "NVDA").trim().toUpperCase();
  const timeframe = String(req.query.timeframe || "1D").trim().toUpperCase();

  try {
    const payload = await getTechnicalsSnapshot(ticker, timeframe);
    res.json(payload);
  } catch (error) {
    res.status(400).json({
      error: error.message || "Unable to load technical data for this ticker.",
    });
  }
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Trench running at http://localhost:${PORT}`);
});
