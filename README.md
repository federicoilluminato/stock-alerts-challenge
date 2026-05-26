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

## Features

- JWT login/register.
- Stock browser with 150+ symbols from Finnhub when available.
- Backend-owned realtime stock gateway.
- Socket.IO live price updates in React Native.
- In-memory latest price cache per symbol.
- In-memory last 50 price points per symbol for chart history.
- Simple realtime line chart with `react-native-chart-kit`.
- Alert CRUD with Prisma/PostgreSQL persistence.
- Background alert evaluator.
- Push notifications through Expo Push API or Firebase Admin SDK.
- Backend rate limiting.
- Backend tests for health, validation, and rate-limit middleware.

## Realtime Flow

1. React Native loads `/api/stocks` from the backend.
2. The frontend connects to the backend Socket.IO server.
3. The frontend emits `stocks:subscribe` with selected symbols.
4. The backend opens one Finnhub WebSocket connection lazily after the first subscription.
5. The backend subscribes to symbols on Finnhub and avoids duplicate subscriptions.
6. The backend hydrates initial prices with Finnhub `/quote` so the UI does not wait for live trades.
7. The backend stores latest price and recent history in memory.
8. The backend broadcasts `stock:price` events through Socket.IO rooms.
9. The frontend Zustand realtime store updates list prices and charts live.

## Finnhub Free Tier Notes

Finnhub free tier has strict limits:

- 1 WebSocket connection per API key.
- 60 REST requests per minute.
- Trade ticks may be sparse outside market hours.

To keep the demo stable, the app subscribes to a small set of liquid symbols first: `AAPL`, `MSFT`, `NVDA`, `TSLA`, `AMZN`.

The backend also runs a conservative quote polling fallback for subscribed symbols. During closed market hours, ticks may arrive with fresh timestamps while prices remain unchanged because Finnhub returns the last traded price.

## Deployment Notes

The backend is deployed on Render free tier. Render may spin down the service after inactivity.

Expected behavior:

- First request after inactivity can take 30-60 seconds.
- Socket.IO may show offline until the backend wakes up.
- In-memory price history is reset on restart.
- Realtime resumes when clients reconnect and resubscribe.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Expo SDK 54, React Native, TypeScript |
| Navigation | React Navigation |
| State | React Query + Zustand |
| Realtime | Socket.IO client/server |
| Charts | react-native-chart-kit |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL / Supabase |
| ORM | Prisma |
| Auth | JWT + bcryptjs |
| Market Data | Finnhub |
| Notifications | Expo Push API + Firebase Admin SDK |

## Folder Structure

```text
backend/
  prisma/
    schema.prisma
  src/
    config/
    middlewares/
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

frontend/
  src/
    api/
    assets/
    config/
    navigation/
    providers/
    screens/
    services/
      auth/
      notifications/
    state/
      realtime.store.ts
```

## Environment Variables

Backend:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=at-least-16-characters
CORS_ORIGIN=*
FINNHUB_API_KEY=your-finnhub-key
FIREBASE_PROJECT_ID=optional
FIREBASE_CLIENT_EMAIL=optional
FIREBASE_PRIVATE_KEY=optional
```

Frontend:

```env
EXPO_PUBLIC_API_URL=https://stock-alerts-challenge.onrender.com/api
EXPO_PUBLIC_SOCKET_URL=https://stock-alerts-challenge.onrender.com
```

No Finnhub key is required in the frontend.

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

## Scripts

Backend:

```bash
npm run dev --workspace backend
npm run build --workspace backend
npm run start --workspace backend
npm run lint --workspace backend
npm run test --workspace backend
npm run prisma:generate --workspace backend
npm run prisma:migrate --workspace backend
```

Frontend:

```bash
npm run start --workspace frontend
npm run android --workspace frontend
npm run ios --workspace frontend
npm run web --workspace frontend
npm run lint --workspace frontend
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Register |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/stocks` | No | List stocks |
| GET | `/api/stocks/search?q=AAPL` | No | Search stocks |
| GET | `/api/alerts` | Yes | List alerts |
| POST | `/api/alerts` | Yes | Create alert |
| DELETE | `/api/alerts/:id` | Yes | Delete alert |
| POST | `/api/alerts/evaluate` | Yes | Manually evaluate alerts |
| POST | `/api/notifications/tokens` | Yes | Register push token |

## Socket.IO Events

Client emits:

```text
stocks:subscribe { symbols: string[] }
stock:history:get { symbol: string }
```

Server emits:

```text
stocks:snapshot { prices: Record<string, { price, timestamp }> }
stock:price { symbol, price, timestamp }
stock:history { symbol, history: Array<{ price, timestamp }> }
```

## Alerts And Notifications

1. User creates an alert with `symbol` and `targetPrice`.
2. Backend stores the alert in PostgreSQL through Prisma.
3. The evaluator periodically checks current prices.
4. If `currentPrice >= targetPrice`, the alert is marked as triggered.
5. Backend sends a push notification through Expo Push API or FCM depending on the stored token platform.

## Validation And Safety

- Zod validates auth and alert payloads.
- Express rate limiting protects `/api` globally and `/api/auth` more strictly.
- Prisma relation indexes exist for user alerts and push tokens.
- Backend tests cover health response, schema validation, and rate-limit headers.

## Demo Checklist

1. Wait for Render cold start if needed.
2. Login/register.
3. Open Stocks.
4. Confirm backend logs show `stocks:subscribe` with liquid symbols.
5. Confirm backend logs show `broadcasting prices`.
6. Open a stock detail screen.
7. Wait for the quote polling interval if the market is closed.
8. Confirm the chart receives multiple history points.
