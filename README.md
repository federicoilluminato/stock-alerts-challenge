# Stock Alerts Technical Challenge

This repository contains a modular Express API + Expo/React Native app for a stock alerts challenge, including auth, Prisma/PostgreSQL integration, and deployment-ready setup.

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
│       │   ├── auth
│       │   └── health
│       ├── prisma
│       ├── routes
│       ├── socket
│       ├── app.ts
│       └── server.ts
├── frontend
│   └── src
│       ├── api
│       ├── config
│       ├── navigation
│       ├── screens
│       ├── services
│       │   ├── auth
│       │   └── socket
│       ├── state
│       └── providers
└── docker-compose.yml
```

## Initial Setup Commands

These are the equivalent commands for creating the foundation manually:

```bash
# Root
npm init -y
npm install -D prettier

# Backend
mkdir backend
cd backend
npm init -y
npm install express cors dotenv zod socket.io jsonwebtoken @prisma/client
npm install -D typescript tsx prisma eslint @eslint/js typescript-eslint prettier @types/node @types/express @types/cors @types/jsonwebtoken
npx tsc --init
npx prisma init

# Frontend
npx create-expo-app@latest frontend --template blank-typescript
cd frontend
npm install @react-navigation/native @react-navigation/native-stack @tanstack/react-query zustand socket.io-client axios expo-secure-store react-native-screens react-native-safe-area-context
npm install -D eslint @eslint/js typescript-eslint prettier
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
- Backend modules are grouped by feature under `src/modules/*`, so future stock, alert, and user modules can be added without growing a flat routes directory.
- Runtime environment parsing is centralized with `zod` to fail fast on invalid config.
- Prisma is wrapped in one shared client module to avoid duplicated client instances.
- The frontend separates navigation, server-state (`React Query`), local state (`Zustand`), API transport, socket transport, and auth persistence.
- Placeholder screens are intentionally plain. Stage 1 is about project shape and integration points.

## Alert Trigger Strategy (Challenge Scope)

For this challenge, alert evaluation is handled manually via a `Check Alerts` action from the app, instead of a background scheduler.

Why:

- The backend runs on Render Free, where always-on periodic processing is not guaranteed.
- This keeps the alert flow deterministic and easy to test during review.

Current behavior:

- Users create alerts normally.
- Alerts are evaluated when `Check Alerts` is triggered.
- Matching alerts are marked as triggered and returned in the response.

Production note:

- In a production setup, this should run via a dedicated worker or cron job (for example, Render Cron Job or a separate always-on worker service), and dispatch real-time notifications through Socket.IO or push notifications.
