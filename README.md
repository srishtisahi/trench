# Trench

Trench is a Node.js + Express stock technical-analysis dashboard that fetches market data from Yahoo Finance, computes technical indicators locally, and presents both traditional indicator summaries and a fuzzy-logic decision layer in a browser UI.

The app is designed as a single-server web application:

- The backend serves the static frontend and exposes JSON endpoints for stocks, timeframes, and technical snapshots.
- The frontend renders a terminal-style dashboard for symbol lookup, multi-timeframe analysis, watchlists, pivots, gauges, and fuzzy decision support.
- Indicator computation happens on the server using `technicalindicators`.

## What the project does

For a selected ticker and timeframe, Trench:

- Fetches OHLCV candle history and live quote metadata from Yahoo Finance.
- Computes oscillator and moving-average indicators locally.
- Aggregates indicator actions into buy, neutral, and sell summaries.
- Applies a fuzzy scoring model to convert mixed technical evidence into a graded recommendation.
- Explains the result with trend stats, signal drivers, activated fuzzy rules, and a local text summary.

The default symbol is `NVDA`, and the default timeframe is `1D`.

## Features

- Multi-timeframe technical analysis across `1M`, `5M`, `15M`, `30M`, `1H`, `2H`, `4H`, `1D`, `1W`, and `1MO`
- Ticker search with validation and support for aliases like `BRKB` -> `BRK-B`
- Preset symbol universe grouped by sector/theme
- Saved and recent tickers persisted in browser `localStorage`
- Shareable URL state via `ticker` and `timeframe` query parameters
- Oscillator summary gauge
- Moving-average summary gauge
- Combined overall summary gauge
- Pivot tables for Classic, Fibonacci, Camarilla, Woodie, and DM pivots
- Fuzzy inference panel with score, memberships, confidence, and regime label
- Trend pulse sparkline with support, resistance, volatility, and short-term direction
- Signal driver ranking for strongest bullish and bearish inputs
- Local “AI summary” text block generated from computed signals
- 30-second server-side snapshot cache per `ticker:timeframe`

## Tech stack

- Node.js
- Express 5
- `yahoo-finance2`
- `technicalindicators`
- Plain HTML, CSS, and vanilla JavaScript frontend

## How it works

### 1. Market data fetch

`src/technicals.js` selects a timeframe configuration, fetches candle history with `yf.chart(...)`, then fetches quote metadata with `yf.quote(...)`.

The timeframe config controls:

- Yahoo interval
- Historical range
- Optional candle aggregation for higher derived intervals like `2H` and `4H`

### 2. Indicator computation

The server computes:

- RSI
- Stochastic
- CCI
- ADX
- Awesome Oscillator
- ROC / Momentum
- MACD
- Stochastic RSI
- Williams %R
- Ultimate Oscillator
- Bull/Bear Power
- EMA 10/20/30/50/100/200
- SMA 10/20/30/50/100/200
- Ichimoku base line
- VWMA 20
- HMA 9

Each indicator is converted into:

- A numeric value
- A discrete action: `Buy`, `Neutral`, or `Sell`
- A bias score used for driver ranking and fuzzy interpretation
- A human-readable detail string

### 3. Summary scoring

The backend separately summarizes:

- Oscillators
- Moving averages
- Overall combined technicals

Those summaries count buy/sell/neutral votes and map them to:

- `Strong Sell`
- `Sell`
- `Neutral`
- `Buy`
- `Strong Buy`

### 4. Fuzzy inference layer

The project adds a soft-computing interpretation on top of standard votes.

It:

- Converts the overall pointer score into fuzzy memberships for `strongSell`, `sell`, `neutral`, `buy`, and `strongBuy`
- Derives a dominant fuzzy label
- Computes a confidence score from the strongest membership
- Activates simple explainable rules such as oversold reversal, trend alignment, directional strength, momentum exhaustion, and short-term crossover pressure

This makes mixed signals easier to interpret than a simple hard threshold system.

### 5. Frontend rendering

`public/app.js` fetches API data and renders:

- Header quote block
- Snapshot cards
- Summary gauges
- Oscillator table
- Moving-average table
- Pivot table
- Fuzzy score and memberships
- Trend sparkline and stats
- Signal drivers
- Activated rules
- Saved/recent/popular ticker chips

## Project structure

```text
trench/
├── package.json
├── server.js
├── src/
│   ├── stocks.js
│   └── technicals.js
└── public/
    ├── index.html
    ├── app.js
    └── styles.css
```

## Components

### Backend

#### `server.js`

- Starts the Express server
- Serves static files from `public/`
- Exposes API routes
- Caches technical snapshots for 30 seconds
- Falls back to `public/index.html` for all non-API routes

#### `src/stocks.js`

- Defines the preset stock list shown in the UI
- Normalizes ticker symbols
- Validates user ticker input
- Handles common symbol aliases

#### `src/technicals.js`

- Defines supported timeframes
- Fetches Yahoo Finance chart and quote data
- Sanitizes and aggregates candle data
- Computes indicators, summaries, pivots, trend stats, fuzzy memberships, rules, and explanation text
- Returns a single technical snapshot payload used by the frontend

### Frontend

#### `public/index.html`

- Defines the dashboard layout and sections
- Contains containers for gauges, tables, fuzzy panels, watchlists, and summary blocks

#### `public/app.js`

- Manages client-side state
- Loads stocks, timeframes, and technical data
- Syncs URL query parameters
- Persists saved and recent tickers in `localStorage`
- Renders all dynamic UI sections
- Handles form submissions, timeframe changes, keyboard shortcuts, and watchlist interactions

#### `public/styles.css`

- Provides the full visual design
- Implements the terminal-style layout, cards, gauges, chip lists, tables, and responsive behavior

## API endpoints

### `GET /api/stocks`

Returns the preset stock universe:

```json
{
  "stocks": [
    { "symbol": "NVDA", "name": "NVIDIA", "group": "AI" }
  ]
}
```

### `GET /api/timeframes`

Returns the supported timeframe list:

```json
{
  "timeframes": [
    { "key": "1D", "label": "1 day" }
  ]
}
```

### `GET /api/technicals?ticker=NVDA&timeframe=1D`

Returns the full computed technical snapshot for the selected ticker and timeframe, including:

- Quote metadata
- Price change
- Indicator summaries
- Oscillator rows
- Moving-average rows
- Pivot levels
- Fuzzy score and memberships
- Trend stats
- Top drivers
- Activated rules
- AI summary text

## Setup

### Prerequisites

- Node.js 18+ recommended
- npm

### Install dependencies

```bash
npm install
```

### Start the app

```bash
npm start
```

The server starts on `http://localhost:3000` by default.

You can override the port with:

```bash
PORT=4000 npm start
```

## Usage

1. Start the server with `npm start`.
2. Open `http://localhost:3000`.
3. Search for a ticker symbol like `NVDA`, `AAPL`, or `SPY`.
4. Switch timeframes from the summary section.
5. Review the fuzzy score, trend pulse, indicators, pivots, and driver breakdown.
6. Save symbols or share a link using the current `ticker` and `timeframe`.

### Keyboard shortcut

- Press `/` to focus the ticker search input when the search fields are not already active.

## Data flow summary

1. The browser loads the static app from Express.
2. The client requests `/api/stocks` and `/api/timeframes`.
3. The client requests `/api/technicals?ticker=...&timeframe=...`.
4. The server fetches market data from Yahoo Finance.
5. The server computes indicators and fuzzy outputs.
6. The server returns a snapshot JSON payload.
7. The frontend renders the dashboard and stores recent/saved symbols locally.

## Error handling

- Invalid ticker format returns HTTP `400`
- Unsupported or insufficient market data returns HTTP `400`
- Upstream fetch/network failures return HTTP `502`
- The frontend surfaces API errors in the status banner
- Client-side metadata requests fall back to built-in stock and timeframe defaults if needed

## Notes and limitations

- This project depends on Yahoo Finance data availability and response stability.
- No authentication or database is used.
- Saved and recent tickers are browser-local only.
- There is no test suite or lint script currently configured in `package.json`.
- The local “AI summary” is template-driven text assembled from computed signals, not an external LLM call.
- The app is for analysis and educational use, not investment advice.

## Future improvement ideas

- Add charts with selectable candle history overlays
- Add tests for indicator calculation and API responses
- Add sorting/filtering controls for indicator tables
- Add more assets such as crypto, forex, or indices
- Add server-side persistence for saved watchlists
- Replace or augment the local summary generator with an LLM-backed explanation layer

## Run commands

```bash
npm start
```

