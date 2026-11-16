# EduBridge Frontend

Standalone React + Vite + Tailwind frontend extracted from the original EduBridge repository.

## Run locally

```bash
npm install
cp .env.example .env.local
# Set EDUBRIDGE_API_KEY in .env.local
npm run dev
```

The Vite development proxy forwards `/api` to `EDUBRIDGE_API_TARGET` (default `http://127.0.0.1:8000`) and injects `X-API-Key` server-side. Never expose the shared backend key through a `VITE_*` variable or browser code.

## Included frontend

- React/Vite application and routing
- Login and registration screens
- Dashboard, quiz, progress, profile, and learning catalog pages
- Shared UI/layout components
- API client for model, assessment bank, image, submission, and narrative endpoints

## Important migration note

The source code files were migrated, while binary image assets could not be copied by the available GitHub text-file transfer interface. Some image imports or question illustrations may therefore need a follow-up asset migration. The original repository remains unchanged.

The backend remains separate in [EduBridge-Backend](https://github.com/Rubbra-f/EduBridge-Backend).

## Production security

The Vite proxy is for local development only. Production must use user-scoped authentication or a server-side BFF/API gateway that keeps the backend credential private.
