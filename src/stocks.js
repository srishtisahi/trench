const STOCKS = [
  { symbol: "NVDA", name: "NVIDIA", group: "AI" },
  { symbol: "MSFT", name: "Microsoft", group: "Software" },
  { symbol: "AAPL", name: "Apple", group: "Consumer Tech" },
  { symbol: "AMZN", name: "Amazon", group: "Retail Cloud" },
  { symbol: "META", name: "Meta", group: "Internet" },
  { symbol: "GOOGL", name: "Alphabet", group: "Internet" },
  { symbol: "ORCL", name: "Oracle", group: "Software" },
  { symbol: "CRM", name: "Salesforce", group: "Software" },
  { symbol: "ADBE", name: "Adobe", group: "Software" },
  { symbol: "NOW", name: "ServiceNow", group: "Software" },
  { symbol: "SNOW", name: "Snowflake", group: "Software" },
  { symbol: "AMD", name: "AMD", group: "Semis" },
  { symbol: "AVGO", name: "Broadcom", group: "Semis" },
  { symbol: "MU", name: "Micron", group: "Semis" },
  { symbol: "INTC", name: "Intel", group: "Semis" },
  { symbol: "QCOM", name: "Qualcomm", group: "Semis" },
  { symbol: "ARM", name: "Arm Holdings", group: "Semis" },
  { symbol: "TSM", name: "Taiwan Semiconductor", group: "Semis" },
  { symbol: "ASML", name: "ASML", group: "Semis" },
  { symbol: "TSLA", name: "Tesla", group: "Auto" },
  { symbol: "RIVN", name: "Rivian", group: "Auto" },
  { symbol: "GM", name: "General Motors", group: "Auto" },
  { symbol: "F", name: "Ford", group: "Auto" },
  { symbol: "NFLX", name: "Netflix", group: "Media" },
  { symbol: "DIS", name: "Disney", group: "Media" },
  { symbol: "ROKU", name: "Roku", group: "Media" },
  { symbol: "PLTR", name: "Palantir", group: "Software" },
  { symbol: "UBER", name: "Uber", group: "Mobility" },
  { symbol: "ABNB", name: "Airbnb", group: "Travel" },
  { symbol: "SHOP", name: "Shopify", group: "Commerce" },
  { symbol: "SQ", name: "Block", group: "Fintech" },
  { symbol: "PYPL", name: "PayPal", group: "Fintech" },
  { symbol: "COIN", name: "Coinbase", group: "Fintech" },
  { symbol: "JPM", name: "JPMorgan Chase", group: "Banks" },
  { symbol: "GS", name: "Goldman Sachs", group: "Banks" },
  { symbol: "V", name: "Visa", group: "Payments" },
  { symbol: "MA", name: "Mastercard", group: "Payments" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", group: "ETF" },
  { symbol: "QQQ", name: "Invesco QQQ", group: "ETF" },
  { symbol: "IWM", name: "iShares Russell 2000", group: "ETF" },
  { symbol: "SMH", name: "VanEck Semiconductor ETF", group: "ETF" },
  { symbol: "XLF", name: "Financial Select Sector SPDR", group: "ETF" },
  { symbol: "XLK", name: "Technology Select Sector SPDR", group: "ETF" },
  { symbol: "ARKK", name: "ARK Innovation ETF", group: "ETF" },
  { symbol: "DIA", name: "SPDR Dow Jones Industrial Average ETF", group: "ETF" },
  { symbol: "BRK-B", name: "Berkshire Hathaway B", group: "Conglomerate" },
  { symbol: "WMT", name: "Walmart", group: "Retail" },
  { symbol: "COST", name: "Costco", group: "Retail" },
  { symbol: "TGT", name: "Target", group: "Retail" },
  { symbol: "PFE", name: "Pfizer", group: "Healthcare" },
  { symbol: "LLY", name: "Eli Lilly", group: "Healthcare" },
  { symbol: "JNJ", name: "Johnson & Johnson", group: "Healthcare" },
  { symbol: "XOM", name: "Exxon Mobil", group: "Energy" },
  { symbol: "CVX", name: "Chevron", group: "Energy" },
];

const SYMBOL_ALIASES = {
  BRKB: "BRK-B",
  BRK_B: "BRK-B",
  BRKA: "BRK-A",
  BRK_A: "BRK-A",
  BF_B: "BF-B",
  BFB: "BF-B",
};

function normalizeTicker(input) {
  const raw = String(input || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  const cleaned = raw.replace(/_/g, "-");
  return SYMBOL_ALIASES[raw] || SYMBOL_ALIASES[cleaned] || cleaned;
}

function isValidTickerSymbol(input) {
  return /^[A-Z][A-Z0-9.-]{0,14}$/.test(input);
}

module.exports = {
  STOCKS,
  normalizeTicker,
  isValidTickerSymbol,
};
