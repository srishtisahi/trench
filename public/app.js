const elements = {
  form: document.getElementById("ticker-form"),
  input: document.getElementById("ticker-input"),
  companyName: document.getElementById("company-name"),
  symbolChip: document.getElementById("symbol-chip"),
  exchangeLabel: document.getElementById("exchange-label"),
  marketState: document.getElementById("market-state"),
  priceCurrent: document.getElementById("price-current"),
  priceChange: document.getElementById("price-change"),
  timeframeBar: document.getElementById("timeframe-bar"),
  oscillatorsGauge: document.getElementById("oscillators-gauge"),
  summaryGauge: document.getElementById("summary-gauge"),
  maGauge: document.getElementById("ma-gauge"),
  oscillatorsTable: document.getElementById("oscillators-table"),
  movingAveragesTable: document.getElementById("moving-averages-table"),
  pivotHeadRow: document.getElementById("pivot-head-row"),
  pivotTable: document.getElementById("pivot-table"),
  updatedAt: document.getElementById("updated-at"),
  gaugeTemplate: document.getElementById("gauge-template"),
  statusBanner: document.getElementById("status-banner"),
  stockList: document.getElementById("stock-list"),
  savedStocks: document.getElementById("saved-stocks"),
  recentStocks: document.getElementById("recent-stocks"),
  stockGroups: document.getElementById("stock-groups"),
  stockFilterInput: document.getElementById("stock-filter-input"),
  tickerSuggestions: document.getElementById("ticker-suggestions"),
  submitButton: document.querySelector("#ticker-form button"),
  saveSymbolButton: document.getElementById("save-symbol-button"),
  copyLinkButton: document.getElementById("copy-link-button"),
  snapshotGrid: document.getElementById("snapshot-grid"),
};

const INITIAL_STOCKS = [
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

const INITIAL_TIMEFRAMES = [
  { key: "1M", label: "1 minute" },
  { key: "5M", label: "5 minutes" },
  { key: "15M", label: "15 minutes" },
  { key: "30M", label: "30 minutes" },
  { key: "1H", label: "1 hour" },
  { key: "2H", label: "2 hours" },
  { key: "4H", label: "4 hours" },
  { key: "1D", label: "1 day" },
  { key: "1W", label: "1 week" },
  { key: "1MO", label: "1 month" },
];

const state = {
  ticker: "NVDA",
  timeframe: "1D",
  timeframes: [],
  stocks: [],
  recentTickers: [],
  savedTickers: [],
  stockFilter: "",
  activeGroup: "All",
  lastPayload: null,
  activeRequestId: 0,
  activeController: null,
};

const RECENT_TICKERS_KEY = "trench:recent-tickers";
const SAVED_TICKERS_KEY = "trench:saved-tickers";
let saveButtonResetTimer = null;
let copyButtonResetTimer = null;

function formatNumber(value, options = {}) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

function formatPrice(value, currency = "USD") {
  if (value == null || Number.isNaN(value)) return "—";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (_error) {
    return formatNumber(value);
  }
}

function normalizeTicker(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "-");
}

function setLoading(isLoading) {
  document.body.classList.toggle("is-loading", isLoading);
  elements.input.disabled = isLoading;
  elements.submitButton.disabled = isLoading;
}

function setStatus(message = "") {
  elements.statusBanner.textContent = message;
  elements.statusBanner.hidden = !message;
}

function flashButton(button, nextLabel, defaultLabel, timerName) {
  button.textContent = nextLabel;
  if (timerName === "save") {
    window.clearTimeout(saveButtonResetTimer);
    saveButtonResetTimer = window.setTimeout(() => {
      renderSavedTickers();
    }, 1400);
    return;
  }

  window.clearTimeout(copyButtonResetTimer);
  copyButtonResetTimer = window.setTimeout(() => {
    button.textContent = defaultLabel;
  }, 1400);
}

function actionClass(action) {
  return action.toLowerCase().replace(/\s+/g, "-");
}

function getStockMeta(symbol) {
  return state.stocks.find((stock) => stock.symbol === symbol) || { symbol, name: "", group: "Custom" };
}

function readStorage(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(normalizeTicker) : [];
  } catch (_error) {
    return [];
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {
    // Storage failure should not break the dashboard.
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_error) {
      const looksLikeHtml = /^\s*</.test(text);
      if (response.ok && looksLikeHtml) {
        throw new Error("API returned HTML instead of JSON. Restart the app and open http://localhost:3000.");
      }
      throw new Error(response.ok ? "Unexpected server response." : "Request failed.");
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status}).`);
  }

  return data;
}

function renderGauge(target, summary) {
  target.innerHTML = "";
  const node = elements.gaugeTemplate.content.firstElementChild.cloneNode(true);
  const label = node.querySelector(".gauge-label");
  const progress = node.querySelector(".gauge-progress");
  const pointer = node.querySelector(".gauge-pointer");
  const sellCount = node.querySelector(".sell-count");
  const neutralCount = node.querySelector(".neutral-count");
  const buyCount = node.querySelector(".buy-count");

  label.textContent = summary.recommendation;
  label.style.color = summary.color;
  progress.style.stroke = summary.color;
  progress.style.strokeDasharray = "100";
  progress.style.strokeDashoffset = String(100 - Math.abs(summary.pointer) * 100);

  const angle = -90 + ((summary.pointer + 1) / 2) * 180;
  pointer.style.transform = `rotate(${angle}deg)`;
  pointer.style.transformOrigin = "110px 120px";
  pointer.style.stroke = summary.color;

  sellCount.textContent = `Sell ${summary.counts.sell}`;
  neutralCount.textContent = `Neutral ${summary.counts.neutral}`;
  buyCount.textContent = `Buy ${summary.counts.buy}`;

  target.appendChild(node);
}

function renderTable(target, rows) {
  target.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${row.name}</td>
          <td>${row.value == null ? "—" : formatNumber(row.value)}</td>
          <td><span class="action-pill ${actionClass(row.action)}">${row.action}</span></td>
        </tr>
      `
    )
    .join("");
}

function renderPivots(pivots) {
  elements.pivotHeadRow.innerHTML = ["<th>Pivot</th>", ...pivots.types.map((type) => `<th>${type}</th>`)].join("");
  elements.pivotTable.innerHTML = pivots.rows
    .map(
      (row) => `
        <tr>
          <td>${row.level}</td>
          ${row.values.map((value) => `<td>${value == null ? "—" : formatNumber(value)}</td>`).join("")}
        </tr>
      `
    )
    .join("");
}

function renderTimeframes() {
  elements.timeframeBar.innerHTML = state.timeframes
    .map(
      (frame) => `
        <button
          type="button"
          class="timeframe-pill ${frame.key === state.timeframe ? "active" : ""}"
          data-timeframe="${frame.key}"
        >
          ${frame.label}
        </button>
      `
    )
    .join("");
}

function renderSnapshot(data) {
  if (!data) {
    elements.snapshotGrid.innerHTML = "";
    return;
  }

  const cards = [
    {
      label: "Timeframe",
      value: data.timeframeLabel,
      tone: "neutral",
      detail: data.marketState,
    },
    {
      label: "Previous Close",
      value: formatPrice(data.price.previousClose, data.currency),
      tone: "neutral",
      detail: data.exchange || "Exchange unavailable",
    },
    {
      label: "Session Move",
      value:
        data.price.change == null
          ? "—"
          : `${data.price.change > 0 ? "+" : ""}${formatNumber(data.price.changePercent)}%`,
      tone:
        data.price.change == null
          ? "neutral"
          : data.price.change >= 0
            ? "buy"
            : "sell",
      detail:
        data.price.change == null
          ? "No price delta available"
          : `${data.price.change > 0 ? "+" : ""}${formatPrice(data.price.change, data.currency)}`,
    },
    {
      label: "Overall Bias",
      value: data.summaries.summary.recommendation,
      tone: actionClass(data.summaries.summary.recommendation.includes("Sell") ? "sell" : data.summaries.summary.recommendation.includes("Buy") ? "buy" : "neutral"),
      detail: `${data.summaries.summary.counts.buy} buy / ${data.summaries.summary.counts.sell} sell`,
    },
  ];

  elements.snapshotGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="snapshot-card ${card.tone}">
          <p class="snapshot-label">${card.label}</p>
          <p class="snapshot-value">${card.value}</p>
          <p class="snapshot-detail">${card.detail}</p>
        </article>
      `
    )
    .join("");
}

function getGroups() {
  const groups = new Set(state.stocks.map((stock) => stock.group || "Other"));
  return ["All", ...Array.from(groups).sort()];
}

function renderGroups() {
  elements.stockGroups.innerHTML = getGroups()
    .map(
      (group) => `
        <button
          type="button"
          class="group-pill ${group === state.activeGroup ? "active" : ""}"
          data-group="${group}"
        >
          ${group}
        </button>
      `
    )
    .join("");
}

function isSavedTicker(symbol) {
  return state.savedTickers.includes(symbol);
}

function getFilteredStocks() {
  const query = state.stockFilter.trim().toLowerCase();
  return state.stocks.filter((stock) => {
    const groupMatch = state.activeGroup === "All" || (stock.group || "Other") === state.activeGroup;
    const queryMatch =
      !query ||
      stock.symbol.toLowerCase().includes(query) ||
      stock.name.toLowerCase().includes(query) ||
      (stock.group || "").toLowerCase().includes(query);
    return groupMatch && queryMatch;
  });
}

function renderStockChips(target, stocks, emptyLabel, mode = "open") {
  if (!stocks.length) {
    target.innerHTML = `<span class="empty-inline">${emptyLabel}</span>`;
    return;
  }

  target.innerHTML = stocks
    .map((stock) => {
      const symbol = stock.symbol;
      const isActive = symbol === state.ticker;
      const removable = mode === "saved";
      return `
        <div class="stock-chip-shell">
          <button
            type="button"
            class="stock-chip ${isActive ? "active" : ""}"
            data-stock="${symbol}"
          >
            <span>${symbol}</span>
            ${stock.name ? `<small>${stock.name}</small>` : ""}
          </button>
          ${
            removable
              ? `<button type="button" class="chip-remove" data-remove-stock="${symbol}" aria-label="Remove ${symbol}">×</button>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

function renderSavedTickers() {
  const savedStocks = state.savedTickers.map(getStockMeta);
  renderStockChips(elements.savedStocks, savedStocks, "Save symbols from the current view.", "saved");
  elements.saveSymbolButton.textContent = isSavedTicker(state.ticker) ? "Saved" : "Save Symbol";
  elements.saveSymbolButton.classList.toggle("is-active", isSavedTicker(state.ticker));
}

function renderRecentTickers() {
  const recentStocks = state.recentTickers.map(getStockMeta);
  renderStockChips(elements.recentStocks, recentStocks, "No recent symbols yet.");
}

function renderStockList() {
  renderStockChips(elements.stockList, getFilteredStocks(), "No stocks match this filter.");
  elements.tickerSuggestions.innerHTML = state.stocks
    .map((stock) => `<option value="${stock.symbol}">${stock.name}</option>`)
    .join("");
}

function syncUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("ticker", state.ticker);
  url.searchParams.set("timeframe", state.timeframe);
  window.history.replaceState({}, "", url);
}

function saveRecentTicker(ticker) {
  state.recentTickers = [ticker, ...state.recentTickers.filter((item) => item !== ticker)].slice(0, 8);
  writeStorage(RECENT_TICKERS_KEY, state.recentTickers);
  renderRecentTickers();
}

function toggleSavedTicker(ticker = state.ticker) {
  const normalized = normalizeTicker(ticker);
  if (!normalized) return;

  setStatus("");

  if (isSavedTicker(normalized)) {
    state.savedTickers = state.savedTickers.filter((item) => item !== normalized);
    flashButton(elements.saveSymbolButton, "Removed", "Save Symbol", "save");
  } else {
    state.savedTickers = [normalized, ...state.savedTickers.filter((item) => item !== normalized)].slice(0, 12);
    flashButton(elements.saveSymbolButton, "Saved", "Save Symbol", "save");
  }

  writeStorage(SAVED_TICKERS_KEY, state.savedTickers);
  renderSavedTickers();
}

function removeSavedTicker(ticker) {
  state.savedTickers = state.savedTickers.filter((item) => item !== ticker);
  writeStorage(SAVED_TICKERS_KEY, state.savedTickers);
  renderSavedTickers();
}

function updateHeader(data) {
  setStatus("");
  state.ticker = data.symbol;
  state.lastPayload = data;
  elements.input.value = data.symbol;
  elements.companyName.textContent = data.companyName;
  elements.symbolChip.textContent = data.symbol;
  elements.exchangeLabel.textContent = data.exchange || "Exchange unavailable";
  elements.marketState.textContent = data.marketState;
  elements.priceCurrent.textContent = formatPrice(data.price.current, data.currency);

  const sign = data.price.change > 0 ? "+" : "";
  const changeText =
    data.price.change == null
      ? "—"
      : `${sign}${formatPrice(data.price.change, data.currency)} (${sign}${formatNumber(data.price.changePercent)}%)`;
  const priceDirection =
    data.price.change == null ? "" : data.price.change >= 0 ? "up" : "down";

  elements.priceChange.textContent = changeText;
  elements.priceChange.className = `price-change ${priceDirection}`.trim();
  elements.updatedAt.textContent = `Updated ${new Date(data.lastUpdated).toLocaleString()}`;
  renderSnapshot(data);
  renderSavedTickers();
}

async function loadStocks() {
  state.stocks = INITIAL_STOCKS.slice();
  renderGroups();
  renderStockList();
  renderSavedTickers();
  renderRecentTickers();
}

async function loadTimeframes() {
  state.timeframes = INITIAL_TIMEFRAMES.slice();
  renderTimeframes();
}

async function refreshMetadata() {
  try {
    const [stocksData, timeframesData] = await Promise.all([
      fetchJson("/api/stocks"),
      fetchJson("/api/timeframes"),
    ]);

    if (Array.isArray(stocksData.stocks) && stocksData.stocks.length) {
      state.stocks = stocksData.stocks;
      renderGroups();
      renderStockList();
      renderSavedTickers();
      renderRecentTickers();
    }

    if (Array.isArray(timeframesData.timeframes) && timeframesData.timeframes.length) {
      state.timeframes = timeframesData.timeframes;
      renderTimeframes();
    }
  } catch (_error) {
    // Keep client-side defaults if metadata endpoints are unavailable or stale.
  }
}

async function copyCurrentLink() {
  setStatus("");
  syncUrl();
  try {
    await navigator.clipboard.writeText(window.location.href);
    flashButton(elements.copyLinkButton, "Copied", "Copy Link", "copy");
  } catch (_error) {
    setStatus("Unable to copy link from this browser.");
  }
}

async function loadTechnicals({ replaceState = true } = {}) {
  const requestId = state.activeRequestId + 1;
  state.activeRequestId = requestId;
  state.activeController?.abort();
  state.activeController = new AbortController();

  setStatus("");
  setLoading(true);

  const query = new URLSearchParams({
    ticker: state.ticker,
    timeframe: state.timeframe,
  });

  try {
    const data = await fetchJson(`/api/technicals?${query.toString()}`, {
      signal: state.activeController.signal,
    });

    if (requestId !== state.activeRequestId) {
      return;
    }

    updateHeader(data);
    renderGauge(elements.oscillatorsGauge, data.summaries.oscillators);
    renderGauge(elements.summaryGauge, data.summaries.summary);
    renderGauge(elements.maGauge, data.summaries.movingAverages);
    renderTable(elements.oscillatorsTable, data.oscillators);
    renderTable(elements.movingAveragesTable, data.movingAverages);
    renderPivots(data.pivots);
    saveRecentTicker(data.symbol);
    renderStockList();

    if (replaceState) {
      syncUrl();
    }
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    setStatus(error.message || "Unable to load this ticker.");
  } finally {
    if (requestId === state.activeRequestId) {
      setLoading(false);
    }
  }
}

function openTicker(ticker, options = {}) {
  state.ticker = normalizeTicker(ticker) || "NVDA";
  elements.input.value = state.ticker;
  renderStockList();
  renderSavedTickers();
  renderRecentTickers();
  loadTechnicals(options);
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  openTicker(elements.input.value);
});

elements.timeframeBar.addEventListener("click", (event) => {
  const button = event.target.closest("[data-timeframe]");
  if (!button) return;

  state.timeframe = button.dataset.timeframe;
  renderTimeframes();
  loadTechnicals();
});

elements.stockList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-stock]");
  if (!button) return;
  openTicker(button.dataset.stock);
});

elements.savedStocks.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-stock]");
  if (removeButton) {
    removeSavedTicker(removeButton.dataset.removeStock);
    return;
  }

  const button = event.target.closest("[data-stock]");
  if (!button) return;
  openTicker(button.dataset.stock);
});

elements.recentStocks.addEventListener("click", (event) => {
  const button = event.target.closest("[data-stock]");
  if (!button) return;
  openTicker(button.dataset.stock);
});

elements.stockGroups.addEventListener("click", (event) => {
  const button = event.target.closest("[data-group]");
  if (!button) return;
  state.activeGroup = button.dataset.group;
  renderGroups();
  renderStockList();
});

elements.stockFilterInput.addEventListener("input", (event) => {
  state.stockFilter = event.target.value;
  renderStockList();
});

elements.saveSymbolButton.addEventListener("click", () => {
  toggleSavedTicker();
});

elements.copyLinkButton.addEventListener("click", () => {
  copyCurrentLink();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== elements.input && document.activeElement !== elements.stockFilterInput) {
    event.preventDefault();
    elements.input.focus();
    elements.input.select();
  }
});

window.addEventListener("popstate", () => {
  const params = new URLSearchParams(window.location.search);
  state.ticker = normalizeTicker(params.get("ticker") || "NVDA") || "NVDA";
  state.timeframe = (params.get("timeframe") || "1D").toUpperCase();

  if (!state.timeframes.some((frame) => frame.key === state.timeframe)) {
    state.timeframe = "1D";
  }

  elements.input.value = state.ticker;
  renderTimeframes();
  openTicker(state.ticker, { replaceState: false });
});

window.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  state.recentTickers = readStorage(RECENT_TICKERS_KEY);
  state.savedTickers = readStorage(SAVED_TICKERS_KEY);
  state.ticker = normalizeTicker(params.get("ticker") || "NVDA") || "NVDA";
  state.timeframe = (params.get("timeframe") || "1D").toUpperCase();
  elements.input.value = state.ticker;

  setLoading(true);

  try {
    await Promise.all([loadStocks(), loadTimeframes()]);
    refreshMetadata();

    if (!state.timeframes.some((frame) => frame.key === state.timeframe)) {
      state.timeframe = "1D";
    }

    renderTimeframes();
    renderSavedTickers();
    renderRecentTickers();
    await loadTechnicals();
  } catch (error) {
    setStatus(error.message || "Unable to load app metadata.");
    setLoading(false);
  }
});
