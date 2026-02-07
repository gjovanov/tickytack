# Architecture

## System Overview

```mermaid
graph TB
    subgraph Client["Browser"]
        UI["Vue 3 + Vuetify SPA<br/>:3000"]
    end

    subgraph Server["Bun Runtime"]
        API["Elysia.js API<br/>:3001"]
        RPT["Reporting<br/>ExcelJS / md-to-pdf"]
    end

    subgraph Data["Persistence"]
        DB[(MongoDB 7)]
    end

    UI -->|"axios / REST"| API
    API -->|"Mongoose ODM"| DB
    API --> RPT
    RPT -->|".xlsx / .pdf"| UI
```

## Monorepo Package Graph

The project is organized as a Bun workspace monorepo with 8 packages. Arrows indicate dependency direction.

```mermaid
graph LR
    config["config"]
    db["db"]
    services["services"]
    api["api"]
    reporting["reporting"]
    ui["ui"]
    tests["tests"]
    e2e["e2e"]

    db --> config
    services --> db
    services --> config
    api --> services
    api --> reporting
    api --> config
    reporting --> services
    tests --> api
    tests --> services
    tests --> db
    tests --> config
    tests --> reporting
    e2e --> config
    e2e --> db

    style ui fill:#42b883,color:#fff
    style api fill:#e65100,color:#fff
    style db fill:#4caf50,color:#fff
    style reporting fill:#1976d2,color:#fff
```

### Package Responsibilities

| Package | Purpose | Key Dependencies |
|---------|---------|-----------------|
| **config** | Environment variable loader | — |
| **db** | Mongoose models, connection | config |
| **services** | DAOs, Pino logger | db, config |
| **api** | Elysia.js REST server, JWT auth, CORS | services, reporting, config |
| **reporting** | Excel (ExcelJS) and PDF (md-to-pdf) generators | services |
| **ui** | Vue 3 + Vuetify SPA, Pinia stores, Vue Router | axios (runtime) |
| **tests** | Integration tests, seed script | api, services, db, config, reporting |
| **e2e** | Playwright browser tests | config, db |

## Request Flow

A typical authenticated API request flows through these layers:

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as Elysia API
    participant M as JWT Derive
    participant C as Controller
    participant D as DAO
    participant DB as MongoDB

    B->>A: POST /api/org/:orgId/timeentry
    A->>M: Extract JWT from cookie
    M->>M: Verify token, attach user
    M->>C: TimeEntry Controller
    C->>C: Validate body (TypeBox)
    C->>D: timeEntryDao.create()
    D->>DB: Mongoose save()
    DB-->>D: Document
    D->>D: Populate refs (ticket, project)
    D-->>C: Populated entry
    C-->>B: 200 JSON response
```

## Backend Layers

```mermaid
graph TD
    subgraph API["API Layer (Elysia)"]
        Controllers["Controllers<br/>Route handlers"]
        Middleware["Derives<br/>JWT auth, user context"]
        Validation["TypeBox<br/>Body/query schemas"]
    end

    subgraph Service["Service Layer"]
        DAOs["DAOs<br/>Data access objects"]
        Logger["Logger<br/>Pino"]
    end

    subgraph Data["Data Layer (Mongoose)"]
        Models["Models<br/>Schemas + indexes"]
        Connection["Connection<br/>MongoDB driver"]
    end

    Controllers --> DAOs
    Middleware --> Controllers
    Validation --> Controllers
    DAOs --> Models
    Models --> Connection

    style API fill:#e65100,color:#fff
    style Service fill:#1976d2,color:#fff
    style Data fill:#4caf50,color:#fff
```

## Frontend Layers

```mermaid
graph TD
    subgraph Views["Views (Pages)"]
        TV["TimesheetView"]
        EV["ExportView"]
        AV["Admin Views"]
        AuthV["Auth Views"]
    end

    subgraph Components["Components"]
        Cal["Calendar<br/>Weekly/Daily/Monthly"]
        Card["TimeEntryCard<br/>Drag/Resize"]
        Dialog["TimeEntryDialog"]
        Tables["v-data-table"]
    end

    subgraph State["Pinia Stores"]
        AppS["appStore<br/>auth, theme, locale"]
        TSS["timesheetStore<br/>entries, viewMode"]
        PS["projectsStore"]
        TS["ticketsStore"]
    end

    subgraph HTTP["HTTP Layer"]
        Client["axios httpClient<br/>JWT interceptor"]
    end

    Views --> Components
    Views --> State
    State --> HTTP
    HTTP -->|"REST"| API["Elysia API :3001"]

    style Views fill:#42b883,color:#fff
    style State fill:#ff9800,color:#fff
```
