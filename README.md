# Stock Alerts Technical Challenge

Full-stack mobile app for stock price alerts with push notifications. Built with Expo/React Native (frontend) and Express/TypeScript (backend).

> **Deployment Notes:** Backend hosted on [Render](https://render.com) free tier — the server spins down after inactivity, so the first request after a period of inactivity will take a few seconds while it cold-starts. PostgreSQL hosted on [Supabase](https://supabase.com). Finnhub API key (free tier) required for stock data.

## Features

- **User Authentication** — Register/login with JWT, secure token storage via Expo SecureStore
- **Stock Browser** — Search and browse 150+ stocks via Finnhub API
- **Stock Charts** — Candlestick charts with real-time quotes
- **Price Alerts** — Create alerts per stock with target price; manual "Check Alerts" trigger
- **Push Notifications** — Dual system:
  - **Expo Go / iOS**: Uses Expo Push Notifications (uses APNs on iOS)
  - **Production APK (Android)**: Uses native Firebase Cloud Messaging (FCM)
  - Backend routes notifications via Expo Push API or Firebase Admin SDK depending on token platform

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Expo SDK 54, React Native 0.81, TypeScript |
| Navigation | React Navigation (native-stack) |
| State | TanStack React Query (server) + Zustand (local) |
| Charts | react-native-svg (candlestick) |
| Backend | Express 5, TypeScript |
| Database | PostgreSQL 16 (hosted on Supabase) |
| ORM | Prisma |
| Auth | JWT + bcryptjs |
| APIs | Finnhub (stock data) |
| Notifications | Expo Push API + Firebase Admin SDK |
| Real-time | Socket.IO |

## Folder Structure

```text
.
├── backend
│   ├── prisma
│   │   └── schema.prisma
│   └── src
│       ├── config
│       ├── middlewares
│       ├── modules
│       │   ├── alerts
│       │   ├── auth
│       │   ├── health
│       │   ├── notifications
│       │   └── stocks
│       ├── prisma
│       ├── routes
│       ├── socket
│       ├── app.ts
│       └── server.ts
├── frontend
│   └── src
│       ├── api
│       ├── assets
│       ├── components
│       ├── config
│       ├── navigation
│       ├── providers
│       ├── screens
│       ├── services
│       │   ├── auth
│       │   ├── notifications
│       │   ├── socket
│       │   └── stocks
│       └── state
├── docker-compose.yml
└── README.md
```

## Running Locally

1. Install dependencies:

```bash
npm install
```

2. Create environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Configure `backend/.env` with your Finnhub API key, Firebase credentials (for FCM), and Supabase database URL.

3. Start PostgreSQL and backend with Docker:

```bash
npm run docker:up
```

4. Run Prisma migration once the database is available:

```bash
npm run prisma:migrate --workspace backend
```

5. Start Expo:

```bash
npm run dev:frontend
```

## Backend Scripts

```bash
npm run dev --workspace backend
npm run build --workspace backend
npm run start --workspace backend
npm run lint --workspace backend
npm run prisma:generate --workspace backend
npm run prisma:migrate --workspace backend
```

## Frontend Scripts

```bash
npm run start --workspace frontend
npm run android --workspace frontend
npm run ios --workspace frontend
npm run web --workspace frontend
npm run lint --workspace frontend
```

## Architecture Notes

- `backend/src/app.ts` owns Express middleware and route composition. `server.ts` owns HTTP and Socket.IO startup.
- Backend modules are grouped by feature under `src/modules/*`.
- Runtime environment parsing is centralized with `zod` to fail fast on invalid config.
- Prisma is wrapped in one shared client module to avoid duplicated client instances.
- The frontend separates navigation, server-state (`React Query`), local state (`Zustand`), API transport, socket transport, and auth persistence.
- Notification routing is platform-aware: tokens registered as `'fcm'` use Firebase Admin SDK; tokens registered as `'expo'` use Expo Push API.

## Alerts & Notifications Flow

1. User creates an alert with a stock symbol and target price
2. User triggers **"Check Alerts"** from the Alerts screen (or the background evaluator runs every 60s)
3. Backend fetches current prices from Finnhub API
4. If `currentPrice >= targetPrice`, the alert is marked as `triggered`
5. Push notification is sent to the user's device:
   - **Expo Go**: Via Expo Push API → FCM (Android) / APNs (iOS)
   - **Production APK**: Via Firebase Admin SDK → FCM
6. The Alerts screen reflects the updated status

## Firebase Cloud Messaging

The backend includes Firebase Admin SDK integration for sending native FCM notifications.

### Configuration

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Generate a Service Account key: Project Settings → Service Accounts → Generate New Private Key
3. Add to `backend/.env`:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```
4. For Android production builds, add an Android app in Firebase Console with package name `com.fedeillu.stockalertschallenge`, download `google-services.json`, and place it at `frontend/google-services.json`

### Conditional Routing

The frontend automatically selects the notification method based on the runtime environment:

- **Expo Go**: Registers an Expo Push Token (`platform: 'expo'`)
- **Production build**: Registers a native FCM Token (`platform: 'fcm'`)

The backend sends notifications through the appropriate channel based on the stored platform.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Get current user |
| GET | `/api/stocks` | No | List available stocks |
| GET | `/api/alerts` | Yes | List user alerts |
| POST | `/api/alerts` | Yes | Create alert |
| POST | `/api/alerts/evaluate` | Yes | Trigger manual alert evaluation |
| DELETE | `/api/alerts/:id` | Yes | Delete alert |
| POST | `/api/notifications/tokens` | Yes | Register push notification token |
| GET | `/api/health` | No | Health check |
