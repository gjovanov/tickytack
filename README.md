# TickyTack

A full-stack time tracking application replicating JIRA ClockWork functionality, with a weekly calendar view, multi-tenant organization support, and Excel/PDF export.

## Features

- **Weekly Calendar Timesheet** - Drag-and-click time entry on a 7-day calendar grid
- **Multi-Tenancy** - Organization-based data isolation with slug-based login
- **Project & Ticket Management** - CRUD for projects, tickets with auto-generated keys
- **User Management** - Role-based access (admin, manager, member)
- **Internationalization** - Full EN/DE locale support with one-click toggle
- **Export** - Timesheet export to Excel (.xlsx) and PDF
- **Dark/Light Theme** - Toggle between themes
- **JWT Authentication** - Secure httpOnly cookie-based auth

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | [Elysia.js](https://elysiajs.com/) (Bun runtime), MongoDB, Mongoose |
| **Frontend** | Vue 3 (Composition API), Vuetify 3, Pinia, Vue Router 4, Vue i18n 9 |
| **Build** | [Bun](https://bun.sh/) workspace monorepo, Vite 7 |
| **Testing** | Bun test + mongodb-memory-server (unit/integration), Playwright (E2E) |
| **Infrastructure** | Docker Compose (MongoDB 7 + app) |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- [MongoDB](https://www.mongodb.com/) running locally (port 27017) or via Docker

### Setup

```bash
# Install dependencies
bun install

# Start MongoDB (option A: Docker)
docker compose up -d mongodb

# Start MongoDB (option B: local installation)
mongod --dbname tickytack

# Seed the database with sample data
bun run packages/tests/seed/seed.ts

# Start API server (port 3001)
bun run dev:api

# Start UI dev server (port 3000) - in another terminal
bun run dev:ui
```

Open http://localhost:3000 and log in with:
- **Organization:** `oebb`
- **Username:** `gjovanov`
- **Password:** `admin123`

## Project Structure

```
tickytack/
├── packages/
│   ├── config/        # Environment configuration loader
│   ├── db/            # Mongoose models and connection
│   ├── services/      # Data Access Objects (DAOs) and logger
│   ├── api/           # Elysia.js REST API server
│   ├── reporting/     # Excel (ExcelJS) and PDF (md-to-pdf) export
│   ├── ui/            # Vue 3 + Vuetify frontend SPA
│   ├── tests/         # Unit/integration tests and seed script
│   └── e2e/           # Playwright E2E tests
├── docker-compose.yaml
├── Dockerfile
├── .env               # Dev environment variables
└── .env.test          # Test environment variables
```

## API Endpoints

All endpoints are prefixed with `/api`.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Register new user + organization |
| `POST` | `/auth/login` | Login with username, password, orgSlug |
| `GET` | `/auth/me` | Get current authenticated user |
| `POST` | `/auth/logout` | Logout (clears cookie) |

### Organizations

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/org` | List user's organizations |
| `GET` | `/org/:orgId` | Get organization details |
| `PUT` | `/org/:orgId` | Update organization (admin) |
| `DELETE` | `/org/:orgId` | Delete organization (admin) |

### Users

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/org/:orgId/user` | List users in org |
| `POST` | `/org/:orgId/user` | Create user (admin/manager) |
| `PUT` | `/org/:orgId/user/:userId` | Update user |
| `DELETE` | `/org/:orgId/user/:userId` | Delete user (admin) |

### Projects

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/org/:orgId/project` | List projects |
| `POST` | `/org/:orgId/project` | Create project (admin/manager) |
| `GET` | `/org/:orgId/project/:projectId` | Get project |
| `PUT` | `/org/:orgId/project/:projectId` | Update project |
| `DELETE` | `/org/:orgId/project/:projectId` | Delete project (admin) |

### Tickets

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/org/:orgId/project/:projectId/ticket` | List tickets |
| `POST` | `/org/:orgId/project/:projectId/ticket` | Create ticket |
| `GET` | `/org/:orgId/project/:projectId/ticket/:ticketId` | Get ticket |
| `PUT` | `/org/:orgId/project/:projectId/ticket/:ticketId` | Update ticket |
| `DELETE` | `/org/:orgId/project/:projectId/ticket/:ticketId` | Delete ticket |
| `GET` | `/org/:orgId/ticket/search?q=...` | Search tickets by key/summary |

### Time Entries

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/org/:orgId/timeentry?startDate=&endDate=` | Get entries by date range |
| `GET` | `/org/:orgId/timeentry/summary?startDate=&endDate=` | Get summary |
| `POST` | `/org/:orgId/timeentry` | Create time entry |
| `PUT` | `/org/:orgId/timeentry/:id` | Update time entry |
| `DELETE` | `/org/:orgId/timeentry/:id` | Delete time entry |

### Export

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/org/:orgId/export/excel?startDate=&endDate=&locale=` | Download Excel |
| `GET` | `/org/:orgId/export/pdf?startDate=&endDate=&locale=` | Download PDF |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/tickytack` | MongoDB connection string |
| `JWT_SECRET` | `default_secret_change_me` | JWT signing secret |
| `HOST` | `localhost` | API server hostname |
| `PORT` | `3001` | API server port |

## Testing

### Unit & Integration Tests

```bash
# Run all tests with coverage
bun test

# Run tests from specific package
cd packages/tests && bun test
```

Uses Bun test runner with mongodb-memory-server for isolated database testing.

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time)
cd packages/e2e && bunx playwright install chromium

# Run E2E tests (starts API + UI servers automatically)
bun run test:e2e

# Run with visual UI mode
bun run test:e2e:ui
```

E2E tests cover: authentication, timesheet calendar, project/ticket/user CRUD, export, and i18n.

## Docker

```bash
# Start everything (MongoDB + app)
docker compose up --build

# Start only MongoDB
docker compose up -d mongodb
```

The app runs on port 3001 in production mode, serving both the API and the built Vue SPA.

## i18n

Supported locales: **English (en)** and **German (de)**.

Translation files are located in `packages/ui/src/locales/{en,de}/`. Each locale has modules for: `auth`, `nav`, `common`, `timesheet`, `admin`, `export`, `validation`, `errors`, `messages`.

To add a new locale:
1. Create a new directory under `packages/ui/src/locales/` (e.g., `fr/`)
2. Copy the structure from `en/` and translate all strings
3. Add the locale to `SUPPORTED_LOCALES` in `packages/ui/src/locales/index.ts`
4. Add translations to `packages/reporting/` for export localization

## License

ISC
