# Stock Alerts Challenge

Full-stack mobile stock alert app built with Expo/React Native, Node.js/Express, Socket.IO, Prisma, PostgreSQL, JWT auth, Finnhub market data, and push notifications.

The main realtime architecture is intentionally centralized on the backend:

```text
Finnhub WebSocket / Quote API
  -> Node.js backend
  -> in-memory latest price + 50-point history cache
  -> Socket.IO broadcast
  -> React Native clients
```

Clients never connect to Finnhub directly.

## Why This Architecture Matters

Finnhub permits only one WebSocket connection per API key. If the frontend opened a direct connection to Finnhub, every user session would create its own WebSocket, exhausting the limit immediately. By centralizing the connection on the backend:

- One WebSocket serves all clients.
- The backend controls subscription deduplication.
- The backend falls back to HTTP polling when the WebSocket is rate-limited.
- The frontend simply listens to Socket.IO events.

## Features

- JWT login/register with secure token storage.
- Stock browser with 150+ symbols from Finnhub (falls back to 20 demo symbols if rate-limited).
- Backend-owned realtime stock gateway (single Finnhub WebSocket).
- Socket.IO live price updates in React Native.
- In-memory latest price cache per symbol.
- In-memory last 50 price points per symbol for chart history.
- Simple realtime line chart with `react-native-chart-kit` (green line).
- Quote metadata: current price, change %, open, high, low, previous close.
- Tick countdown badge showing estimated seconds until next poll.
- Alert CRUD with Prisma/PostgreSQL persistence.
- Background alert evaluator (checks prices every 60s).
- Push notifications through Expo Push API or Firebase Admin SDK.
- Backend rate limiting (global 120/min, auth 20/15min).
- Backend tests for health, schema validation, and rate-limit middleware.

## Realtime Flow

1. React Native loads `/api/stocks` from the backend.
2. The frontend connects to the backend Socket.IO server.
3. The frontend emits `stocks:subscribe` with selected symbols.
4. The backend opens one Finnhub WebSocket connection lazily after the first subscription.
5. The backend subscribes to symbols on Finnhub and avoids duplicate subscriptions.
6. The backend hydrates initial prices with Finnhub `/quote` so the UI does not wait for live trades.
7. The backend stores latest price and recent history in memory (`PriceCache`).
8. The backend broadcasts `stock:price` events through Socket.IO rooms.
9. The frontend Zustand realtime store updates list prices and charts live.
10. A fallback HTTP `GET /api/stocks/quote/:symbol` is also available for fetching full quote data (open, high, low, previous close) when the realtime payload hasn't arrived yet.

## In-Memory Cache Structure

```typescript
// per symbol in priceCache:
{
  latestPrice: { price: 308.82, timestamp: 1700000000000, open: 305, high: 310, low: 304, previousClose: 306, change: 2.82, changePercent: 0.92 }
  history: [
    { price: 308.82, timestamp: 1700000000000 },
    { price: 308.82, timestamp: 1700000030000 },
    // ... up to 50 points
  ]
}
```

## Finnhub Free Tier Notes

Finnhub free tier has strict limits:

- 1 WebSocket connection per API key.
- 60 REST requests per minute.
- Trade ticks may be sparse outside market hours.

To keep the app stable:

- The backend subscribes to a small set of liquid symbols first: `AAPL`, `MSFT`, `NVDA`, `TSLA`, `AMZN`.
- The backend polls a maximum of 5 subscribed symbols every 30 seconds via HTTP `/quote`.
- If Finnhub returns 429 (rate limit), the backend stops requesting and waits.
- If the stock symbol list fails to load, the backend serves a static demo list of 20 liquid symbols.
- Quote fields (open, high, low, previous close) are fetched from Finnhub and cached.
- During closed market hours, ticks arrive with fresh timestamps but prices may remain unchanged.

## Deployment Notes

The backend is deployed on Render free tier. Render may spin down the service after inactivity.

Expected behavior:

- First request after inactivity can take 30-60 seconds (cold start).
- Socket.IO may show `Offline` until the backend wakes up.
- In-memory price history is reset on restart.
- Realtime resumes when clients reconnect and resubscribe.
- The WebSocket to Finnhub opens lazily when the first client subscribes.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Expo SDK 54, React Native, TypeScript |
| Navigation | React Navigation (native-stack) |
| State | React Query (server) + Zustand (local/realtime) |
| Realtime | Socket.IO client (frontend) + Socket.IO server (backend) |
| Charts | react-native-chart-kit (line chart) |
| HTTP Client | Axios |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL / Supabase |
| ORM | Prisma |
| Auth | JWT + bcryptjs |
| Market Data | Finnhub (WebSocket + REST) |
| Notifications | Expo Push API + Firebase Admin SDK |
| Validation | Zod |
| Rate Limiting | express-rate-limit |
| Testing | Vitest + Supertest |

## Folder Structure

```text
backend/
  prisma/
    schema.prisma
  src/
    config/
    middlewares/
      error.middleware.ts
      not-found.middleware.ts
      rate-limit.middleware.ts
      request-logger.middleware.ts
    modules/
      alerts/
      auth/
      health/
      notifications/
      realtime/
        finnhub-quote.service.ts
        finnhub-websocket.service.ts
        price-cache.ts
        socket.service.ts
      stocks/
    prisma/
    routes/
    app.ts
    server.ts
  tests/
    health.test.ts
    rate-limit.test.ts
    schemas.test.ts

frontend/
  src/
    api/
      alertsApi.ts
      client.ts
      stocksApi.ts
    assets/
    components/
    config/
      env.ts
    navigation/
      types.ts
      RootNavigator.tsx
    providers/
    screens/
      AlertsScreen.tsx
      CreateAlertScreen.tsx
      HomeScreen.tsx
      LoginScreen.tsx
      RegisterScreen.tsx
      ScreenContainer.tsx
      StockDetailScreen.tsx
      StocksScreen.tsx
    services/
      auth/
      notifications/
    state/
      auth.store.ts
      realtime.store.ts
```

## Environment Variables

### Backend

```env
DATABASE_URL=postgresql://...
JWT_SECRET=at-least-16-characters
CORS_ORIGIN=*
FINNHUB_API_KEY=your-finnhub-key
FIREBASE_PROJECT_ID=optional
FIREBASE_CLIENT_EMAIL=optional
FIREBASE_PRIVATE_KEY=optional
NODE_ENV=development
PORT=4000
```

### Frontend

```env
EXPO_PUBLIC_API_URL=https://stock-alerts-challenge.onrender.com/api
EXPO_PUBLIC_SOCKET_URL=https://stock-alerts-challenge.onrender.com
```

No Finnhub key is ever exposed in the frontend. All market data flows through the backend.

## Running Locally

Install dependencies:

```bash
npm install
```

Run backend:

```bash
npm run dev --workspace backend
```

Run Expo:

```bash
npm run start --workspace frontend
```

Run Prisma migration:

```bash
npm run prisma:migrate --workspace backend
```

Run tests:

```bash
npm run test --workspace backend
```

## Scripts

### Backend

```bash
npm run dev --workspace backend   # tsx watch
npm run build --workspace backend  # tsc
npm run start --workspace backend  # node dist/server.js
npm run lint --workspace backend   # eslint
npm run test --workspace backend   # vitest
npm run prisma:generate --workspace backend
npm run prisma:migrate --workspace backend
npm run prisma:studio --workspace backend
```

### Frontend

```bash
npm run start --workspace frontend   # expo start
npm run android --workspace frontend # expo start --android
npm run ios --workspace frontend     # expo start --ios
npm run web --workspace frontend     # expo start --web
npm run lint --workspace frontend    # eslint
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Register |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/stocks` | No | List stocks (max 150) |
| GET | `/api/stocks/search?q=AAPL` | No | Search stocks |
| GET | `/api/stocks/quote/:symbol` | No | Full quote (open/high/low/prev close/change) |
| GET | `/api/alerts` | Yes | List user's alerts |
| POST | `/api/alerts` | Yes | Create alert |
| DELETE | `/api/alerts/:id` | Yes | Delete alert |
| POST | `/api/alerts/evaluate` | Yes | Manually evaluate alerts |
| POST | `/api/notifications/tokens` | Yes | Register push notification token |

## Socket.IO Events

### Client emits

```text
stocks:subscribe { symbols: string[] }
  Subscribe to realtime prices for given symbols.
  Response: stocks:snapshot + stock:price for each symbol.

stock:history:get { symbol: string }
  Request price history for a symbol.
  Response: stock:history
```

### Server emits

```text
stocks:snapshot { prices: Record<string, { price, timestamp, open?, high?, low?, previousClose?, change?, changePercent? }> }
  Emitted when client subscribes. Contains cached prices and hydrated prices.

stock:price { symbol, price, timestamp, open?, high?, low?, previousClose?, change?, changePercent? }
  Emitted for each price update (from WebSocket trade or HTTP poll fallback).

stock:history { symbol, history: Array<{ price, timestamp }> }
  Emitted in response to stock:history:get.
```

## Alert and Notification Flow

1. User creates an alert with `symbol` and `targetPrice`.
2. Backend stores the alert in PostgreSQL through Prisma.
3. The evaluator runs every 60s: queries Finnhub `/quote` for active alert symbols.
4. If `currentPrice >= targetPrice`, the alert is marked as `triggered`.
5. Backend sends a push notification through Expo Push API (Expo Go) or Firebase Admin SDK (production APK).
6. The Alerts screen reflects the updated status.

## Validation and Safety

- Zod validates auth credentials (`email` + `password min 8`) and alert payloads (`symbol` + `positive targetPrice`).
- Express rate limiting: 120 requests/minute global, 20 requests/15 minutes for auth routes.
- Finnhub error handling: if `/stock/symbol` returns 429, the backend serves demo symbols instead of crashing.
- Finnhub WebSocket: lazy connection, exponential backoff, 5-minute cooldown on 429.
- Prisma indexes exist on `User`, `Alert` (userId, symbol, status), and `PushToken` (userId).
- Alert IDs accept any non-empty string (not just CUID format).
- Frontend never exposes Finnhub API key.

## Tests

Backend tests use Vitest + Supertest:

```bash
npm run test --workspace backend
```

- `health.test.ts`: verifies the health endpoint returns `{ status: 'ok' }`.
- `schemas.test.ts`: validates Zod schemas for auth, alert creation, and alert deletion.
- `rate-limit.test.ts`: checks that rate-limit headers (`ratelimit-limit`, `ratelimit-remaining`) are present.

## Demo Checklist

1. Wait for Render cold start if needed.
2. Login/register.
3. Open Stocks.
4. Confirm the first 5 symbols are liquid (AAPL, MSFT, NVDA, TSLA, AMZN).
5. Confirm backend logs show `stocks:subscribe` with these symbols.
6. Confirm backend logs show `broadcasting prices`.
7. Open a stock detail screen.
8. Confirm price, change %, open, high, low, and previous close appear.
9. Wait for the quote polling interval (30s) if the market is closed.
10. Confirm the chart receives multiple history points.
