# IPL Playoff Predictor

**IPL Playoff Predictor & Scenario Simulator** — a full-stack sports analytics MVP that simulates upcoming IPL matches, updates the points table/NRR race, and computes qualification odds (Monte Carlo) plus mathematical feasibility.

> **Not a betting app** — intended for fan/analyst scenario exploration and education.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Screenshots / Demo](#screenshots--demo)
3. [Key Features](#key-features)
4. [Tech Stack](#tech-stack)
5. [System Requirements / Prerequisites](#system-requirements--prerequisites)
   - [Node.js](#nodejs)
   - [npm](#npm)
   - [MongoDB / MongoDB Atlas](#mongodb--mongodb-atlas)
   - [Git](#git)
6. [Application Architecture & Data Flow](#application-architecture--data-flow)
7. [How the IPL simulation works](#how-the-ipl-simulation-works)
   - [Match 1–50 baseline](#match-1%E2%80%9350-baseline)
   - [Matches 51–70 simulation](#matches-51%E2%80%9370-simulation)
   - [User predictions](#user-predictions)
   - [Real vs projected standings](#real-vs-projected-standings)
   - [NRR calculations](#nrr-calculations)
   - [Monte Carlo qualification probabilities](#monte-carlo-qualification-probabilities)
   - [Mathematical elimination / qualification](#mathematical-elimination--qualification)
8. [Project Structure](#project-structure)
9. [Installation](#installation)
10. [Environment variable setup](#environment-variable-setup)
11. [MongoDB & database setup](#mongodb--database-setup)
12. [Run locally (backend + frontend)](#run-locally-backend--frontend)
13. [Available npm scripts](#available-npm-scripts)
14. [API Documentation](#api-documentation)
15. [Example API workflow](#example-api-workflow)
16. [Postman Collection](#postman-collection)
17. [Key Engineering Challenges & Solutions](#key-engineering-challenges--solutions)
18. [Validation & Reliability](#validation--reliability)
19. [Known Limitations](#known-limitations)
20. [Future Scope](#future-scope)
21. [Contributing](#contributing)
22. [License](#license)
23. [Author](#author)

---

## Project Overview

This repository contains a Next.js frontend and a TypeScript/Express backend that:

- Builds an **IPL Match-50 derived universe** (baseline uses league matches 1–50; simulation uses league matches 51–70).
- Supports **user-submitted predictions** for matches 51–70.
- Recomputes **projected standings** using points + a simplified NRR model.
- Computes **playoff/qualification odds** via **Monte Carlo simulation**.
- Adds **mathematical feasibility** for top-4 qualification using exact scenario enumeration under a points-only policy (NRR unknown during feasibility analysis).

---

## Screenshots / Demo

> Placeholders (no local image paths were added):

- **Screenshot 1 (Dashboard / Standings & Playoff Race)**
  - ![Dashboard screenshot placeholder](./docs/screenshots/dashboard-placeholder.png)
- **Screenshot 2 (Simulator / Predictions)**
  - ![Simulator screenshot placeholder](./docs/screenshots/simulator-placeholder.png)
- **Screenshot 3 (Qualification probabilities)**
  - ![Qualification screenshot placeholder](./docs/screenshots/qualification-placeholder.png)

---

## Key Features

- **Backend-authoritative data flow**: the frontend loads universe + qualification data from backend endpoints, and Monte Carlo odds are computed on the server.
- **Prediction persistence**: predictions are stored in MongoDB (`Prediction` model) and included in standings + Monte Carlo.
- **Match-50 architecture**:
  - Baseline standings are reconstructed from completed league matches **1–50**.
  - The simulation universe uses league matches **51–70**.
- **Future-result leakage prevention**:
  - The universe response explicitly validates that upcoming fixtures do not include real-result fields (winner/result/margin/scores/etc.).
- **No Result handling**: matches without a winner split points appropriately in baseline reconstruction.
- **Super Over handling (no fictional NRR deltas)**:
  - Super Over results are treated as special completion cases in baseline reconstruction without inventing a regulation margin NRR change.
- **Two qualification methods**:
  - Monte Carlo: probabilistic qualification odds.
  - Mathematical feasibility: exact scenario feasibility under points-only ordering.

---

## Tech Stack

Verified from package manifests:

- **Frontend**
  - Next.js **16.2.6**
  - React **19.2.4**
  - TypeScript **5.x** (project-level dev dependency)
  - Tailwind CSS (with Tailwind v4)
  - Zustand **5.0.13**
  - Axios **^1.16.1**
  - shadcn/ui components
- **Backend**
  - Node.js + TypeScript
  - Express **^4.21.2**
  - Mongoose **^8.9.3**
  - dotenv **^16.4.7**

---

## System Requirements / Prerequisites

### Node.js
- Required by `backend` and `frontend`.
- Backend uses `tsx` for development and reads `.env` via `dotenv`.

### npm
- Required to install dependencies from `package.json`.

### MongoDB / MongoDB Atlas
- Backend persists teams/matches/predictions in MongoDB via Mongoose.
- Default local URI in `backend/.env.example`:
  - `mongodb://127.0.0.1:27017/ipl-predictor`

### Git
- Required for cloning the repository.

---

## Application Architecture & Data Flow

```mermaid
flowchart TD
  U[User UI: Simulator / Predictions / Standings] -->|HTTPS| F[Next.js Frontend]
  F -->|GET/POST| B[Express API Backend]
  B -->|Mongo queries| DB[(MongoDB)]
  B --> MC[Monte Carlo Engine (server)]
  B --> MATH[Mathematical Feasibility (exact scenarios)]
  MC --> B
  MATH --> B
  B -->|Universe + odds + standings| F
  F -->|Render| U
  
  P[Prediction Save] -->|POST /api/predictions| B
  B -->|Upsert Prediction| DB
```

**Backend-authoritative flow**:
- The frontend loads **universe + qualification** from backend (`/api/universe` and `/api/qualification`).
- Monte Carlo odds returned by backend are used as the authoritative probability source.

---

## How the IPL simulation works

### Match 1–50 baseline

Verified behavior from backend universe/standings code:

- The backend rebuilds a baseline points/NRR snapshot from **completed league matches 1–50**.
- Baseline reconstruction handles:
  - **No Result**: if `winner` is absent, it awards **+1 point to each team** (winner absent triggers points split).
  - **Super Over**: if a completed match has a `winner` but is missing `margin`/`marginType`, baseline reconstruction updates points + W/L without applying regulation-margin NRR changes.

Implementation note:
- `baselineStandingsFromMatches1to50.ts` reconstructs standings by iterating through completed matches.

### Matches 51–70 simulation

Verified behavior from universe controller + derived universe:

- The system uses a **fixed cutoff** for the Match-50 derived universe.
- Upcoming fixtures must be **exactly 20** league matches with `matchNumber` in **51–70**.
- **Future-result leakage prevention**:
  - The universe endpoint validates that upcoming fixtures are not contaminated by real outcome fields (`winner`, `result`, `margin`, `scores`, `innings`, etc.).
  - It also ensures upcoming fixtures are `completed: false`.

### User predictions

Verified behavior from predictions controller + Monte Carlo:

- Users can save predictions for matches in the **51–70** derived universe.
- Predictions are persisted in MongoDB (`Prediction` model).
- Prediction payload includes:
  - `matchId` (Mongo `_id` of the Match record)
  - `predictedWinner`
  - `margin`
  - `marginType` (allowed set verified in controller)
  - optional `chaseRuns`

Controller validation (verified):
- Prediction `matchId` must correspond to a match present in the derived universe.
- Prediction must be for league matches with `matchNumber` **51–70**.

### Real vs projected standings

Verified from standings service:

- **Real standings**: computed from the reconstructed baseline snapshot (matches 1–50 only).
- **Projected standings**: computed from baseline + applying prediction outcomes for upcoming matches (51–70).
- Standings sorting policy:
  - Points descending, then NRR descending.

### NRR calculations

Verified behavior from standings + NRR sufficiency:

- The NRR engine is applied using a simplified delta model during match application.
- Before running, the system performs an **NRR reconstruction sufficiency check** to ensure completed matches include required fields (`winner`, `margin`, `marginType`)—except for the special cases handled by baseline reconstruction:
  - No Result matches
  - Super Over matches

### Monte Carlo qualification probabilities

Verified from Monte Carlo engine:

- Monte Carlo runs on the server using:
  - `teams` baseline snapshot
  - upcoming matches (51–70)
  - predictions (if provided)
  - a loop of **N iterations (default 1000)**
- For each simulation iteration:
  - Each upcoming match produces a winner using a probabilistic win model.
  - A margin type is sampled:
    - defended runs vs chase-related margin types
  - Predictions override the simulated outcome for matches with saved predictions.
- Playoff probability is computed as:
  - `playoffPercentage = round(playoffCount / iterations * 100)`

### Mathematical elimination / qualification

Verified from mathematical elimination engine:

- Mathematical feasibility is computed via **exact enumeration** of all winner combinations across the remaining matches.
- Feasibility is evaluated **points-only** (NRR is treated as unknown for remaining matches).
- Conservative tie handling:
  - points ties at the boundary do not automatically eliminate a team; the feasibility method assumes ties could be resolved favorably by unknown NRR.

Key terminology alignment (verified):
- **Monte Carlo probability vs mathematical elimination**:
  - A team may have **0% simulated probability** but still be **mathematically not eliminated** (feasibility exists under points-only unknown NRR).

---

## Project Structure

```text
ipl-playoff-predictor/
├─ backend/
│  ├─ src/
│  │  ├─ routes/ (Express routers)
│  │  ├─ controllers/
│  │  ├─ services/ (universe building, standings, NRR, simulation)
│  │  └─ models/ (Mongo schemas)
│  └─ .env.example
├─ frontend/
│  ├─ src/app/ (Next.js pages)
│  ├─ src/components/
│  ├─ src/services/api.ts (Axios client)
│  └─ src/store/ (Zustand store)
└─ README.md (this file)
```

---

## Installation

Clone from the verified repository URL:

```powershell
# Windows PowerShell
cd "c:\Users\Asus\Downloads"
git clone https://github.com/pranjalgupta1130/IPL-Playoff-Predictor.git
```

> If you cloned into a different directory name, adjust paths accordingly.

---

## Environment variable setup

### Backend (`backend/.env.example`)

Verified file exists: `backend/.env.example`.

```dotenv
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ipl-predictor
CORS_ORIGIN=http://localhost:3000
```

**Code-verified additional backend keys (not present in `.env.example`):**

These are referenced directly in source:
- `CRICKET_DATA_PROVIDER` (required to select a cricket data provider; allowed values: `static` or `sportmonks`)
- `SPORTMONKS_API_KEY`, `SPORTMONKS_BASE_URL`, `SPORTMONKS_IPL_LEAGUE_ID`, `SPORTMONKS_SEASON_ID` (Sportmonks provider)

> The application may refuse to run (or refuse synthetic fallback fixtures) depending on these variables, especially in non-development modes.

### Frontend

Verified from `frontend/src/services/api.ts`:

- `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:5000/api`)

---

## MongoDB & database setup

1. Start MongoDB (local or Atlas).
2. Ensure the MongoDB URI in backend matches your setup.
3. Run the seed step to populate Teams/Matches/Predictions-ready fixtures.

Seed behavior is verified:
- `backend/src/scripts/seed.ts` drops existing collections (`Team`, `Match`, `Prediction`) and then calls the cricket fixture sync.
- If provider API keys are missing, the seed may fall back to a local fixture dataset depending on environment and provider selection.

---

## Run locally (backend + frontend)

### Backend

Windows PowerShell commands:

```powershell
# Windows PowerShell
cd "c:\Users\Asus\Downloads\ipl-playoff-predictor\backend"
npm install
copy .env.example .env
npm run seed
npm run dev
```

**Backend localhost port (verified)**:
- `PORT` default is **5000**
- Health endpoint: `http://localhost:5000/api/health`

### Frontend

Windows PowerShell commands:

```powershell
# Windows PowerShell
cd "c:\Users\Asus\Downloads\ipl-playoff-predictor\frontend"
npm install
npm run dev
```

**Frontend localhost port (verified from Next.js default)**:
- Next.js default is **3000** (and backend `CORS_ORIGIN` defaults to `http://localhost:3000`).

If needed, set `NEXT_PUBLIC_API_URL` so the frontend talks to your backend.

---

## Available npm scripts

Verified from `backend/package.json` and `frontend/package.json`.

### Backend scripts
- `npm run dev` — `tsx watch src/index.ts`
- `npm run build` — `tsc`
- `npm run start` — `node dist/index.js`
- `npm run seed` — `tsx src/scripts/seed.ts`

### Frontend scripts
- `npm run dev` — `next dev`
- `npm run build` — `next build`
- `npm run start` — `next start`
- `npm run lint` — `eslint`

---

## API Documentation

All endpoints are mounted under **`/api`** (verified from `backend/src/index.ts`).

| Method | Endpoint | Description | Request body |
|---|---|---|---|
| GET | `/api/health` | Health check. Returns `{status, service}`. | — |
| GET | `/api/teams` | Returns all teams sorted by `points` then `nrr`. | — |
| GET | `/api/teams/standings` | Builds full standings (real + projected + movement). | — |
| GET | `/api/matches` | Returns all matches sorted by `date` ascending. | — |
| GET | `/api/matches/upcoming` | Returns matches where `completed=false`, sorted by `date` ascending. | — |
| GET | `/api/matches/completed` | Returns matches where `completed=true`, sorted by `date` descending. | — |
| GET | `/api/predictions` | Returns saved predictions (populated with `matchId`). | — |
| POST | `/api/predictions` | Creates/updates a prediction. | See payload below |
| DELETE | `/api/predictions/:matchId` | Deletes a prediction by matchId. | — |
| DELETE | `/api/predictions/reset/all` | Deletes all predictions. | — |
| GET | `/api/qualification` | Runs Monte Carlo for the loaded universe and returns probabilities + standings. | — |
| GET | `/api/qualification/team/:teamName` | Runs Monte Carlo and mathematical requirements for one team. | — |
| GET | `/api/universe` | Returns Match-50 derived universe data for upcoming fixtures and the cutoff. | — |

### POST `/api/predictions` payload (verified)

Controller expects:

```json
{
  "matchId": "<MongoMatchIdString>",
  "predictedWinner": "<teamA or teamB name>",
  "margin": 12,
  "marginType": "defended_runs|chase_overs|balls_remaining|runs|wickets",
  "chaseRuns": 180
}
```

Validation verified:
- `marginType` must be one of:
  - `defended_runs`, `chase_overs`, `balls_remaining`, `runs`, `wickets`
- `matchId` must be a valid Mongo ObjectId.
- `predictedWinner` must match one of the two teams of that match.
- Match must be eligible: league stage and `matchNumber` 51–70.

---

## Example API workflow

1. **Load universe** to retrieve upcoming fixtures (51–70) and cutoff.
   - `GET /api/universe`
2. **Load qualification probabilities**.
   - `GET /api/qualification`
3. Optionally **save a prediction**.
   - `POST /api/predictions`
4. **Re-fetch** qualification or standings to see updated projected race.
   - `GET /api/qualification`

---

## Postman Collection

Postman collection coming soon.

---

## Key Engineering Challenges & Solutions

- **Match-50 derived universe architecture**
  - Baseline strictly comes from matches 1–50; simulation strictly uses 51–70.
  - The universe endpoint hard-validates upcoming match numbers count and range.

- **Future-result leakage prevention**
  - The universe controller asserts that upcoming fixtures do not include any winner/margin/scores/innings fields.

- **No Result handling**
  - Matches without a winner award +1 point to each team in baseline reconstruction.

- **Super Over handling without fictional NRR changes**
  - Super Over special-case updates W/L + points while skipping regulation-margin NRR deltas when margin inputs are missing.

- **Prediction eligibility & consistency**
  - Predictions are only accepted for matches that belong to the derived upcoming fixture set (51–70), and for league matches only.

- **Monte Carlo simulation**
  - Server-side Monte Carlo uses saved predictions as deterministic overrides.

- **Exact mathematical outcome feasibility analysis**
  - Mathematical feasibility enumerates all winner combinations and evaluates top-4 reachability under points-only rules.

- **Difference between 0% simulated probability and mathematical elimination**
  - Simulation probability is based on probabilistic win modeling (with sampled margins).
  - Mathematical feasibility assumes unknown future NRR can swing tie-breaks.

---

## Validation & Reliability

Verified reliability measures:

- **Invariant checks in universe construction**:
  - Exactly 20 upcoming fixtures for matchNumbers 51–70.
  - Duplicates and stage mismatches are rejected.
  - Explicit rejection of future-result leakage fields.

- **Prediction-side validation**:
  - Rejects predictions for non-eligible matches.
  - Enforces `marginType` and objectId format.

- **NRR reconstruction sufficiency**:
  - Ensures baseline completed matches contain all required NRR inputs except for supported special cases.

- **Monte Carlo invariant checks**:
  - Validates Monte Carlo counters don’t break invariants (e.g., negative counts, top-two > playoff under the counting policy).

---

## Known Limitations

- **NRR modeling is simplified** (implementation uses a simplified delta approach; see NRR engine usage in standings application).
- **Mathematical feasibility uses points-only ordering**.
  - NRR is treated as unknown for feasibility checks and tie handling is conservative.
- **No Postman collection file found in repo**.

---

## Future Scope

Ideas aligned with current architecture (no claims of implementation):

- Add WebSockets for live probability updates.
- Add scenario sharing (persistable scenario IDs).
- Add OpenAPI/Swagger documentation.
- Add a Monte Carlo configuration endpoint (iterations/seed controls).
- Add more accurate NRR/points tie-break logic if desired.

---

## Contributing

- Fork the repository.
- Create a feature branch.
- Submit a pull request with a clear description.

---

## License

No license has been added yet.

---

## Author

**Pranjal Gupta**

GitHub: https://github.com/pranjalgupta1130

