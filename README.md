# ELYOS Telemetry System

Real-time telemetry platform built for the ELYOS Racing Team at Tecnologico de Monterrey, Campus Guadalajara, to monitor, record, and analyze data from an electric prototype for Shell Eco-marathon style testing and race operations.

![Dashboard Screenshot](./images/Dashboard.png)

## Table of Contents

- [Project Overview](#project-overview)
- [Current Status](#current-status)
- [Main Features](#main-features)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [System Architecture](#system-architecture)
- [Data Flow](#data-flow)
- [Backend](#backend)
- [Frontend](#frontend)
- [Database Model](#database-model)
- [Environment Variables](#environment-variables)
- [Local Development Setup](#local-development-setup)
- [How to Operate the System](#how-to-operate-the-system)
- [REST API Reference](#rest-api-reference)
- [Socket.IO Events](#socketio-events)
- [Utility Scripts](#utility-scripts)
- [Deployment Notes](#deployment-notes)
- [Known Limitations and Risks](#known-limitations-and-risks)
- [Troubleshooting](#troubleshooting)
- [Roadmap Ideas](#roadmap-ideas)
- [License](#license)

## Project Overview

This project is a full-stack telemetry system designed to:

- receive live telemetry samples from an external data source,
- visualize vehicle state in near real time,
- manage race sessions and laps,
- optionally persist telemetry into PostgreSQL,
- export stored telemetry as Excel,
- provide limited race-control actions to authorized operators.

The application is split into:

- a Node.js + Express backend that exposes REST endpoints, Socket.IO channels, and database access,
- a React frontend that renders the dashboard and operator controls,
- a PostgreSQL database that stores historical sessions and telemetry lectures.

In the codebase, telemetry samples are called `lectures`.

## Current Status

The project is usable today primarily through the `Dashboard` page.

Implemented and active:

- live dashboard visualization,
- race timer and lap state synchronization via Socket.IO,
- session creation,
- lecture ingestion toggle,
- vehicle parameter updates,
- telemetry export to `.xlsx`,
- pilot/configuration/session CRUD endpoints on the backend,
- PostgreSQL schema creation script.

Present but not fully built out in the UI:

- `Analysis`,
- `Sessions`,
- `Pilots`,
- `Settings`.

Those routes exist in the frontend navigation, but only the dashboard currently contains a complete workflow.

## Main Features

- Real-time speed display using vector magnitude from `velocity_x` and `velocity_y`
- Voltage/current trend chart
- Battery percentage indicator based on pack voltage
- GPS location map using Leaflet and OpenStreetMap
- IMU panel for orientation and acceleration data
- Race timer with lap counting and average lap time
- Manual control actions for authorized operators:
  - start session,
  - pause/resume,
  - new lap,
  - reset,
  - save lectures,
  - configure motor and gear ratio,
  - enable/disable DB ingestion,
  - send a message to the route
- Live telemetry mode when ingestion is disabled
- Persistent telemetry mode when ingestion is enabled
- Excel export of stored lectures

## Technology Stack

### Frontend

- React 19
- React Router
- Tailwind CSS
- Framer Motion
- Recharts
- Leaflet / React Leaflet
- Socket.IO Client
- SweetAlert2
- `react-d3-speedometer`

### Backend

- Node.js
- Express 5
- Socket.IO
- PostgreSQL via `pg`
- `dotenv`
- `morgan`
- `cors`
- `xlsx`
- `fast-csv`

## Repository Structure

```text
Elyos-Telemetry/
├── backend/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   └── dbConfig.js
│   ├── controllers/
│   ├── routes/
│   ├── databases/
│   │   └── createTables.js
│   ├── excel/
│   ├── certs/
│   ├── csv/
│   ├── currentSessionStore.js
│   ├── liveTelemetryStore.js
│   ├── raceStateStore.js
│   ├── isRunning.js
│   └── dataIngestion.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   └── dataSimulated/
└── README.md
```

## System Architecture

### High-Level Design

```text
Telemetry producer/device
        |
        v
POST /api/lectures
        |
        +--> liveTelemetryStore (always updated)
        |
        +--> PostgreSQL lectures table (only when ingestion is enabled)
        |
        v
Frontend dashboard polls /api/lectures every second

Operator browser
        |
        +--> REST actions (/sessions, /record, /vehicle-params, /auth)
        |
        +--> Socket.IO admin commands (START_RACE, NEW_LAP, RESET_RACE)
        |
        v
Socket.IO broadcasts synchronized race state to all connected clients
```

### Backend Path Strategy

The backend intentionally supports two API base styles:

- `/api/...`
- `/elyos-telemetry-backend/api/...`

This is implemented to make local use and deployment path-prefix use behave the same.

The same idea is used for Socket.IO:

- `/api/socket.io`
- `/elyos-telemetry-backend/api/socket.io`

## Data Flow

### 1. Race control

1. An operator opens the dashboard.
2. If the URL contains a valid control token, admin buttons are enabled.
3. Pressing `Start` creates a new session in the backend.
4. The frontend calls `/api/record/start` with the new session id.
5. The frontend emits `START_RACE` over Socket.IO.
6. The server updates global race state and broadcasts it to all connected clients.

### 2. Telemetry ingestion

1. An external producer sends lecture samples to `POST /api/lectures`.
2. The backend normalizes the payload.
3. The lecture is always copied into the in-memory live store.
4. If ingestion is enabled, the lecture is also inserted into PostgreSQL.
5. The dashboard polls `/api/lectures` every second and renders the newest sample.

### 3. Lap management

1. An operator presses `New Lap`.
2. The frontend emits `NEW_LAP` over Socket.IO.
3. The backend closes the previous lap timing window in memory and increments the current lap number.
4. Future lecture inserts use the updated lap number by default.

### 4. Pause/resume

- `Pause` stops recording state and turns ingestion off.
- `Resume` starts recording again for the current session id.
- Timer offsets are adjusted in the frontend so elapsed time remains consistent after the pause.

### 5. Save/export

1. The operator clicks `Save`.
2. The frontend requests `/api/record/save`.
3. The backend reads all lectures from the database.
4. The backend converts them into an Excel workbook and returns it as a file download.

## Backend

### Backend Entry Points

- `backend/app.js`
  - creates the Express app,
  - applies middleware,
  - registers route modules,
  - exposes health endpoints.
- `backend/server.js`
  - loads environment variables,
  - creates the HTTP server,
  - attaches Socket.IO,
  - defines vehicle parameter endpoints,
  - manages in-memory race state,
  - tests database connectivity on startup.

### Express Middleware

- `cors()` allows cross-origin requests.
- `express.json()` parses JSON request bodies.
- `morgan('dev')` logs incoming HTTP requests.

### Health Endpoints

- `GET /health` returns `{ ok: true }`
- `GET /` returns `OK`

### In-Memory Stores

These files maintain server runtime state outside the database:

- `backend/raceStateStore.js`
  - keeps the current lap number.
- `backend/currentSessionStore.js`
  - keeps the active session id used by lecture insertion.
- `backend/liveTelemetryStore.js`
  - keeps the most recent lecture for live dashboard mode.
- `backend/isRunning.js`
  - keeps recording on/off state.
- `backend/dataIngestion.js`
  - keeps ingestion enabled/disabled state.

### Vehicle Parameters

Defined in `backend/server.js` and synchronized with Socket.IO.

Stored in memory only:

- `motorId`
- `gearRatio`

Available endpoints:

- `GET /api/vehicle-params`
- `POST /api/vehicle-params`

The frontend uses these values to calculate distance from motor RPM and wheel diameter.

## Frontend

### Frontend Entry

- `frontend/src/index.js` mounts the React app inside `BrowserRouter`.
- `frontend/src/App.js` defines the route map.

### Frontend Routes

- `/` -> `Dashboard`
- `/dashboard` -> `Dashboard`
- `/analysis` -> placeholder page
- `/sessions` -> placeholder page
- `/pilots` -> partial placeholder page
- `/settings` -> placeholder page

### Dashboard Responsibilities

`frontend/src/pages/Dashboard.jsx` is the main operational page. It:

- opens a Socket.IO connection,
- validates operator control permissions,
- reads ingestion state,
- reads vehicle parameters,
- creates sessions,
- controls start/pause/reset/lap commands,
- polls lectures every second,
- computes derived metrics for the UI,
- renders telemetry panels.

### Dashboard Widgets

- `Battery.jsx`
  - vertical/horizontal battery level fill.
- `Speedometer.jsx`
  - real-time speed dial.
- `Performance.jsx`
  - current, voltage, RPM, energy, efficiency, distance, amp-hours, temperature, accelerator percentage.
- `ConsumptionStats.jsx`
  - voltage/current line chart.
- `IMUdata.jsx`
  - roll, pitch, yaw, acceleration.
- `MapGPS.jsx`
  - map centered on current latitude/longitude.
- `RaceStats.jsx`
  - timer, laps, remaining time, operator controls, altitude, satellites, air speed.
- `NavigationBar.jsx`
  - main app navigation.

### Derived Metrics Calculated in the Dashboard

- Speed:
  - `sqrt(velocity_x^2 + velocity_y^2)`
- Power:
  - `voltage_battery * current`
- Total watt-hours:
  - accumulated per second
- Total amp-hours:
  - accumulated per second
- Distance:
  - derived from `rpm_motor`, `gearRatio`, and wheel diameter `0.5588 m`
- `Wh/km`
- `km/kWh`
- Battery percentage:
  - `100 * voltage_battery / 51`

### Frontend Authentication Model

The dashboard looks for a `token` query parameter in the URL:

```text
http://localhost:3000/?token=your-controller-token
```

That token is sent to:

- `GET /api/auth/check-control`

If it matches `CONTROLLER_TOKEN` on the backend, the operator control panel is shown.

## Database Model

The schema is created by `backend/databases/createTables.js`.

### Table: `pilots`

Stores driver information.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `SERIAL` | Primary key |
| `name` | `VARCHAR(100)` | Pilot name |
| `weight` | `NUMERIC(4,2)` | Must be `> 0` |

### Table: `configurations`

Stores vehicle setup snapshots.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `SERIAL` | Primary key |
| `name_config` | `VARCHAR(100)` | Configuration label |
| `creation_date` | `DATE` | Stored on insert |
| `motor` | `VARCHAR(100)` | Motor name/id |
| `tire_pressure` | `NUMERIC(5,2)` | Tire pressure |
| `tire_type` | `VARCHAR(50)` | Tire model/type |
| `total_weight` | `NUMERIC(6,2)` | Vehicle total weight |
| `other_parameters` | `TEXT` | Free text notes |

### Table: `sessions`

Stores a test or real run.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `SERIAL` | Primary key |
| `pilot_id` | `INTEGER` | FK to `pilots(id)` |
| `date` | `DATE` | Set with `NOW()` on insert |
| `duration` | `INTERVAL` | Optional |
| `description` | `TEXT` | Optional notes |
| `session_type` | `VARCHAR(20)` | `test` or `real` |
| `session_group_id` | `VARCHAR(100)` | Group related runs |
| `run_number` | `INTEGER` | Positive integer |

### Table: `lectures`

Stores telemetry samples.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `SERIAL` | Primary key |
| `session_id` | `INTEGER` | FK to `sessions(id)` |
| `lap_number` | `INTEGER` | Current lap |
| `timestamp` | `TIMESTAMPTZ` | Sample time |
| `voltage_battery` | `NUMERIC(6,2)` | Battery voltage |
| `current` | `NUMERIC(6,2)` | Current draw |
| `latitude` | `DOUBLE PRECISION` | GPS latitude |
| `longitude` | `DOUBLE PRECISION` | GPS longitude |
| `acceleration_x` | `NUMERIC(6,2)` | IMU acceleration |
| `acceleration_y` | `NUMERIC(6,2)` | IMU acceleration |
| `acceleration_z` | `NUMERIC(6,2)` | IMU acceleration |
| `orientation_x` | `NUMERIC(6,2)` | Roll-like axis |
| `orientation_y` | `NUMERIC(6,2)` | Pitch-like axis |
| `orientation_z` | `NUMERIC(6,2)` | Yaw-like axis |
| `rpm_motor` | `INTEGER` | Motor RPM |
| `velocity_x` | `NUMERIC(6,2)` | Velocity component |
| `velocity_y` | `NUMERIC(6,2)` | Velocity component |
| `ambient_temp` | `NUMERIC(5,2)` | Ambient temperature |
| `steering_direction` | `NUMERIC(6,2)` | Steering data |
| `altitude_m` | `NUMERIC(6,2)` | Altitude in meters |
| `num_sats` | `SMALLINT` | GPS satellites |
| `air_speed` | `NUMERIC(6,2)` | Air speed |
| `accelPct` | `DECIMAL(3,2)` | Accelerator percentage |

### Table: `laps`

Stores lap boundaries.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `SERIAL` | Primary key |
| `session_id` | `INTEGER` | FK to `sessions(id)` |
| `lap_number` | `INTEGER` | Lap index |
| `start_time` | `TIMESTAMPTZ` | Start time |
| `end_time` | `TIMESTAMPTZ` | End time |

## Environment Variables

The backend loads variables from `backend/env/.env`.

### Required database variables

Use either `DATABASE_URL` or the split credentials:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Full Postgres connection string |
| `DB_USER` | Postgres user |
| `DB_HOST` | Postgres host |
| `DB_NAME` | Database name |
| `DB_PASSWORD` | Database password |
| `DB_PORT` | Database port, default `5432` |

### Optional backend variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend HTTP port, default `8080` |
| `NODE_ENV` | Enables production-sensitive behavior |
| `CONTROLLER_TOKEN` | Enables admin dashboard controls |
| `DB_SSL` | Force SSL on DB connection |
| `DB_SSL_REJECT_UNAUTHORIZED` | Strict SSL verification |
| `DB_CA_CERT_PATH` | Custom CA certificate path |
| `PGSSLMODE` | SSL mode compatibility hint |

### Example `.env`

```env
PORT=8080
CONTROLLER_TOKEN=change-this-token

DB_HOST=localhost
DB_PORT=5432
DB_NAME=elyos_telemetry
DB_USER=postgres
DB_PASSWORD=postgres

# Or use DATABASE_URL instead of the DB_* values above
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/elyos_telemetry

DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=false
```

## Local Development Setup

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd Elyos-Telemetry
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 4. Create the backend environment file

Create:

```text
backend/env/.env
```

Fill it with the variables shown above.

### 5. Create the database schema

```bash
cd backend
node databases/createTables.js
```

Important:

- this script drops existing `laps`, `lectures`, `sessions`, `configurations`, and `pilots` tables before recreating them,
- do not run it against a database you want to preserve.

### 6. Start the backend

```bash
cd backend
npm start
```

The backend defaults to:

```text
http://localhost:8080
```

### 7. Start the frontend

```bash
cd frontend
npm start
```

The frontend defaults to:

```text
http://localhost:3000
```

### 8. Update the frontend backend origin for local testing

At the moment, `frontend/src/pages/Dashboard.jsx` contains a hardcoded production backend origin:

```js
const BACKEND_ORIGIN = "https://elyos-telemetry-exylp.ondigitalocean.app";
const BACKEND_BASE_PATH = "/elyos-telemetry-backend";
```

For fully local development, change that constant to point to your local backend, for example:

```js
const BACKEND_ORIGIN = "http://localhost:8080";
const BACKEND_BASE_PATH = "";
```

If you keep the production value, the local frontend will continue talking to the deployed backend instead of your local backend.

## How to Operate the System

### Open the dashboard

Navigate to:

```text
http://localhost:3000/
```

### Open the dashboard with operator controls

Navigate with the token query parameter:

```text
http://localhost:3000/?token=your-controller-token
```

### Start a run

1. Click `Start`.
2. Fill in:
   - session type,
   - session group,
   - run number,
   - description.
3. Confirm.
4. The frontend creates the session and starts recording.

### Pause a run

- Click `Pause`.
- Recording state is stopped.
- DB ingestion is disabled.

### Resume a run

- Click `Resume`.
- Recording state is restarted for the same session id.

### Mark a new lap

- Click `New Lap`.
- The lap number increments on the backend.
- All connected dashboards receive the update through Socket.IO.

### Reset a run

- Click `Reset`.
- Timer, lap state, and dashboard-derived metrics are cleared.
- Recording is paused.
- The current session id is cleared.
- Ingestion is disabled.

### Save telemetry

- Click `Save`.
- An Excel file named `lectures.xlsx` is downloaded from the backend.

### Change vehicle parameters

- Click `Config car`.
- Update motor id and gear ratio.
- The values are broadcast to all connected clients.

### Send a route message

- Click `Send message`.
- The message is stored in memory through the backend record controller.

## REST API Reference

The endpoints below work under both:

- `/api/...`
- `/elyos-telemetry-backend/api/...`

### Auth

#### `GET /auth/check-control`

Validates whether a client can access the operator controls.

Accepted token sources:

- `Authorization: Bearer <token>`
- query string `?token=<token>`

Response:

```json
{
  "canControl": true
}
```

### Vehicle Parameters

#### `GET /vehicle-params`

Response:

```json
{
  "motorId": "Koford",
  "gearRatio": 1
}
```

#### `POST /vehicle-params`

Request body:

```json
{
  "motorId": "HUB1",
  "gearRatio": 2.5
}
```

### Lectures

#### `GET /lectures`

Returns all persisted lectures plus the latest in-memory lecture if it is newer than the last DB row.

#### `GET /lectures/session/:sessionId`

Returns lectures for a specific session, ordered by timestamp.

#### `GET /lectures/:id`

Returns one lecture by id.

#### `POST /lectures`

Creates a lecture.

Request body fields supported by the backend:

```json
{
  "session_id": 1,
  "lap_number": 1,
  "timestamp": "2026-03-16T18:00:00.000Z",
  "voltage_battery": 48.2,
  "current": 12.3,
  "latitude": 20.6597,
  "longitude": -103.3496,
  "acceleration_x": 0.2,
  "acceleration_y": 0.1,
  "acceleration_z": 0.0,
  "orientation_x": 1.1,
  "orientation_y": 0.4,
  "orientation_z": -0.6,
  "rpm_motor": 3200,
  "velocity_x": 3.0,
  "velocity_y": 4.0,
  "ambient_temp": 27.5,
  "steering_direction": 0.0,
  "altitude_m": 1560.4,
  "num_sats": 8,
  "air_speed": 12.5,
  "accelPct": 0.72
}
```

Behavior notes:

- if `session_id` is omitted, the backend uses the current session id from memory,
- if `lap_number` is omitted, the backend uses the current lap number from memory,
- if ingestion is disabled, the lecture is accepted for live mode but not written to PostgreSQL.

### Pilots

#### `GET /pilots`

Returns all pilots ordered by id.

#### `GET /pilots/name/:name`

Returns pilots matching a name.

#### `POST /pilots`

```json
{
  "name": "Driver 1",
  "weight": 68.5
}
```

#### `PUT /pilots/:id`

```json
{
  "name": "Driver 1",
  "weight": 69.0
}
```

#### `DELETE /pilots/:id`

Deletes a pilot.

### Configurations

#### `GET /configurations`

Returns all configurations.

#### `GET /configurations/:id`

Returns one configuration.

#### `POST /configurations`

```json
{
  "name_config": "Race config A",
  "motor": "Koford",
  "tire_pressure": 90,
  "tire_type": "Michelin",
  "total_weight": 145.3,
  "other_parameters": "Baseline setup"
}
```

#### `PUT /configurations/:id`

Updates a configuration.

#### `DELETE /configurations/:id`

Deletes a configuration.

### Sessions

#### `GET /sessions`

Returns all sessions.

#### `GET /sessions/:id`

Returns one session.

#### `POST /sessions`

```json
{
  "pilot_id": 1,
  "duration": null,
  "description": "Morning test",
  "session_type": "test",
  "session_group_id": "2026-03-16-track-a",
  "run_number": 1
}
```

Validation:

- `session_type` must be `test` or `real`
- `run_number` must be a positive integer when provided

#### `DELETE /sessions/:id`

Deletes a session.

### Laps

#### `POST /laps`

Creates a lap row.

```json
{
  "session_id": 1,
  "lap_number": 1,
  "start_time": "2026-03-16T18:00:00.000Z"
}
```

#### `PATCH /laps/:id/end`

Closes a lap.

```json
{
  "end_time": "2026-03-16T18:05:00.000Z"
}
```

#### `GET /laps/:id/laps`

Intended to return laps for a session.

Note:

- the current controller reads `session_id` from params while the route uses `:id`, so this endpoint likely needs a small follow-up fix before it works reliably.

### Record / Runtime Control

#### `POST /record/start`

Starts recording and optionally sets the current session id.

```json
{
  "session_id": 12
}
```

#### `POST /record/pause`

Stops recording.

```json
{
  "clearSession": false
}
```

#### `GET /record/status`

Returns:

```json
{
  "isRunning": true,
  "session_id": 12
}
```

#### `GET /record/ingestion`

Returns:

```json
{
  "ingestionEnabled": true
}
```

#### `POST /record/ingestion`

```json
{
  "ingestionEnabled": false
}
```

#### `POST /record/newLap`

Accepts a new lap request only if recording is active.

#### `POST /record/message`

```json
{
  "message": "Reduce throttle on the next straight"
}
```

#### `GET /record/message`

Returns the last stored message.

#### `GET /record/save`

Exports all rows from `lectures` as an Excel file.

## Socket.IO Events

Configured in `backend/server.js`.

### Server -> client

- `init-state`
  - initial race state after connection.
- `params-updated`
  - emitted when motor/gear ratio changes.
- `ejecutar-accion`
  - broadcast after race control commands with updated state.

### Client -> server

- `comando-admin`
  - accepts:
    - `START_RACE`
    - `RESET_RACE`
    - `NEW_LAP`

Example payload:

```json
{
  "accion": "START_RACE"
}
```

### Race state shape

```json
{
  "isRunning": true,
  "startTime": 1760000000000,
  "laps": [320, 315],
  "lapsNumber": 3,
  "lastLapStartTime": 1760000500000,
  "serverNow": 1760000600000
}
```

## Utility Scripts

### `backend/databases/createTables.js`

Drops and recreates the main database schema.

### `backend/uploadCSVdata.js`

Reads `backend/csv/data.csv` and inserts rows into `lectures`.

Use carefully:

- it assumes the CSV columns match the insert order hardcoded in the script,
- its error handling references `client` in the catch block without outer scope protection, so it may require a small fix before production use.

### `backend/excel/write.js`

Standalone script that exports all lectures to `output.xlsx`.

### `frontend/dataSimulated/simulateData.js`

Simple Express server that generates fake lecture-like data on:

```text
http://localhost:4000/api/lectures
```

This script is useful as a simulator reference, but it is not wired directly into the main frontend/backend flow.

## Deployment Notes

Current frontend code points to a deployed backend:

```text
https://elyos-telemetry-exylp.ondigitalocean.app/elyos-telemetry-backend
```

That means:

- production dashboard behavior depends on that deployment being available,
- local frontend development currently requires editing the backend origin constant,
- deployment path-prefix support was intentionally added on the backend.

The backend also attempts to detect the machine local IP on startup to log reachable addresses for devices on the same network.

## Known Limitations and Risks

- The dashboard is the only fully implemented page in the frontend.
- Backend and frontend configuration are partly hardcoded instead of driven by environment variables.
- There is no automated backend test suite.
- The existing frontend test is still the default Create React App placeholder and does not reflect current UI behavior.
- `createTables.js` is destructive because it drops tables before recreating them.
- `record/save` exports all lectures, not only the current session.
- Several runtime states are stored only in memory:
  - current lap number,
  - current session id,
  - recording status,
  - ingestion status,
  - latest live lecture,
  - vehicle parameters.
- Restarting the backend resets all in-memory runtime state.
- Authorization is minimal and based only on a shared control token.
- The `GET /laps/:id/laps` implementation currently appears inconsistent with its controller parameter name.
- The dashboard polls lectures every second instead of subscribing to telemetry through Socket.IO, which is simpler but less efficient.

## Troubleshooting

### Frontend loads but no data appears

Check:

- the backend is running,
- the frontend is pointing to the correct backend origin,
- lecture samples are being posted to `/api/lectures`,
- CORS is not blocked by your environment.

### Operator buttons do not appear

Check:

- `CONTROLLER_TOKEN` is set in `backend/env/.env`,
- the dashboard URL includes `?token=...`,
- the token matches exactly.

### Database connection fails

Check:

- `backend/env/.env` exists,
- database credentials are correct,
- SSL settings match your Postgres provider,
- the CA certificate path is valid if strict SSL is enabled.

### Saving Excel returns empty or partial data

Check:

- ingestion is enabled while lectures are being recorded,
- lectures exist in the database,
- you are not relying only on live mode with ingestion disabled.

### Lap changes do not match expectations

Check:

- operators are using the dashboard buttons connected to Socket.IO,
- the backend has not been restarted during the run,
- lecture producers are not overriding `lap_number` manually.

## Roadmap Ideas

- Move backend/frontend URLs and paths into environment variables
- Implement real UI pages for sessions, pilots, settings, and analysis
- Add session-scoped export instead of exporting all lectures
- Persist vehicle parameters and runtime state in the database
- Replace polling with pushed live telemetry events
- Add authentication/authorization beyond a shared token
- Add backend tests and real frontend integration tests
- Add configuration history linked to sessions
- Add richer analytics and post-run comparison views

## License

Released under the [MIT License](./LICENSE).

## Acknowledgment

Built for the ELYOS Racing Team and its telemetry, testing, and competition workflows in electric mobility and energy-efficiency events.
