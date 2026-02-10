# TickyTack

Full-stack time tracking and project management application with weekly calendar view, multi-tenant organization support, ERP modules, and Excel/PDF export with formula-based calculations.

## Features

| Category | Feature | Status |
|----------|---------|--------|
| **Time Tracking** | Weekly calendar with drag-and-drop | :white_check_mark: |
| | 15-minute snap grid, resize handles | :white_check_mark: |
| | Daily, weekly, monthly views | :white_check_mark: |
| **Project Management** | Full CRUD with auto-generated ticket keys | :white_check_mark: |
| | Color-coded projects | :white_check_mark: |
| | Ticket status workflow (open → done → closed) | :white_check_mark: |
| **Accounting** | Chart of Accounts, Journal Entries | :white_check_mark: |
| | Fiscal Years & Periods | :white_check_mark: |
| | Fixed Assets, Bank Accounts, Exchange Rates | :white_check_mark: |
| **Invoicing** | Contacts, Invoices with line items | :white_check_mark: |
| **Warehouse** | Products, Stock Levels, Movements | :white_check_mark: |
| | Price Lists, Stock Movement Tracking | :white_check_mark: |
| **Payroll** | Employees, Payroll Runs, Payslips | :white_check_mark: |
| | ERP Timesheets | :white_check_mark: |
| **HR** | Departments, Leave Management | :white_check_mark: |
| | Business Trips, Employee Documents | :white_check_mark: |
| **CRM** | Pipelines, Leads, Deals, Activities | :white_check_mark: |
| **ERP** | Bill of Materials, Production Orders | :white_check_mark: |
| | Construction Projects, POS | :white_check_mark: |
| **Export** | Excel with formulas (`=SUM()`, `=(End-Start)*24`) | :white_check_mark: |
| | PDF via markdown rendering | :white_check_mark: |
| | Preview table with editable descriptions | :white_check_mark: |
| **Auth** | JWT httpOnly cookies | :white_check_mark: |
| | OAuth (Google, Facebook, GitHub, LinkedIn, Microsoft) | :white_check_mark: |
| | Invite system (shareable links, email invites) | :white_check_mark: |
| **Multi-Tenancy** | Organization-based data isolation | :white_check_mark: |
| | Role-based access (admin, manager, member) | :white_check_mark: |
| **i18n** | English & German with one-click toggle | :white_check_mark: |
| **Theme** | Dark/Light mode with persistence | :white_check_mark: |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | [Bun](https://bun.sh/) |
| **Backend** | [Elysia.js](https://elysiajs.com/), Mongoose |
| **Database** | MongoDB 7 |
| **Frontend** | Vue 3 (Composition API), Vuetify 3, Pinia, Vue Router 4, vue-i18n 9 |
| **Reporting** | ExcelJS (formulas), md-to-pdf |
| **Build** | Bun workspace monorepo, Vite 7 |
| **Testing** | Bun test + mongodb-memory-server, Playwright 1.52 |
| **Infrastructure** | Docker Compose |

## Architecture

```
tickytack/
├── packages/
│   ├── config/        # Environment configuration loader
│   ├── db/            # Mongoose models (48+) and MongoDB connection
│   │   └── src/models/
│   │       ├── org, user, invite          # Core
│   │       ├── project, ticket, time-entry # Time Tracking
│   │       ├── accounting/                 # 7 accounting models
│   │       ├── invoicing/                  # 2 invoicing models
│   │       ├── warehouse/                  # 5 warehouse models
│   │       ├── payroll/                    # 4 payroll models
│   │       ├── hr/                         # 6 HR models
│   │       ├── crm/                        # 4 CRM models
│   │       └── erp/                        # 5 ERP models
│   ├── services/      # DAOs (30+) with BaseDao<T> + logger (Pino)
│   ├── api/           # Elysia.js REST API + JWT auth + OAuth
│   │   └── src/controllers/
│   │       ├── auth/, user/, org/          # Core controllers
│   │       ├── invite/                     # Invite system
│   │       ├── project/, ticket/, timeentry/ # Time tracking
│   │       └── export/                     # Excel/PDF export
│   ├── reporting/     # Excel (formulas) and PDF (markdown) export
│   ├── ui/            # Vue 3 + Vuetify SPA (amber/warm theme)
│   │   └── src/
│   │       ├── views/     # auth, admin, timesheet, export, invite
│   │       ├── store/     # 5+ Pinia stores
│   │       └── plugins/   # i18n → vuetify → pinia → router
│   ├── tests/         # Integration tests (mongodb-memory-server)
│   └── e2e/           # Playwright E2E tests
├── docker-compose.yaml
└── Dockerfile
```

### Package Dependency Flow

```
config ← db ← services ← api (+ reporting)
ui → HTTP → api
tests → db + services (direct import)
e2e → Playwright → api
```

## Quick Start

```bash
# Install dependencies
bun install

# Start MongoDB
docker compose up -d mongodb

# Seed database
bun run packages/tests/seed/seed.ts

# Start API (port 3001) and UI (port 3000)
bun run dev:api
bun run dev:ui
```

Login: Organization `oebb` / Username `gjovanov` / Password `admin123`

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev:api` | Start API with watch mode (port 3001) |
| `bun run dev:ui` | Start Vite dev server (port 3000) |
| `bun run build:ui` | Production UI build |
| `bun run test` | Run integration tests |
| `bun run test:e2e` | Run Playwright E2E tests |

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System overview, package graph, request flow |
| [Data Model](docs/data-model.md) | ER diagram, entity fields and relationships |
| [API Reference](docs/api.md) | All REST endpoints with methods and parameters |
| [UI & Components](docs/ui.md) | Pages, views, components, state management |
| [Export](docs/export.md) | Excel formulas, column layout, description overrides |
| [Testing](docs/testing.md) | Test suites, coverage, how to run |

## License

ISC
