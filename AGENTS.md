# Session Context — Stock Price Alert App

## Goal
Build and ship a stock price alert mobile app with 5 requirements:
1. User auth (JWT login/register)
2. Stock browser (150+ stocks via Finnhub)
3. Candlestick chart (replaced with simple realtime line chart due to data limitations)
4. Custom price alerts (create/list/trigger)
5. Push notifications (FCM / Expo Push API)

## Why the Realtime Architecture Was Rebuilt

The first submission was rejected because:
- **Finnhub was called directly from the frontend** — the API key was exposed and every user would open their own WebSocket, exhausting the free tier's single-connection limit.
- **No realtime prices** — the chart showed zero points because there was no WebSocket integration.
- **No tests** — no backend tests at all.
- **Rate limiting missing** — no protection against abuse.
- **No fallback** — if Finnhub returned 429, the app crashed.

We rebuilt the entire realtime layer so **all market data flows through the backend**. Clients never touch Finnhub.

## Architecture

```
Frontend (Expo/React Native)
  |
  | HTTPS  | Socket.IO
  v         v
Backend (Node.js/Express)
  |
  | Finnhub WebSocket (1 connection) + REST /quote
  | PostgreSQL (Supabase / Prisma)
  v
Finnhub
```

### In-Memory Cache (PriceCache)
Every symbol has:
- `latestPrice`: `{ price, timestamp, open, high, low, previousClose, change, changePercent }`
- `history`: last 50 `{ price, timestamp }` points (for chart)
Cleared on server restart. Seeded on first subscribe via Finnhub `GET /quote`.

### Backend Realtime Module (3 services + 1 cache)

| File | Role |
|---|---|
| `finnhub-websocket.service.ts` | Single Finnhub WebSocket connection. Lazy connect on first subscription. Deduplicates subscriptions. Backs off 5 minutes on 429. |
| `finnhub-quote.service.ts` | HTTP `GET /quote` for initial hydration and periodic polling fallback. |
| `price-cache.ts` | In-memory `Map<symbol, { latestPrice, history }>`. |
| `socket.service.ts` | Socket.IO Server. Handles subscribe/unsubscribe/disconnect. Sets up polling interval (30s) for subscribed symbols (max 5). Broadcasts `stock:price`. |

### Why Not Candlestick Charts
The original requirement was a candlestick chart. Finnhub free tier only provides `GET /quote` (current price) and WebSocket trades. There is no free OHLCV history endpoint. A candlestick chart requires open/high/low/close per time interval (e.g., 1min, 5min). We would need a paid Finnhub plan ($15+/mo) or an alternative provider (e.g., Yahoo Finance, Alpha Vantage). Instead we implemented a realtime line chart using `react-native-chart-kit` with the last 50 price points.

### Quote Fields and the HTTP Quote Endpoint
The realtime `stock:price` payload includes `open`, `high`, `low`, `previousClose`, `change`, `changePercent` when available from the WebSocket or from the HTTP poll fallback. To ensure these fields always appear, we also created `GET /api/stocks/quote/:symbol` which calls Finnhub `/quote` directly. The frontend uses React Query to fetch this endpoint as a fallback when the realtime data hasn't arrived (quote fields show `-` until data appears).

## Realtime Flow (Step by Step)

1. `StocksScreen` loads -> backend returns stock list from `/api/stocks`.
2. `StocksScreen` mounts -> frontend Socket.IO connects to backend.
3. Frontend emits `stocks:subscribe { symbols: [AAPL, MSFT, NVDA, TSLA, AMZN] }`.
4. Backend `socket.service.ts` handles the event:
   a. Joins client to Socket.IO room per symbol.
   b. Returns cached snapshot via `stocks:snapshot`.
   c. If Finnhub WS is not open, opens it (lazy connect).
   d. Subscribes symbols to Finnhub WS (avoids duplicates).
   e. Hydrates each symbol via Finnhub HTTP `/quote` (seeds cache).
   f. Starts 30s interval: for each subscribed symbol, calls Finnhub `/quote` and broadcasts `stock:price`.
5. `StockDetailScreen` opens -> subscribes to specific symbol -> receives `stock:price` events.
6. Chart updates with each new price point (up to 50).
7. Countdown badge estimates seconds until next poll based on last tick timestamp.

## Finnhub Free Tier Constraints

| Limit | How We Stay Under |
|---|---|
| 1 WebSocket per API key | Single backend connection, shared by all clients |
| 60 REST req/min | Poll max 5 symbols every 30s = 10 req/min. Plus initial hydration and stock list = ~15-20 req/min |
| Sparse ticks outside market hours | Fallback HTTP polling ensures data arrives even without trades |

If 429 is hit:
- Stock list endpoint falls back to a demo list of 20 symbols.
- WebSocket enters a 5-minute backoff cooldown.
- HTTP polling continues (but respects rate limit headers).

## Rate Limiting (Express)

| Route | Limit | Scope |
|---|---|---|
| `/api/*` (global) | 120 requests per minute | IP address |
| `/api/auth/*` | 20 requests per 15 minutes | IP address |

Rate limit headers: `ratelimit-limit`, `ratelimit-remaining`, `ratelimit-reset` are returned on every response.

## Frontend State Management

| State | Tool | Purpose |
|---|---|---|
| Auth state | Zustand (`auth.store.ts`) | JWT token, user info, login/register/logout actions |
| Realtime prices | Zustand (`realtime.store.ts`) | WebSocket connection, price cache, subscriptions, history |
| Server data (stocks, alerts, quote) | React Query | HTTP fetch, caching, refetch, stale-while-revalidate |

### Zustand Realtime Store Design

The store uses a `Map<symbol, { price, timestamp }>` inside Zustand. The challenge was avoiding infinite re-renders when reading arrays from Zustand. The solution: export a const `EMPTY_HISTORY = []` outside the store and return it whenever history is empty, so the reference never changes.
```typescript
const EMPTY_HISTORY: PricePoint[] = [];
// in selector:
history: state.priceHistory[symbol] ?? EMPTY_HISTORY,
```

## Alert Evaluation

The evaluator (`backend/src/modules/alerts/evaluator.ts`) is a `setInterval` that runs every 60 seconds:
1. Queries all `ACTIVE` alerts from PostgreSQL.
2. Groups by symbol.
3. For each symbol, calls Finnhub `/quote`.
4. If `currentPrice >= targetPrice`, marks alert as `TRIGGERED`.
5. Sends push notification via:
   - Expo Push API if the token has `platform: 'expo'`
   - Firebase Admin SDK (`fcm`) if the token has `platform: 'fcm'`

## Push Notifications

### Notification Registration
```typescript
// frontend/src/services/notifications/register.ts
if (Constants.appOwnership === 'expo') {
  // Expo Go: use Expo Push API
  const { status } = await Notifications.getPermissionsAsync();
  const { data: token } = await Notifications.getExpoPushTokenAsync();
} else {
  // Production APK: use Firebase Cloud Messaging
  const { default: messaging } = await import('@react-native-firebase/messaging');
  const token = await messaging().getToken();
}
```

### Backend Sending
```typescript
// backend uses firebase-admin SDK
import admin from 'firebase-admin';
await admin.messaging().send({ token, notification: { title, body } });
// OR for Expo tokens:
await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', body: { to: token, title, body } });
```

## Key Technical Decisions

1. **Zustand over Redux** — lighter, less boilerplate, sufficient for this app's state complexity.
2. **React Query for HTTP data** — handles caching, refetching, loading/error states without custom hooks.
3. **Socket.IO over raw WebSocket** — rooms, automatic reconnection, fallback to HTTP long-polling built in.
4. **In-memory cache instead of database** — performance and simplicity; prices are ephemeral and don't need persistence.
5. **Finnhub WebSocket + HTTP fallback** — WebSocket for live trades; HTTP "/quote" for hydration and when markets are quiet.
6. **Lazy WebSocket connection** — the Finnhub WS only opens after the first client subscribes, saving resources when no one is watching.
7. **30-second polling** — balances Finnhub rate limits with responsiveness.
8. **5 subscribed symbols max** — keeps HTTP polling under 10 req/min (plus stock list and hydration).
9. **Demo symbol fallback** — if Finnhub stock list endpoint returns 429, we serve 20 hardcoded liquid symbols.
10. **react-native-chart-kit over victory-native** — simpler API and fewer native dependencies.

## Common Interview Questions

### Q: How do you handle Finnhub rate limits?
**A:** In three ways. (1) The single WebSocket connection is shared across all clients, avoiding duplicate connections. (2) HTTP polling is capped at 5 symbols every 30s (10 req/min). (3) If a 429 is received, the stock list falls back to demo symbols and the WebSocket enters a 5-minute backoff.

### Q: Why did you change from candlestick to line chart?
**A:** Finnhub's free tier only provides current price data (via /quote and WebSocket ticks). Candlestick charts require historical OHLCV data (open/high/low/close per interval), which requires a paid plan. I replaced it with a realtime line chart that shows the last 50 price points, which is more useful for a demo anyway.

### Q: How does Socket.IO scale with multiple users?
**A:** Socket.IO uses rooms — each symbol has a room. When a price update arrives, we broadcast only to the room for that symbol, not to all connected clients. This is efficient. The bottleneck is Finnhub (1 WS, 60 req/min), not Socket.IO.

### Q: How do you ensure push notifications work in both Expo Go and production APK?
**A:** The app detects at runtime whether it's running in Expo Go (`Constants.appOwnership === 'expo'`). In Expo Go, we use the Expo Push API. In a production APK, we dynamically import `@react-native-firebase/messaging` and get an FCM token. The backend stores the token with its platform type and sends via the appropriate API.

### Q: How do you handle cold starts on Render?
**A:** Render free tier spins down after 15 minutes of inactivity. The first request takes 30-60s to boot. Socket.IO clients see "Offline" during this time. Once the backend is up, the in-memory cache is empty, but the first client subscribe triggers Finnhub hydration, so prices appear within seconds. The WebSocket to Finnhub also opens lazily.

### Q: How does the chart work?
**A:** The PriceCache stores the last 50 `{ price, timestamp }` points per symbol. When the StockDetailScreen mounts, it emits `stock:history:get` and receives the full history. Each subsequent `stock:price` event appends a point. The chart renders a green line using `react-native-chart-kit` LineChart component with the Bezier curve style.

### Q: What would you improve with more time / a paid plan?
**A:**
- Replace line chart with real candlestick chart using a paid Finnhub plan or Polygon.io.
- Add WebSocket rooms for live chat or social features.
- Implement real order book depth.
- Add multi-language support.
- Replace in-memory cache with Redis for persistence across restarts.
- Add metrics/monitoring (Prometheus, Grafana).
- Add CI/CD pipeline with GitHub Actions (lint, test, deploy).

## Known Edge Cases

- **Market closed**: Finnhub returns `{"c": 308.82, "t": 1700000000000}` with the same price and a fresh timestamp. The chart shows a flat line. This is expected.
- **No data yet**: Quote fields show `-` (default value) before first data arrival. The React Query fallback fetches from `GET /api/stocks/quote/:symbol` to fill them.
- **Render restart**: In-memory cache is lost. Clients reconnect and resubscribe, triggering hydration again.
- **Socket.IO disconnect**: The client auto-reconnects and emits `stocks:subscribe` again.
- **Empty history**: Zustand selector returns a stable `EMPTY_HISTORY` reference to prevent infinite re-render loops.
- **Countdown badge**: Approximate — based on last tick timestamp + 30s. Client-side only, no server sync.
- **Alert ID format**: Accepts any non-empty string (the original code used CUID validation which blocked valid IDs from the frontend).

## Key Files Reference

### Backend
| File | What it does |
|---|---|
| `src/modules/realtime/finnhub-websocket.service.ts` | Single Finnhub WS connection, lazy connect, 429 backoff, subscribe/unsubscribe |
| `src/modules/realtime/finnhub-quote.service.ts` | HTTP /quote for hydration and polling fallback |
| `src/modules/realtime/socket.service.ts` | Socket.IO gateway: rooms, subscribe handler, broadcast, polling interval |
| `src/modules/realtime/price-cache.ts` | In-memory Map<symbol, { latestPrice, history }> |
| `src/modules/stocks/stocks.service.ts` | Stock list from Finnhub (cached), demo fallback, getQuote() |
| `src/modules/stocks/stocks.routes.ts` | GET /api/stocks, GET /api/stocks/search, GET /api/stocks/quote/:symbol |
| `src/modules/alerts/evaluator.ts` | Periodic alert evaluator, push notification sender |
| `src/middlewares/rate-limit.middleware.ts` | express-rate-limit config |
| `tests/` | health, schema validation, rate-limit header tests |

### Frontend
| File | What it does |
|---|---|
| `src/state/realtime.store.ts` | Zustand store: Socket.IO connect, subscribe, price cache, history |
| `src/screens/StockDetailScreen.tsx` | Line chart, quote stats grid, countdown badge, React Query quote fetch |
| `src/screens/StocksScreen.tsx` | Stock list with live price updates from Zustand |
| `src/api/stocksApi.ts` | fetchQuote(), fetchStocks() |
| `src/services/notifications/register.ts` | Token registration: Expo Go vs FCM detection |
| `src/providers/AuthProvider.tsx` | Auth context, token storage, auto-login |
