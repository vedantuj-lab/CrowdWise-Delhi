# CrowdWise Delhi

**Tagline:** *Know the Crowd Before You Board.*

CrowdWise Delhi is a crowdedness-aware bus journey planner and passenger-demand intelligence platform for Delhi's public bus network (DTC and DIMTS Cluster buses). It combines Static GTFS schedules, historical October 2026 ticketing demand analytics, chronological-split machine learning benchmarks, interactive Google Maps visualizations, and Firebase-backed role-based access control (RBAC) across three dedicated workspaces: **Commuter**, **Transport Operator**, and **Administrator**.

---

## Table of Contents

1. [Core Capabilities](#core-capabilities)
2. [Role-Based Workspaces (RBAC)](#role-based-workspaces-rbac)
3. [Visual Design System](#visual-design-system)
4. [Technology Stack](#technology-stack)
5. [Project Structure](#project-structure)
6. [Authentication & Firestore Data Model](#authentication--firestore-data-model)
7. [Backend API Reference](#backend-api-reference)
8. [Data Sources & Analytical Methodology](#data-sources--analytical-methodology)
9. [Environment Configuration](#environment-configuration)
10. [Local Development & Build](#local-development--build)
11. [Known Limitations & Governance](#known-limitations--governance)

---

## Core Capabilities

- **Crowdedness-Aware Bus Journey Planner**:
  - Search stop-to-stop Delhi bus journeys across DTC and DIMTS corridors.
  - Compares **Fastest**, **Balanced**, and **Least Crowded** itineraries with transfer counts, travel duration, confidence ratings, and segment-by-segment crowding bands (**Low**, **Moderate**, **High**, **Very High**).
  - Supports GTFS stop disambiguation (e.g., distinct bays at Kashmere Gate ISBT).
- **Interactive Delhi Transit Map (Google Maps Platform)**:
  - Corridor polylines color-coded by crowding level, stop markers, demand density overlays, geolocation for nearby stops, and honest GTFS-Realtime feed status messaging (never fabricates live bus positions).
- **Operator Demand Intelligence**:
  - Overview KPIs, daily ticket/passenger volume series, agency breakdown (DTC vs. DIMTS), route-level analytics, segment demand heatmaps, peak-hour vs. off-peak comparisons, recurring hotspot detection, and CSV report exports with metadata headers.
- **Model Validation & Data Quality**:
  - Chronological train/validation/test split benchmarks (Historical Mean, Historical Median, Random Forest, and **XGBoost v2.4**) with MAE, RMSE, R², Precision, Recall, F1 Score, and confidence calibration.
  - Automated data quality checks across ticketing, GTFS topology, GPS coverage, and passenger load reconstruction.
- **Platform Administration**:
  - Multi-source data registry (Static GTFS, Historical Ticketing CSV, ETM logs, Historical GPS, GTFS-RT), browser-side CSV/GTFS schema validator, 14-stage pipeline monitor, Firestore-backed user directory, system configuration, and audit trail.

---

## Role-Based Workspaces (RBAC)

CrowdWise Delhi enforces real authentication via **Firebase Authentication** (Google Sign-In + Email/Password) and **Cloud Firestore** security rules (`firestore.rules`) across three roles:

| Role | Primary Route | Capabilities |
| :--- | :--- | :--- |
| **Commuter** | `/commuter` | Bus Journey Planner (`/planner`), Journey Results (`/results`), Journey Details (`/journey/:id`), Nearby Delhi Stops (`/nearby-stops`), Saved Journeys (`/saved`), Search History (`/history`), Profile & Preferences (`/settings`). |
| **Transport Operator** | `/operator` | Operator Overview (`/operator`), Route Analytics (`/operator/routes`), Segment Demand (`/operator/segments`), Peak-Hour Analysis (`/operator/time-analysis`), Hotspots (`/operator/hotspots`), Model Performance (`/operator/models`), Data Quality (`/operator/data-quality`), Vehicle Positions & CSV Reports (`/operator/vehicles`, `/operator/reports`). |
| **Administrator** | `/admin` | Admin Overview (`/admin`), User RBAC Directory (`/admin/users`), Data Sources (`/admin/data-sources`), Data Ingestion Validator (`/admin/ingestion`), 14-Stage Pipeline (`/admin/pipeline`), Route & Stop Management (`/admin/routes`, `/admin/stops`), System Settings & Audit Logs (`/admin/settings`, `/admin/audit-logs`), plus full access to Commuter and Operator workspaces. |

---

## Visual Design System

CrowdWise Delhi uses a dark, multi-accent theme system tailored to each workspace:

- **Public / Landing**: Midnight navy, charcoal, teal, violet, and emerald accents.
- **Commuter Workspace**: Deep teal, emerald green, warm yellow, charcoal, and coral accents.
- **Transport Operator Workspace**: Midnight navy, electric blue, cyan, orange, and dark slate.
- **Administrator Console**: Deep plum, violet, magenta, charcoal, and muted purple surfaces.
- **Crowding Indicators**:
  - **Green**: Low estimated demand
  - **Yellow**: Moderate estimated demand
  - **Orange**: High estimated demand
  - **Red**: Very high estimated demand

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite 8, React Router v7, Tailwind CSS v4, Lucide React, Recharts, Motion
- **Maps**: `@vis.gl/react-google-maps` (Google Maps JavaScript API)
- **Authentication & Database**: Firebase Authentication (Google Sign-In & Email/Password) + Cloud Firestore (`firebase` v13)
- **Backend Server**: Node.js + Express (`server.ts` via `tsx`) serving `/api/*` endpoints and Vite middleware in development / static `dist/` in production

---

## Project Structure

```text
/
├── index.html                          # HTML entry point & SEO metadata
├── server.ts                           # Express API server + Vite dev/prod host (port 3000)
├── package.json                        # Scripts & dependencies
├── vite.config.ts                      # Vite build configuration
├── tsconfig.json                       # TypeScript compiler configuration
├── firestore.rules                     # Deployed Cloud Firestore RBAC security rules
├── firebase-blueprint.json             # Firestore entity & collection schema blueprint
├── firebase-applet-config.json         # Firebase project & database configuration
├── .env.example                        # Environment variable template (no secrets)
├── .gitignore                          # Excludes node_modules, dist, .env*, chat attachments
└── src/
    ├── App.tsx                         # Route definitions & role-guarded workspace tree
    ├── firebase.ts                     # Firebase App, Auth, Firestore & error handler setup
    ├── context/
    │   ├── AuthContext.tsx             # Firebase Auth state, Google/Email login & role provisioning
    │   └── AppStateContext.tsx         # Firestore-backed saved journeys, history, toasts & Maps config
    ├── services/
    │   ├── api/client.ts               # Typed frontend API client for /api/*
    │   └── journey/gtfsPlanner.ts      # GTFS-aligned journey routing & crowding ranker
    ├── components/
    │   ├── common/                     # RoleGuard, CrowdingBadges, StateBlocks, ErrorBoundary
    │   ├── journey/                    # JourneySearchForm & comparison cards
    │   ├── layout/                     # PublicLayout & WorkspaceLayout (sidebar + role switcher)
    │   └── maps/                       # DelhiTransitMap (Google Maps Platform)
    ├── pages/
    │   ├── LandingPage/                # Public landing page
    │   ├── Login/                      # 3-role portal selector + Firebase Google/Email Auth
    │   ├── CommuterDashboard/          # Commuter home dashboard
    │   ├── JourneyPlanner/             # Interactive planner + Delhi map
    │   ├── JourneyResults/             # Fastest / Balanced / Least Crowded results
    │   ├── JourneyDetails/             # Segment-level crowding breakdown
    │   ├── NearbyStops/                # Geolocation & stop search
    │   ├── SavedJourneys/              # Saved trips, search history & account settings
    │   ├── OperatorDashboard/          # Operator KPIs & daily volume trends
    │   ├── RouteAnalytics/             # Route-level demand & direction verification
    │   ├── DemandAnalytics/            # Segment-level demand matrix
    │   ├── TimeAnalysis/               # Peak-hour & weekday vs. weekend analysis
    │   ├── HotspotAnalytics/           # Recurring high-demand segment hotspots
    │   ├── ModelPerformance/           # Chronological ML benchmark comparison
    │   ├── DataQuality/                # Automated data quality audit checks
    │   ├── OperatorExtras/             # GTFS-RT vehicle status & CSV report exports
    │   ├── DataSources/                # Source registry & CSV/GTFS schema validator
    │   ├── AdminDashboard/             # Admin overview, Firestore users, pipeline, settings & audit logs
    │   └── Public/                     # How It Works, Crowdedness Guide, Methodology & About
    └── types/
        └── transit.ts                  # Shared TypeScript interfaces
```

---

## Authentication & Firestore Data Model

- **Collections**:
  - `/users/{uid}` — User profile (`uid`, `name`, `email`, `role` in `commuter | operator | admin`, `status`, `organization`, `favouriteStopIds`, `createdAt`, `updatedAt`).
  - `/users/{uid}/savedJourneys/{journeyId}` — Per-user saved bus journeys (`userId`, `label`, `savedAt`, `journey`).
  - `/users/{uid}/searchHistory/{historyId}` — Per-user recent journey searches.
- **Security Rules (`firestore.rules`)**:
  - Global default-deny (`allow read, write: if false`).
  - Owner-scoped reads/writes for personal profiles, saved journeys, and search history.
  - Admin & Operator read visibility on `/users` for platform oversight.

---

## Backend API Reference

All backend routes are served from `server.ts` under `/api/*`:

- **System & Maps**: `GET /api/health`, `GET /api/maps/config`
- **Transit Network**: `GET /api/stops/search`, `GET /api/stops/:stopId`, `GET /api/routes`, `GET /api/routes/:routeId`
- **Journey Planning & Crowding**: `POST /api/journeys/search`, `GET /api/journeys/:journeyId`, `GET /api/crowding/route/:routeId`, `GET /api/crowding/segment`
- **Operator Analytics**: `GET /api/analytics/overview`, `GET /api/analytics/routes`, `GET /api/analytics/segments`, `GET /api/analytics/peak-hours`, `GET /api/analytics/hotspots`, `GET /api/analytics/demand-breakdown`
- **Models & Quality**: `GET /api/model/performance`, `GET /api/model/versions`, `GET /api/data/quality`
- **Data Ingestion & Reports**: `GET /api/data/sources`, `POST /api/data/ingestion`, `GET /api/data/ingestion/:jobId`, `POST /api/reports/export`
- **Live Telemetry**: `GET /api/vehicles/positions` (returns honest `unavailable` status unless `GTFS_RT_API_URL` is configured)
- **Administration**: `GET /api/admin/overview`, `GET /api/admin/pipeline`, `POST /api/admin/pipeline/retry`, `POST /api/admin/models/action`, `GET/PUT /api/admin/settings`, `GET /api/admin/audit-logs`

---

## Data Sources & Analytical Methodology

1. **Static GTFS (DTC & DIMTS)**: Provides disambiguated stop coordinates, route sequences, and directional schedules.
2. **Historical Bus Ticketing (October 2026)**: Boarding issuances aggregated by route, stop pair, day type, and time band.
3. **Chronological Model Evaluation**: Models are evaluated on strict time-ordered splits (Days 1–20 train, Days 21–25 validation, Days 26–31 holdout test) to prevent temporal leakage.
4. **Live Feed Honesty**: Live GTFS-Realtime bus positions are displayed only when an external GTFS-RT feed is configured; synthetic vehicle markers are never fabricated.

---

## Environment Configuration

Copy `.env.example` to `.env` (never commit `.env` to version control):

```env
# Optional: Google Maps JavaScript API key for interactive Delhi transit map
VITE_GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"

# Optional: External GTFS-Realtime VehiclePositions feed
GTFS_RT_API_URL=""
GTFS_RT_API_KEY=""

# Application URL (set automatically in Cloud Run / AI Studio)
APP_URL="http://localhost:3000"
```

---

## Local Development & Build

```bash
# 1. Install dependencies
npm install

# 2. Start development server (Express + Vite on port 3000)
npm run dev

# 3. Type-check TypeScript
npm run lint

# 4. Build production bundle
npm run build
```

---

## Known Limitations & Governance

- Historical ticketing data reflects boarding issuances rather than direct onboard occupancy sensors; alighting turnover is modeled statistically.
- Large multi-gigabyte historical GPS archives are designed for external Python/PostGIS ETL processing rather than in-browser upload.
- Review and tighten `firestore.rules` before deploying broadly to public production environments.
