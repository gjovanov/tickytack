# TickyTack

A full-stack time tracking application replicating JIRA ClockWork functionality, with a weekly calendar view, multi-tenant organization support, and Excel/PDF export with formula-based calculations.

## Features

- **Weekly Calendar Timesheet** — Drag-and-drop time entries with 15-minute snap grid, resize handles, and three view modes (daily, weekly, monthly)
- **Multi-Tenancy** — Organization-based data isolation with slug-based login
- **Project & Ticket Management** — Full CRUD with auto-generated ticket keys and color-coded projects
- **User Management** — Role-based access control (admin, manager, member)
- **Export with Preview** — Preview table with editable descriptions, Excel formulas (`=(End-Start)*24`, `=SUM()`), and PDF markdown rendering
- **Internationalization** — Full EN/DE locale support with one-click toggle
- **Dark/Light Theme** — Persistent theme toggle
- **JWT Authentication** — Secure httpOnly cookie-based auth

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | [Elysia.js](https://elysiajs.com/) (Bun runtime), MongoDB 7, Mongoose |
| **Frontend** | Vue 3 (Composition API), Vuetify 3, Pinia, Vue Router 4, Vue i18n 9 |
| **Reporting** | ExcelJS (formulas), md-to-pdf |
| **Build** | [Bun](https://bun.sh/) workspace monorepo, Vite 7 |
| **Testing** | Bun test + mongodb-memory-server (integration), Playwright 1.52 (E2E) |
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
│   ├── db/            # Mongoose models and MongoDB connection
│   ├── services/      # Data Access Objects (DAOs) and logger (Pino)
│   ├── api/           # Elysia.js REST API server
│   ├── reporting/     # Excel (formulas) and PDF (markdown) export
│   ├── ui/            # Vue 3 + Vuetify frontend SPA
│   ├── tests/         # Integration tests and seed script
│   └── e2e/           # Playwright E2E tests (30 tests)
├── docs/              # Documentation
├── docker-compose.yaml
├── Dockerfile
├── .env               # Dev environment variables
└── .env.test          # Test environment variables
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System overview, package graph, request flow |
| [Data Model](docs/data-model.md) | ER diagram, entity fields and relationships |
| [API Reference](docs/api.md) | All REST endpoints with methods and parameters |
| [UI & Components](docs/ui.md) | Pages, views, components, state management |
| [Use Cases](docs/use-cases.md) | User roles, time entry lifecycle, export workflow |
| [Export](docs/export.md) | Excel formulas, column layout, description overrides |
| [Testing](docs/testing.md) | Test suites, coverage, how to run |
| [Deployment](docs/deployment.md) | Docker, environment variables, seed data, i18n |

## License

ISC
