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
};

const state = {
  ticker: "NVDA",
  timeframe: "1D",
  timeframes: [],
};

function formatNumber(value, options = {}) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

function formatPrice(value, currency = "USD") {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function setLoading(isLoading) {
  document.body.classList.toggle("is-loading", isLoading);
}

function actionClass(action) {
  return action.toLowerCase().replace(/\s+/g, "-");
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

function updateHeader(data) {
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
  elements.priceChange.textContent = changeText;
  elements.priceChange.className = `price-change ${data.price.change >= 0 ? "up" : "down"}`;
  elements.updatedAt.textContent = `Updated ${new Date(data.lastUpdated).toLocaleString()}`;
}

async function loadTimeframes() {
  const response = await fetch("/api/timeframes");
  const data = await response.json();
  state.timeframes = data.timeframes;
  renderTimeframes();
}

async function loadTechnicals({ replaceState = true } = {}) {
  setLoading(true);
  const query = new URLSearchParams({
    ticker: state.ticker,
    timeframe: state.timeframe,
  });

  try {
    const response = await fetch(`/api/technicals?${query.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load this ticker.");
    }

    updateHeader(data);
    renderGauge(elements.oscillatorsGauge, data.summaries.oscillators);
    renderGauge(elements.summaryGauge, data.summaries.summary);
    renderGauge(elements.maGauge, data.summaries.movingAverages);
    renderTable(elements.oscillatorsTable, data.oscillators);
    renderTable(elements.movingAveragesTable, data.movingAverages);
    renderPivots(data.pivots);

    if (replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.set("ticker", state.ticker);
      url.searchParams.set("timeframe", state.timeframe);
      window.history.replaceState({}, "", url);
    }
  } catch (error) {
    window.alert(error.message);
  } finally {
    setLoading(false);
  }
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  state.ticker = elements.input.value.trim().toUpperCase() || "NVDA";
  loadTechnicals();
});

elements.timeframeBar.addEventListener("click", (event) => {
  const button = event.target.closest("[data-timeframe]");
  if (!button) return;
  state.timeframe = button.dataset.timeframe;
  renderTimeframes();
  loadTechnicals();
});

window.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  state.ticker = (params.get("ticker") || "NVDA").toUpperCase();
  state.timeframe = (params.get("timeframe") || "1D").toUpperCase();
  elements.input.value = state.ticker;

  await loadTimeframes();
  renderTimeframes();
  await loadTechnicals({ replaceState: false });
});
