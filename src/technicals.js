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
  "Strong Sell": "#ff5d5d",
  Sell: "#ff964f",
  Neutral: "#9aa7b8",
  Buy: "#23b98d",
  "Strong Buy": "#00c076",
};

function round(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return null;
  return Number(value.toFixed(digits));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

  if ([open, high, low, close].some((value) => !Number.isFinite(value))) {
    return null;
  }

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

  const alignedHalf = wmaHalf.slice(-wmaFull.length);
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
    R3: classicP + range,
    R2: classicP + (range * 0.618),
    R1: classicP + (range * 0.382),
    P: classicP,
    S1: classicP - (range * 0.382),
    S2: classicP - (range * 0.618),
    S3: classicP - range,
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

  if (unit === "d") start.setDate(start.getDate() - value);
  else if (unit === "mo") start.setMonth(start.getMonth() - value);
  else if (unit === "y") start.setFullYear(start.getFullYear() - value);
  else start.setFullYear(start.getFullYear() - 1);

  return start;
}

function triangularMembership(x, left, center, right) {
  if (x <= left || x >= right) return 0;
  if (x === center) return 1;
  if (x < center) return (x - left) / (center - left);
  return (right - x) / (right - center);
}

function leftShoulderMembership(x, left, right) {
  if (x <= left) return 1;
  if (x >= right) return 0;
  return (right - x) / (right - left);
}

function rightShoulderMembership(x, left, right) {
  if (x <= left) return 0;
  if (x >= right) return 1;
  return (x - left) / (right - left);
}

function buildMemberships(pointer) {
  const x = clamp(pointer, -1, 1);
  return {
    strongSell: round(leftShoulderMembership(x, -0.85, -0.45), 3),
    sell: round(triangularMembership(x, -0.85, -0.45, -0.05), 3),
    neutral: round(triangularMembership(x, -0.2, 0, 0.2), 3),
    buy: round(triangularMembership(x, 0.05, 0.45, 0.85), 3),
    strongBuy: round(rightShoulderMembership(x, 0.45, 0.85), 3),
  };
}

function labelFromMemberships(memberships) {
  const entries = [
    ["Strong Sell", memberships.strongSell],
    ["Sell", memberships.sell],
    ["Neutral", memberships.neutral],
    ["Buy", memberships.buy],
    ["Strong Buy", memberships.strongBuy],
  ];

  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function describeBias(pointer) {
  if (pointer >= 0.65) return "Strongly bullish regime";
  if (pointer >= 0.2) return "Bullish bias with supportive evidence";
  if (pointer <= -0.65) return "Strongly bearish regime";
  if (pointer <= -0.2) return "Bearish bias with downside pressure";
  return "Balanced signals with no dominant side";
}

function formatSigned(value) {
  if (value == null || Number.isNaN(value)) return "0";
  return `${value > 0 ? "+" : ""}${round(value, 2)}`;
}

function scoreFromAction(action) {
  if (action === "Buy") return 1;
  if (action === "Sell") return -1;
  return 0;
}

function buildRuleSet(derived) {
  const rules = [];
  const {
    rsi,
    macd,
    adx,
    currentPrice,
    sma50,
    ema20,
    ema50,
    ema200,
    momentum,
    williams,
    stochRsi,
  } = derived;

  if (rsi != null && macd?.histogram != null) {
    const strength = clamp(((35 - rsi) / 20 + macd.histogram / Math.max(Math.abs(macd.histogram), 1)) / 2, 0, 1);
    rules.push({
      title: "Oversold reversal",
      effect: strength > 0 ? "Buy" : "Neutral",
      strength: round(Math.max(0, strength), 2),
      description: "Low RSI combined with positive MACD histogram raises buy membership.",
    });
  }

  if (currentPrice != null && sma50 != null && ema200 != null) {
    const aboveTrend = currentPrice > sma50 && currentPrice > ema200;
    rules.push({
      title: "Trend alignment",
      effect: aboveTrend ? "Buy" : "Sell",
      strength: round(clamp(Math.abs(((currentPrice - sma50) / sma50) + ((currentPrice - ema200) / ema200)) * 3, 0, 1), 2),
      description: aboveTrend
        ? "Price is trading above medium and long moving-average baselines."
        : "Price is below one or more long-term trend baselines.",
    });
  }

  if (adx?.adx != null && adx?.pdi != null && adx?.mdi != null) {
    const trendStrength = clamp(adx.adx / 40, 0, 1);
    rules.push({
      title: "Directional strength",
      effect: adx.pdi >= adx.mdi ? "Buy" : "Sell",
      strength: round(trendStrength, 2),
      description:
        adx.pdi >= adx.mdi
          ? "Positive directional movement is leading while trend strength is established."
          : "Negative directional movement is dominating the established trend.",
    });
  }

  if (momentum != null && stochRsi?.k != null && williams != null) {
    const bullish = momentum > 0 && stochRsi.k < 35 && williams < -60;
    const bearish = momentum < 0 && stochRsi.k > 65 && williams > -40;
    rules.push({
      title: "Momentum exhaustion",
      effect: bullish ? "Buy" : bearish ? "Sell" : "Neutral",
      strength: round(
        clamp((Math.abs(momentum) / 8 + Math.abs(50 - stochRsi.k) / 50 + Math.abs(-50 - williams) / 50) / 3, 0, 1),
        2
      ),
      description:
        bullish
          ? "Momentum is positive while fast oscillators remain in a recovery zone."
          : bearish
            ? "Momentum weakens as fast oscillators remain stretched on the upside."
            : "Momentum and fast oscillators are not aligned strongly enough for a clear push.",
    });
  }

  if (ema20 != null && ema50 != null) {
    rules.push({
      title: "Short-term crossover pressure",
      effect: ema20 >= ema50 ? "Buy" : "Sell",
      strength: round(clamp(Math.abs((ema20 - ema50) / ema50) * 12, 0, 1), 2),
      description:
        ema20 >= ema50
          ? "Shorter moving average remains above the intermediate trend line."
          : "Shorter moving average remains below the intermediate trend line.",
    });
  }

  return rules
    .filter((rule) => rule.strength > 0)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5);
}

function buildTopDrivers(rows) {
  const normalized = rows.map((row) => ({
    name: row.name,
    action: row.action,
    weight: round(Math.abs(row.bias || scoreFromAction(row.action)), 2),
    detail: row.detail,
  }));

  return {
    bullish: normalized
      .filter((row) => row.action === "Buy")
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 4),
    bearish: normalized
      .filter((row) => row.action === "Sell")
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 4),
  };
}

function computeTrend(candles, currentPrice) {
  const sample = candles.slice(-24);
  const closes = sample.map((candle) => round(candle.close));
  const first = sample[0]?.close ?? currentPrice;
  const lastClose = sample[sample.length - 1]?.close ?? currentPrice;
  const high = sample.length ? Math.max(...sample.map((candle) => candle.high)) : currentPrice;
  const low = sample.length ? Math.min(...sample.map((candle) => candle.low)) : currentPrice;
  const changePercent = first ? ((lastClose - first) / first) * 100 : 0;
  const avg = closes.reduce((sum, value) => sum + value, 0) / Math.max(closes.length, 1);
  const variance =
    closes.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / Math.max(closes.length, 1);
  const volatility = avg ? (Math.sqrt(variance) / avg) * 100 : 0;
  const direction = changePercent > 1 ? "Uptrend" : changePercent < -1 ? "Downtrend" : "Sideways";

  return {
    closes,
    direction,
    changePercent: round(changePercent),
    support: round(low),
    resistance: round(high),
    volatility: round(volatility),
  };
}

function buildAiSummary({
  symbol,
  timeframeLabel,
  summaries,
  fuzzy,
  topDrivers,
  trend,
  currentPrice,
}) {
  const bullish = topDrivers.bullish[0];
  const bearish = topDrivers.bearish[0];
  const headline = `${symbol} shows a ${summaries.summary.recommendation.toLowerCase()} setup on the ${timeframeLabel} view.`;
  const body =
    fuzzy.label === "Neutral"
      ? `Signals are mixed, so the fuzzy engine keeps the output near neutral while monitoring whether price breaks support at ${round(trend.support)} or resistance at ${round(trend.resistance)}.`
      : `The defuzzified score is ${fuzzy.score}, which maps to ${fuzzy.label.toLowerCase()} with ${fuzzy.confidence}% confidence. Price is trading near ${round(currentPrice)} while the recent trend reads ${trend.direction.toLowerCase()}.`;

  const bullets = [
    bullish
      ? `${bullish.name} is the strongest bullish input with weight ${bullish.weight}. ${bullish.detail}`
      : "Bullish confirmation is limited, so upside confidence remains moderate.",
    bearish
      ? `${bearish.name} is the main bearish counter-signal with weight ${bearish.weight}. ${bearish.detail}`
      : "There is no dominant bearish driver strong enough to overturn the current bias.",
    `Oscillator vote is ${summaries.oscillators.recommendation.toLowerCase()} and moving-average vote is ${summaries.movingAverages.recommendation.toLowerCase()}, which explains the final blend.`,
  ];

  return { headline, body, bullets };
}

function computeIndicators(candles, symbol, timeframeLabel) {
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
  const aoSeries = AwesomeOscillator.calculate({
    high,
    low,
    fastPeriod: 5,
    slowPeriod: 34,
  });
  const ao = last(aoSeries);
  const aoPrev = last(aoSeries, 1);
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
      bias: rsi == null ? 0 : clamp((50 - rsi) / 30, -1, 1),
      detail:
        rsi == null
          ? "RSI unavailable."
          : `RSI at ${round(rsi)} suggests ${rsi < 30 ? "oversold" : rsi > 70 ? "overbought" : "mid-range"} conditions.`,
    },
    {
      name: "Stochastic %K (14, 3, 3)",
      value: round(stochastic?.k),
      action: signalFromBounds(stochastic?.k, 20, 80),
      bias: stochastic?.k == null ? 0 : clamp((50 - stochastic.k) / 30, -1, 1),
      detail:
        stochastic?.k == null
          ? "Fast stochastic unavailable."
          : `Fast stochastic at ${round(stochastic.k)} shows ${stochastic.k < 20 ? "oversold" : stochastic.k > 80 ? "overbought" : "balanced"} momentum.`,
    },
    {
      name: "Commodity Channel Index (20)",
      value: round(cci),
      action: signalFromBounds(cci, -100, 100),
      bias: cci == null ? 0 : clamp(-cci / 180, -1, 1),
      detail:
        cci == null
          ? "CCI unavailable."
          : `CCI at ${round(cci)} indicates ${cci < -100 ? "downside stretch" : cci > 100 ? "upside stretch" : "neutral price deviation"}.`,
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
      bias:
        adx?.adx == null || adx?.pdi == null || adx?.mdi == null
          ? 0
          : clamp(((adx.pdi - adx.mdi) / 25) * (adx.adx / 25), -1, 1),
      detail:
        adx?.adx == null
          ? "ADX unavailable."
          : `ADX ${round(adx.adx)} with +DI ${round(adx.pdi)} and -DI ${round(adx.mdi)} measures directional strength.`,
    },
    {
      name: "Awesome Oscillator",
      value: round(ao),
      action:
        ao == null || aoPrev == null ? "Neutral" : ao > aoPrev ? "Buy" : ao < aoPrev ? "Sell" : "Neutral",
      bias: ao == null ? 0 : clamp(ao / Math.max(Math.abs(ao), 1.5), -1, 1),
      detail:
        ao == null
          ? "Awesome Oscillator unavailable."
          : `AO is ${formatSigned(ao)} and ${aoPrev != null ? `${ao > aoPrev ? "rising" : ao < aoPrev ? "falling" : "flat"} versus the prior bar` : "has no prior comparison"}.`,
    },
    {
      name: "Momentum (10)",
      value: round(momentum),
      action: signalFromZero(momentum),
      bias: momentum == null ? 0 : clamp(momentum / 8, -1, 1),
      detail:
        momentum == null
          ? "Momentum unavailable."
          : `Rate of change at ${formatSigned(momentum)}% shows ${momentum > 0 ? "positive" : momentum < 0 ? "negative" : "flat"} momentum.`,
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
      bias:
        macd?.histogram == null
          ? 0
          : clamp(macd.histogram / Math.max(Math.abs(macd.histogram), 0.6), -1, 1),
      detail:
        macd?.MACD == null || macd?.signal == null
          ? "MACD unavailable."
          : `MACD ${round(macd.MACD)} versus signal ${round(macd.signal)} leaves histogram at ${round(macd.histogram)}.`,
    },
    {
      name: "Stochastic RSI Fast (3, 3, 14, 14)",
      value: round(stochRsi?.k),
      action: signalFromBounds(stochRsi?.k, 20, 80),
      bias: stochRsi?.k == null ? 0 : clamp((50 - stochRsi.k) / 30, -1, 1),
      detail:
        stochRsi?.k == null
          ? "Stochastic RSI unavailable."
          : `Stochastic RSI fast line at ${round(stochRsi.k)} shows ${stochRsi.k < 20 ? "recovery potential" : stochRsi.k > 80 ? "upside exhaustion" : "neutral fast momentum"}.`,
    },
    {
      name: "Williams Percent Range (14)",
      value: round(williams),
      action: signalFromBounds(williams, -80, -20),
      bias: williams == null ? 0 : clamp((-50 - williams) / 30, -1, 1),
      detail:
        williams == null
          ? "Williams %R unavailable."
          : `Williams %R at ${round(williams)} indicates ${williams < -80 ? "oversold pressure" : williams > -20 ? "overbought pressure" : "balanced positioning"}.`,
    },
    {
      name: "Bull Bear Power",
      value: round(bbPower),
      action: signalFromZero(bbPower),
      bias: bbPower == null ? 0 : clamp(bbPower / Math.max(Math.abs(bbPower), 1.5), -1, 1),
      detail:
        bbPower == null
          ? "Bull/Bear power unavailable."
          : `Bull/Bear Power at ${formatSigned(bbPower)} compares extremes against EMA-13.`,
    },
    {
      name: "Ultimate Oscillator (7, 14, 28)",
      value: round(ultimate),
      action: signalFromBounds(ultimate, 30, 70),
      bias: ultimate == null ? 0 : clamp((50 - ultimate) / 28, -1, 1),
      detail:
        ultimate == null
          ? "Ultimate Oscillator unavailable."
          : `Ultimate Oscillator at ${round(ultimate)} blends short, medium, and long pressure windows.`,
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
  ].map(([name, value]) => {
    const distance = value == null || currentPrice == null ? 0 : (currentPrice - value) / value;
    return {
      name,
      value: round(value),
      action: signalFromPrice(currentPrice, value),
      bias: clamp(distance * 18, -1, 1),
      detail:
        value == null
          ? `${name} unavailable.`
          : `Price is ${distance >= 0 ? "above" : "below"} ${name.toLowerCase()} by ${round(Math.abs(distance) * 100)}%.`,
    };
  });

  const oscillatorsSummary = summarize(oscillatorRows.map((row) => row.action));
  const movingAveragesSummary = summarize(movingAverageRows.map((row) => row.action));
  const overallSummary = summarize([
    ...oscillatorRows.map((row) => row.action),
    ...movingAverageRows.map((row) => row.action),
  ]);

  const memberships = buildMemberships(overallSummary.pointer);
  const fuzzyLabel = labelFromMemberships(memberships);
  const confidence = round(
    Math.max(...Object.values(memberships).map((value) => Number(value || 0))) * 100
  );
  const fuzzy = {
    score: round(overallSummary.pointer, 2),
    label: fuzzyLabel,
    confidence,
    memberships,
    biasText: describeBias(overallSummary.pointer),
  };

  const derived = {
    rsi,
    macd,
    adx,
    currentPrice,
    sma50,
    ema20,
    ema50,
    ema200,
    momentum,
    williams,
    stochRsi,
  };
  const rules = buildRuleSet(derived);
  const drivers = buildTopDrivers([...oscillatorRows, ...movingAverageRows]);
  const trend = computeTrend(candles, currentPrice);
  const aiSummary = buildAiSummary({
    symbol,
    timeframeLabel,
    summaries: {
      oscillators: oscillatorsSummary,
      movingAverages: movingAveragesSummary,
      summary: overallSummary,
    },
    fuzzy,
    topDrivers: drivers,
    trend,
    currentPrice,
  });

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
    fuzzy,
    rules,
    topDrivers: drivers,
    trend,
    aiSummary,
    signalMix: {
      bullish: overallSummary.counts.buy,
      bearish: overallSummary.counts.sell,
      neutral: overallSummary.counts.neutral,
    },
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
  const snapshotSymbol = String(quote?.symbol || symbol).toUpperCase();
  const computed = computeIndicators(candles, snapshotSymbol, config.label);
  const previousClose = quote?.regularMarketPreviousClose ?? last(candles, 1)?.close ?? null;
  const currentPrice = quote?.regularMarketPrice ?? computed.currentPrice;
  const delta = previousClose == null ? null : currentPrice - previousClose;
  const percentChange = previousClose ? (delta / previousClose) * 100 : null;

  return {
    symbol: snapshotSymbol,
    companyName: quote?.longName || quote?.shortName || snapshotSymbol,
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
