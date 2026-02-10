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
┌──────────────────────────────────────────────────────────────────┐
│  Browser (Vue 3 + Vuetify 3 SPA)                                │
│  ┌───────────────┐ ┌────────────┐ ┌──────────────────────────┐  │
│  │ Pinia Stores  │ │  Router    │ │  Views                   │  │
│  │ app, projects │ │  auth,     │ │  Timesheet (weekly cal), │  │
│  │ tickets,      │ │  admin,    │ │  Export preview,         │  │
│  │ timesheet,    │ │  timesheet │ │  Admin (projects/users), │  │
│  │ invite        │ │  export    │ │  Invite landing/manage   │  │
│  └───────────────┘ └────────────┘ └──────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ REST / HTTP
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  Elysia.js API (Bun runtime)                                    │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │  Auth & Security     │  │  REST Controllers                │ │
│  │  JWT httpOnly cookie │  │  auth, user, org, invite         │ │
│  │  OAuth 2.0 (5 prov.) │  │  project, ticket, time-entry    │ │
│  │  Role-based access   │  │  export (Excel/PDF)              │ │
│  │  (admin/manager/     │  │  + 7 ERP modules (accounting,   │ │
│  │   member)            │  │    invoicing, warehouse, payroll,│ │
│  └──────────────────────┘  │    hr, crm, erp)                │ │
│                            └───────────────┬──────────────────┘ │
└────────────────────────────────────────────┼────────────────────┘
                                             │
            ┌────────────────────────────────┼─────────────────┐
            ▼                                ▼                 ▼
┌────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐
│  Services Layer    │  │  Reporting Engine      │  │  External       │
│  ┌──────────────┐  │  │  ┌─────────────────┐  │  │  Integrations   │
│  │ 30+ DAOs     │  │  │  │ ExcelJS         │  │  │                 │
│  │ BaseDao<T>   │  │  │  │ (SUM, formulas) │  │  │  OAuth:         │
│  │ Auth service │  │  │  ├─────────────────┤  │  │  Google,        │
│  │ OAuth service│  │  │  │ md-to-pdf       │  │  │  Facebook,      │
│  │ Pino logger  │  │  │  │ (PDF export)    │  │  │  GitHub,        │
│  └──────┬───────┘  │  │  └─────────────────┘  │  │  LinkedIn,      │
│         │          │  └───────────────────────┘  │  Microsoft      │
└─────────┼──────────┘                             └─────────────────┘
          ▼
┌───────────────────────┐
│  MongoDB 7            │
│  48+ collections      │
│  (multi-tenant,       │
│   orgId scoping)      │
│                       │
│  Core: org, user,     │
│    project, ticket,   │
│    time-entry, invite │
│  ERP: 7 modules       │
└───────────────────────┘
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
