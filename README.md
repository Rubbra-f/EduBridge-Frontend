# EduBridge

EduBridge is a web-based learning platform that helps students identify learning gaps through assessments and personalized learning diagnosis.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Python, FastAPI
- **Model:** P-DINA
- **Deployment:** Docker

## Features

- Student dashboard
- Online assessments
- Student performance analysis
- Learning gap diagnosis
- Personalized learning recommendations

## Getting Started

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cp .env.example .env
docker compose up --build
```

## Project Structure

```text
EduBridge/
├── backend/
├── docs/
├── public/
├── scripts/
├── src/
├── docker-compose.yml
└── package.json
```

For backend integration details, see [docs/INTEGRATION.md](docs/INTEGRATION.md).
