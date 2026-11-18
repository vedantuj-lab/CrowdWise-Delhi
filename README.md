# CrowdWise Delhi — Know the Crowd Before You Board

CrowdWise Delhi is a software-only, GTFS-aligned bus-only journey comparison and historical demand intelligence platform for Delhi public bus services (DTC and DIMTS Cluster networks).

> **Demonstration Notice:** This frontend web interface and bundled Express preview backend currently operate in **Demonstration Mode (`VITE_DATA_MODE=demo`)** using sample Delhi GTFS & ticketing fixtures. Every estimated crowding badge, demand chart, and benchmark is labelled **DEMO DATA** (`Demonstration estimate — not a live passenger count.`). No hardware sensors, cameras, or automated model training runs occur in the browser.

---

## 1. Architecture Overview

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router + Recharts + `@vis.gl/react-google-maps`
- **Multi-Theme Visual System:** Four distinct dark architectural color palettes (`data-cw-theme` CSS custom properties in `src/index.css`):
  - **Public Portal:** Midnight Navy & Obsidian + Teal / Amber / Electric Blue
  - **Commuter Workspace:** Charcoal-Teal + Emerald / Warm Yellow
  - **Operator Analytics:** Midnight Navy + Electric Blue / Cyan / Orange
  - **Administrator Console:** Deep Purple + Violet / Magenta / Warm Amber
- **Node/Express Preview API (`server.ts`):** Serves `/api/*` endpoints and Vite dev middleware (or static `dist/` in production) on port `3000`. Ready to swap seamlessly with a Python/FastAPI + PostgreSQL/PostGIS backend via `VITE_API_BASE_URL` and `VITE_DATA_MODE=api`.
- **Map Layer:** Interactive Google Maps JavaScript API (`DEMO_MAP_ID` / `AdvancedMarker`) with corridor polylines colored by crowding or route colors and an automatic GTFS coordinate SVG schematic fallback if Maps keys or quota are unavailable.

---

## 2. Implemented Features

- **Public Portal:** Landing page with embedded quick search, 3 role workspace entry cards, How It Works, Crowdedness & Confidence Guide, Data Methodology & Limitations, and About/Privacy/Terms.
- **Role-Based Demo Access (`/login/:roleTab?`):** Independent login, registration, forgot-password, and reset-password workflows for **Commuter**, **Transport Operator**, and **Administrator**, enforced by `RoleGuard`.
- **Bus-Only GTFS Journey Planner:** Direct and 1-transfer bus routing across 10 sample Delhi bus routes (`405`, `502`, `543`, `85EXT`, `729`, `764`, `620`, `429`, `534`, `347`) and 29 disambiguated `stop_id` stops (including bay-level `Kashmere Gate` stops `DL_STP_001` vs. `DL_STP_029`).
- **Confidence-Gated Ranking:** Compares **Fastest**, **Balanced**, and **Least Crowded** options while excluding `low` / `insufficient_data` confidence routes from Least Crowded recommendations.
- **Journey Details, Nearby Stops & Commuter Settings:** Expandable segment timelines keeping `observedTicketingDemand`, `reconstructedPassengerLoad`, and `predictedDemand` strictly separate, stop lookup with geolocation sorting, and editable profile, language, notification, and high-contrast/compact accessibility preferences.
- **Operator Intelligence Suite:** Overview KPIs + `passenger_count` Demand Analysis (ticket type, AC vs. Non-AC fleet, top boarding stops, hourly curve), Route Analytics & Detail, Segment Demand Explorer, Hotspot Analysis map overlay, Time-Band & Weekday/Weekend Analysis, Model Validation Benchmarks, Data Quality Audit, explicit GTFS-RT Vehicle Positions unavailable monitor, and CSV + PDF Print Preview exports.
- **Administrator Console:** Overview, Create/Edit/Password-Reset/RBAC User Management, **14-Stage Data Processing Pipeline** (`/admin/pipeline`) with per-stage retry & expandable logs, Data Source Registry, Frontend Demo CSV/TXT Schema Validator, GTFS Route & Stop Alias directories, Model Staging/Rollback Registry, API/Maps Health Diagnostics, Audit Logs, and Editable System Settings.

---

## 3. Local Installation & Development

```bash
npm install
npm run dev
```

Build & lint verification:

```bash
npm run lint
npm run build
npm start
```

---

## 4. Environment Configuration (`.env.example`)

Never commit secrets or hardcode API keys in frontend bundles:

- `VITE_GOOGLE_MAPS_API_KEY` / `GOOGLE_MAPS_API_KEY` — Google Maps JavaScript API key (served safely from `/api/maps/config` when configured server-side, or via build env)
- `VITE_API_BASE_URL` — Defaults to `/api` (set to your FastAPI origin in stage 2)
- `VITE_DATA_MODE` — `demo` (default) or `api`

---

## 5. Connecting to GitHub (`CrowdWise-Delhi`)

1. Open the GitHub integration settings in Google AI Studio.
2. Connect your GitHub account.
3. Create a repository named **`CrowdWise-Delhi`**.
4. Push the repository and verify `.gitignore` excludes `node_modules/`, `dist/`, and `.env` secrets.

---

## 6. Stage 2 Integration (Antigravity FastAPI + PostgreSQL/PostGIS)

All UI components read through `/src/services/api/client.ts`:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Service health & uptime |
| `GET /api/stops/search`, `/api/stops/:stopId` | GTFS stop search & bay disambiguation |
| `GET /api/routes`, `/api/routes/:routeId` | Bus routes & directional stop sequences |
| `POST /api/journeys/search`, `GET /api/journeys/:journeyId` | Bus-only journey planning & segment crowding |
| `GET/POST/DELETE /api/journeys/saved`, `/api/journeys/history` | Commuter saved trips & search log |
| `GET /api/analytics/overview\|routes\|segments\|peak-hours\|hotspots\|demand-breakdown` | Operator demand intelligence & `passenger_count` breakdown |
| `GET /api/model/performance`, `/api/model/versions` | Chronological evaluation benchmarks |
| `GET /api/data/quality`, `GET/POST /api/data/sources\|ingestion` | Quality audit & batch job status |
| `GET /api/admin/pipeline`, `POST /api/admin/pipeline/retry` | 14-stage data processing pipeline monitor & retry |
| `GET/POST/PATCH /api/admin/users`, `POST /api/admin/models/action` | Admin user lifecycle & staging/rollback controls |
| `GET/PUT /api/admin/settings` | Persistent system thresholds & default settings |
| `GET /api/vehicles/positions` | GTFS-RT proxy (returns `unavailable` until active) |
| `POST /api/reports/export` | CSV exports with dataset & assumption headers |

---

## 7. Known Limitations

- Sample October fixture covers 10 corridors / 29 stops rather than the full NCT Delhi GTFS network.
- Uncompressed external GPS archives (~124 GB) must be processed externally in Python/PostGIS—never uploaded to browser ingestion forms.
- Actual crowding ML models are benchmark placeholders until trained on full cleaned ticketing & ETM datasets.
