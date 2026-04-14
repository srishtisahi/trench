const YahooFinance = require("yahoo-finance2").default;
const {
  RSI,
  Stochastic,
  CCI,
  ADX,
  AwesomeOscillator,
  MACD,
  StochasticRSI,
  WilliamsR,
  EMA,
  SMA,
  WMA,
  IchimokuCloud,
  ROC,
} = require("technicalindicators");

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const TIMEFRAMES = [
  { key: "1M", label: "1 minute", fetchInterval: "1m", range: "7d" },
  { key: "5M", label: "5 minutes", fetchInterval: "5m", range: "1mo" },
  { key: "15M", label: "15 minutes", fetchInterval: "15m", range: "1mo" },
  { key: "30M", label: "30 minutes", fetchInterval: "30m", range: "1mo" },
  { key: "1H", label: "1 hour", fetchInterval: "60m", range: "3mo" },
  { key: "2H", label: "2 hours", fetchInterval: "60m", range: "3mo", aggregate: 2 },
  { key: "4H", label: "4 hours", fetchInterval: "60m", range: "6mo", aggregate: 4 },
  { key: "1D", label: "1 day", fetchInterval: "1d", range: "1y" },
  { key: "1W", label: "1 week", fetchInterval: "1wk", range: "5y" },
  { key: "1MO", label: "1 month", fetchInterval: "1mo", range: "20y" },
];

const SUMMARY_SCALE = ["Strong Sell", "Sell", "Neutral", "Buy", "Strong Buy"];
const ACTION_COLORS = {
  "Strong Sell": "#ff4d57",
  Sell: "#ff7a2f",
  Neutral: "#9aa5b1",
  Buy: "#26a69a",
  "Strong Buy": "#00c076",
};

function round(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return null;
  return Number(value.toFixed(digits));
}

function last(array, offset = 0) {
  if (!Array.isArray(array) || array.length === 0) return null;
  return array[array.length - 1 - offset] ?? null;
}

function sanitizeCandle(point) {
  if (!point) return null;
  const open = Number(point.open);
  const high = Number(point.high);
  const low = Number(point.low);
  const close = Number(point.close);
  if ([open, high, low, close].some((value) => !Number.isFinite(value))) return null;
  return {
    date: new Date(point.date || point.timestamp || Date.now()).toISOString(),
    open,
    high,
    low,
    close,
    volume: Number.isFinite(Number(point.volume)) ? Number(point.volume) : 0,
  };
}

function aggregateCandles(candles, size) {
  if (!size || size <= 1) return candles;
  const result = [];

  for (let index = 0; index < candles.length; index += size) {
    const bucket = candles.slice(index, index + size);
    if (bucket.length < size) continue;

    result.push({
      date: bucket[bucket.length - 1].date,
      open: bucket[0].open,
      high: Math.max(...bucket.map((candle) => candle.high)),
      low: Math.min(...bucket.map((candle) => candle.low)),
      close: bucket[bucket.length - 1].close,
      volume: bucket.reduce((sum, candle) => sum + candle.volume, 0),
    });
  }

  return result;
}

function signalFromBounds(value, low, high) {
  if (value == null) return "Neutral";
  if (value <= low) return "Buy";
  if (value >= high) return "Sell";
  return "Neutral";
}

function signalFromPrice(close, value) {
  if (close == null || value == null) return "Neutral";
  if (close > value) return "Buy";
  if (close < value) return "Sell";
  return "Neutral";
}

function signalFromZero(value) {
  if (value == null) return "Neutral";
  if (value > 0) return "Buy";
  if (value < 0) return "Sell";
  return "Neutral";
}

function summarize(actions) {
  const counts = actions.reduce(
    (acc, action) => {
      if (action === "Buy") acc.buy += 1;
      else if (action === "Sell") acc.sell += 1;
      else acc.neutral += 1;
      return acc;
    },
    { buy: 0, sell: 0, neutral: 0 }
  );

  const score = counts.buy - counts.sell;
  const absolute = Math.abs(score);
  let recommendation = "Neutral";

  if (score >= 10) recommendation = "Strong Buy";
  else if (score >= 3) recommendation = "Buy";
  else if (score <= -10) recommendation = "Strong Sell";
  else if (score <= -3) recommendation = "Sell";

  const pointer = Math.max(-1, Math.min(1, score / Math.max(actions.length, 1)));

  return {
    recommendation,
    counts,
    score,
    pointer,
    color: ACTION_COLORS[recommendation],
  };
}

function vwma(closes, volumes, period) {
  if (closes.length < period || volumes.length < period) return null;
  const sliceClose = closes.slice(-period);
  const sliceVolume = volumes.slice(-period);
  const numerator = sliceClose.reduce(
    (sum, close, index) => sum + close * sliceVolume[index],
    0
  );
  const denominator = sliceVolume.reduce((sum, volume) => sum + volume, 0);
  return denominator ? numerator / denominator : null;
}

function hma(values, period) {
  if (values.length < period) return null;
  const half = Math.round(period / 2);
  const sqrt = Math.round(Math.sqrt(period));
  const wmaHalf = WMA.calculate({ period: half, values });
  const wmaFull = WMA.calculate({ period, values });

  if (!wmaHalf.length || !wmaFull.length) return null;

  const alignedHalf = wmaHalf.slice(-(wmaFull.length));
  const diff = wmaFull.map((value, index) => 2 * alignedHalf[index] - value);
  const hmaValues = WMA.calculate({ period: sqrt, values: diff });
  return last(hmaValues);
}

function ultimateOscillator(high, low, close) {
  if (close.length < 29) return null;
  const buyingPressure = [];
  const trueRange = [];

  for (let index = 0; index < close.length; index += 1) {
    const prevClose = index === 0 ? close[index] : close[index - 1];
    const minLow = Math.min(low[index], prevClose);
    const maxHigh = Math.max(high[index], prevClose);
    buyingPressure.push(close[index] - minLow);
    trueRange.push(maxHigh - minLow);
  }

  const average = (period) => {
    const bp = buyingPressure.slice(-period).reduce((sum, value) => sum + value, 0);
    const tr = trueRange.slice(-period).reduce((sum, value) => sum + value, 0);
    return tr ? bp / tr : 0;
  };

  return 100 * ((4 * average(7)) + (2 * average(14)) + average(28)) / 7;
}

function bullBearPower(high, low, close) {
  const ema13 = EMA.calculate({ period: 13, values: close });
  const basis = last(ema13);
  if (basis == null) return null;
  return Math.max(last(high) - basis, last(low) - basis);
}

function parseMarketState(state) {
  if (!state) return "Market status unavailable";
  if (state === "REGULAR") return "Market open";
  if (state === "POST" || state === "POSTPOST") return "Post-market";
  if (state === "PRE" || state === "PREPRE") return "Pre-market";
  if (state === "CLOSED") return "Market closed";
  return state;
}

function computePivots(candles) {
  const pivotSource = candles[candles.length - 2];
  if (!pivotSource) {
    return { types: ["Classic", "Fibonacci", "Camarilla", "Woodie", "DM"], rows: [] };
  }

  const high = pivotSource.high;
  const low = pivotSource.low;
  const close = pivotSource.close;
  const range = high - low;
  const classicP = (high + low + close) / 3;
  const woodieP = (high + low + 2 * close) / 4;
  const dmP =
    close < pivotSource.open
      ? (high + 2 * low + close) / 4
      : close > pivotSource.open
        ? (2 * high + low + close) / 4
        : classicP;

  const classic = {
    R3: high + 2 * (classicP - low),
    R2: classicP + range,
    R1: (2 * classicP) - low,
    P: classicP,
    S1: (2 * classicP) - high,
    S2: classicP - range,
    S3: low - 2 * (high - classicP),
  };

  const fibonacci = {
    R3: classicP + (range * 1),
    R2: classicP + (range * 0.618),
    R1: classicP + (range * 0.382),
    P: classicP,
    S1: classicP - (range * 0.382),
    S2: classicP - (range * 0.618),
    S3: classicP - (range * 1),
  };

  const camarilla = {
    R3: close + (range * 1.1) / 4,
    R2: close + (range * 1.1) / 6,
    R1: close + (range * 1.1) / 12,
    P: classicP,
    S1: close - (range * 1.1) / 12,
    S2: close - (range * 1.1) / 6,
    S3: close - (range * 1.1) / 4,
  };

  const woodie = {
    R3: high + 2 * (woodieP - low),
    R2: woodieP + range,
    R1: (2 * woodieP) - low,
    P: woodieP,
    S1: (2 * woodieP) - high,
    S2: woodieP - range,
    S3: low - 2 * (high - woodieP),
  };

  const dm = {
    R3: null,
    R2: null,
    R1: dmP * 2 - low,
    P: dmP,
    S1: dmP * 2 - high,
    S2: null,
    S3: null,
  };

  const levels = ["R3", "R2", "R1", "P", "S1", "S2", "S3"];
  return {
    types: ["Classic", "Fibonacci", "Camarilla", "Woodie", "DM"],
    rows: levels.map((level) => ({
      level,
      values: [
        round(classic[level]),
        round(fibonacci[level]),
        round(camarilla[level]),
        round(woodie[level]),
        round(dm[level]),
      ],
    })),
  };
}

function getPeriod1(range) {
  const now = new Date();
  const match = /^(\d+)(d|mo|y)$/i.exec(String(range).trim());
  const start = new Date(now);

  if (!match) {
    start.setFullYear(start.getFullYear() - 1);
    return start;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === "d") {
    start.setDate(start.getDate() - value);
  } else if (unit === "mo") {
    start.setMonth(start.getMonth() - value);
  } else if (unit === "y") {
    start.setFullYear(start.getFullYear() - value);
  } else {
    start.setFullYear(start.getFullYear() - 1);
  }

  return start;
}

function computeIndicators(candles) {
  if (candles.length < 30) {
    throw new Error("Not enough market history to calculate the technicals.");
  }

  const close = candles.map((candle) => candle.close);
  const high = candles.map((candle) => candle.high);
  const low = candles.map((candle) => candle.low);
  const volume = candles.map((candle) => candle.volume);
  const currentPrice = last(close);

  const rsi = last(RSI.calculate({ period: 14, values: close }));
  const stochastic = last(
    Stochastic.calculate({
      high,
      low,
      close,
      period: 14,
      signalPeriod: 3,
    })
  );
  const cci = last(CCI.calculate({ high, low, close, period: 20 }));
  const adx = last(ADX.calculate({ high, low, close, period: 14 }));
  const ao = last(
    AwesomeOscillator.calculate({
      high,
      low,
      fastPeriod: 5,
      slowPeriod: 34,
    })
  );
  const aoPrev = last(
    AwesomeOscillator.calculate({
      high: high.slice(0, -1),
      low: low.slice(0, -1),
      fastPeriod: 5,
      slowPeriod: 34,
    })
  );
  const momentum = last(ROC.calculate({ period: 10, values: close }));
  const macd = last(
    MACD.calculate({
      values: close,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    })
  );
  const stochRsi = last(
    StochasticRSI.calculate({
      values: close,
      rsiPeriod: 14,
      stochasticPeriod: 14,
      kPeriod: 3,
      dPeriod: 3,
    })
  );
  const williams = last(WilliamsR.calculate({ high, low, close, period: 14 }));
  const ultimate = ultimateOscillator(high, low, close);
  const bbPower = bullBearPower(high, low, close);
  const ema10 = last(EMA.calculate({ period: 10, values: close }));
  const sma10 = last(SMA.calculate({ period: 10, values: close }));
  const ema20 = last(EMA.calculate({ period: 20, values: close }));
  const sma20 = last(SMA.calculate({ period: 20, values: close }));
  const ema30 = last(EMA.calculate({ period: 30, values: close }));
  const sma30 = last(SMA.calculate({ period: 30, values: close }));
  const ema50 = last(EMA.calculate({ period: 50, values: close }));
  const sma50 = last(SMA.calculate({ period: 50, values: close }));
  const ema100 = last(EMA.calculate({ period: 100, values: close }));
  const sma100 = last(SMA.calculate({ period: 100, values: close }));
  const ema200 = last(EMA.calculate({ period: 200, values: close }));
  const sma200 = last(SMA.calculate({ period: 200, values: close }));
  const ichimoku = last(
    IchimokuCloud.calculate({
      high,
      low,
      conversionPeriod: 9,
      basePeriod: 26,
      spanPeriod: 52,
      displacement: 26,
    })
  );
  const vwma20 = vwma(close, volume, 20);
  const hma9 = hma(close, 9);

  const oscillatorRows = [
    {
      name: "Relative Strength Index (14)",
      value: round(rsi),
      action: signalFromBounds(rsi, 30, 70),
    },
    {
      name: "Stochastic %K (14, 3, 3)",
      value: round(stochastic?.k),
      action: signalFromBounds(stochastic?.k, 20, 80),
    },
    {
      name: "Commodity Channel Index (20)",
      value: round(cci),
      action: signalFromBounds(cci, -100, 100),
    },
    {
      name: "Average Directional Index (14)",
      value: round(adx?.adx),
      action:
        adx?.adx > 20
          ? adx.pdi > adx.mdi
            ? "Buy"
            : "Sell"
          : "Neutral",
    },
    {
      name: "Awesome Oscillator",
      value: round(ao),
      action: ao == null || aoPrev == null ? "Neutral" : ao > aoPrev ? "Buy" : ao < aoPrev ? "Sell" : "Neutral",
    },
    {
      name: "Momentum (10)",
      value: round(momentum),
      action: signalFromZero(momentum),
    },
    {
      name: "MACD Level (12, 26)",
      value: round(macd?.MACD),
      action:
        macd?.MACD == null || macd?.signal == null
          ? "Neutral"
          : macd.MACD > macd.signal
            ? "Buy"
            : macd.MACD < macd.signal
              ? "Sell"
              : "Neutral",
    },
    {
      name: "Stochastic RSI Fast (3, 3, 14, 14)",
      value: round(stochRsi?.k),
      action: signalFromBounds(stochRsi?.k, 20, 80),
    },
    {
      name: "Williams Percent Range (14)",
      value: round(williams),
      action: signalFromBounds(williams, -80, -20),
    },
    {
      name: "Bull Bear Power",
      value: round(bbPower),
      action: signalFromZero(bbPower),
    },
    {
      name: "Ultimate Oscillator (7, 14, 28)",
      value: round(ultimate),
      action: signalFromBounds(ultimate, 30, 70),
    },
  ];

  const movingAverageRows = [
    ["Exponential Moving Average (10)", ema10],
    ["Simple Moving Average (10)", sma10],
    ["Exponential Moving Average (20)", ema20],
    ["Simple Moving Average (20)", sma20],
    ["Exponential Moving Average (30)", ema30],
    ["Simple Moving Average (30)", sma30],
    ["Exponential Moving Average (50)", ema50],
    ["Simple Moving Average (50)", sma50],
    ["Exponential Moving Average (100)", ema100],
    ["Simple Moving Average (100)", sma100],
    ["Exponential Moving Average (200)", ema200],
    ["Simple Moving Average (200)", sma200],
    ["Ichimoku Base Line (9, 26, 52, 26)", ichimoku?.base],
    ["Volume Weighted Moving Average (20)", vwma20],
    ["Hull Moving Average (9)", hma9],
  ].map(([name, value]) => ({
    name,
    value: round(value),
    action: signalFromPrice(currentPrice, value),
  }));

  const oscillatorsSummary = summarize(oscillatorRows.map((row) => row.action));
  const movingAveragesSummary = summarize(movingAverageRows.map((row) => row.action));
  const overallSummary = summarize([
    ...oscillatorRows.map((row) => row.action),
    ...movingAverageRows.map((row) => row.action),
  ]);

  return {
    currentPrice: round(currentPrice),
    summaries: {
      oscillators: oscillatorsSummary,
      summary: overallSummary,
      movingAverages: movingAveragesSummary,
    },
    oscillators: oscillatorRows,
    movingAverages: movingAverageRows,
    pivots: computePivots(candles),
  };
}

async function fetchCandles(symbol, timeframe) {
  const config = TIMEFRAMES.find((item) => item.key === timeframe);
  if (!config) {
    throw new Error("Unsupported timeframe.");
  }

  const chart = await yf.chart(symbol, {
    interval: config.fetchInterval,
    period1: getPeriod1(config.range),
    period2: new Date(),
  });

  const quote = await yf.quote(symbol);
  const raw = (chart?.quotes || []).map(sanitizeCandle).filter(Boolean);
  const candles = aggregateCandles(raw, config.aggregate || 1);

  if (candles.length < 30) {
    throw new Error("Ticker returned insufficient data.");
  }

  return {
    candles,
    quote,
    meta: chart?.meta || {},
    timeframe: config,
  };
}

async function getTechnicalsSnapshot(symbol, timeframe) {
  const { candles, quote, meta, timeframe: config } = await fetchCandles(symbol, timeframe);
  const computed = computeIndicators(candles);
  const previousClose = quote?.regularMarketPreviousClose ?? last(candles, 1)?.close ?? null;
  const currentPrice = quote?.regularMarketPrice ?? computed.currentPrice;
  const delta = previousClose == null ? null : currentPrice - previousClose;
  const percentChange = previousClose ? (delta / previousClose) * 100 : null;

  return {
    symbol: String(quote?.symbol || symbol).toUpperCase(),
    companyName: quote?.longName || quote?.shortName || symbol.toUpperCase(),
    exchange: quote?.fullExchangeName || meta?.exchangeName || "",
    marketState: parseMarketState(quote?.marketState),
    currency: quote?.currency || meta?.currency || "USD",
    timeframe: config.key,
    timeframeLabel: config.label,
    lastUpdated: new Date().toISOString(),
    price: {
      current: round(currentPrice),
      previousClose: round(previousClose),
      change: round(delta),
      changePercent: round(percentChange),
    },
    ...computed,
    scale: SUMMARY_SCALE,
  };
}

module.exports = {
  getTechnicalsSnapshot,
  TIMEFRAMES,
};
