# EduBridge Frontend

Standalone React + Vite frontend for the EduBridge platform.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- EduBridge FastAPI backend

## Local development

```bash
npm install
cp .env.example .env.local
```

Set `EDUBRIDGE_API_TARGET` and `EDUBRIDGE_API_KEY` in `.env.local`, then run:

```bash
npm run dev
```

Vite proxies `/api` requests to the backend and injects `X-API-Key` on the development server. The key is not exposed to browser JavaScript.

## Build

```bash
npm run build
npm run preview
```

## API integration

The API client is in `src/services/edubridgeApi.js`. It currently wraps:

- `GET /api/v1/model`
- `GET /api/v1/assessment/fixed`
- `GET /api/v1/assessment/bank`
- `POST /api/v1/assessment/submit`
- `POST /api/v1/narrative`
- `GET /api/v1/assessment/images/{question_id}`

## Production security

Do not put the backend's shared API key in a `VITE_*` variable or in browser code. The Vite proxy is for local development only. Production deployment needs user authentication with scoped tokens or a server-side BFF/API gateway that keeps the backend credential private.

## Repository separation

This repository contains frontend code only. The API, model, database, and analytics remain in [EduBridge-Backend](https://github.com/Rubbra-f/EduBridge-Backend).
