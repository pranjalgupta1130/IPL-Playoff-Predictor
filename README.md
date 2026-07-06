# IPL Playoff Predictor & Scenario Simulator

A full-stack sports analytics MVP: simulate upcoming IPL matches and watch the points table, NRR, and playoff race update in real time.

**Not a betting app** — fan/analyst scenario tooling only.

## Stack

| Layer    | Tech                                      |
|----------|-------------------------------------------|
| Frontend | Next.js, TypeScript, Tailwind, shadcn/ui  |
| Backend  | Node.js, Express, TypeScript              |
| Database | MongoDB                                   |
| State    | Zustand                                   |

## Project structure

```
ipl-playoff-predictor/
├── backend/          # Express API
│   └── src/
│       ├── models/       # Team, Match, Prediction
│       ├── routes/       # REST endpoints
│       ├── controllers/
│       ├── services/     # Standings recalculation
│       ├── utils/        # Simplified NRR engine
│       └── data/         # Seed data
└── frontend/         # Next.js app
    └── src/
        ├── app/          # Pages (Dashboard, Fixtures, Simulator)
        ├── components/
        ├── services/     # Axios API client
        ├── store/        # Zustand
        └── types/
```

## Prerequisites

1. **Node.js** 18+ (you have v22)
2. **MongoDB** running locally  
   - Install: [MongoDB Community](https://www.mongodb.com/try/download/community)  
   - Or Docker: `docker run -d -p 27017:27017 --name mongo mongo:7`

## Run locally (step by step)

### Step 1 — Backend

```powershell
cd c:\Users\Asus\Downloads\ipl-playoff-predictor\backend
npm install
copy .env.example .env
npm run seed
npm run dev
```

API: http://localhost:5000/api/health

### Step 2 — Frontend (new terminal)

```powershell
cd c:\Users\Asus\Downloads\ipl-playoff-predictor\frontend
npm install
copy .env.local.example .env.local
npm run dev
```

App: http://localhost:3000

## API endpoints

| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| GET    | `/api/health`               | Health check             |
| GET    | `/api/teams/standings`      | Points table + playoff   |
| GET    | `/api/matches`              | All matches              |
| GET    | `/api/matches/upcoming`     | Upcoming fixtures        |
| GET    | `/api/matches/completed`    | Completed fixtures       |
| GET    | `/api/predictions`          | Saved predictions        |
| POST   | `/api/predictions`          | Save/update prediction   |
| DELETE | `/api/predictions/:matchId` | Remove prediction        |
| DELETE | `/api/predictions/reset/all`  | Reset all predictions    |

## How simulation works

1. **Real standings** — Team stats in MongoDB = current table (unchanged by predictions).
2. **Projected standings** — Same baseline + your simulated upcoming match results.
3. **Toggle** — Dashboard/Simulator: **Real Table** vs **Projected Table** with rank/points/NRR deltas.
4. **Recalculation** — `standingsEngine` / `standingsService` clone baseline, apply predictions, sort by points → NRR.
5. **Playoffs** — Top 4 marked; **In** / **Out** badges when qualification changes.

NRR uses a **simplified** formula in `backend/src/utils/nrrEngine.ts` so you can swap in official IPL math later.

## Pages

- **/** — Dashboard with points table + playoff zones  
- **/fixtures** — Upcoming & completed matches  
- **/simulator** — Predict outcomes and see live table updates  

## Phase 2 ideas (not built yet)

Real cricket APIs, auth, saved scenarios, Monte Carlo, Redis, WebSockets, Docker deploy.

## Troubleshooting

- **“Could not load data”** — Start backend + run `npm run seed`.  
- **Mongo connection error** — Ensure MongoDB is running on `127.0.0.1:27017`.  
- **CORS issues** — Check `CORS_ORIGIN` in backend `.env` matches `http://localhost:3000`.
