# UI & Components

## Page Map

```mermaid
graph LR
    subgraph Public
        Login["/auth/login"]
        Register["/auth/register"]
    end

    subgraph Protected
        TS["/timesheet<br/>Daily | Weekly | Monthly"]
        Export["/export<br/>Preview + Download"]
    end

    subgraph Admin
        Orgs["/admin/orgs"]
        Projects["/admin/projects"]
        Tickets["/admin/tickets"]
        Users["/admin/users"]
    end

    Login -->|"auth"| TS
    Register -->|"auth"| TS
    TS --> Export
    TS --> Admin

    style Login fill:#78909c,color:#fff
    style Register fill:#78909c,color:#fff
    style TS fill:#42b883,color:#fff
    style Export fill:#1976d2,color:#fff
```

## Routes

| Path | View | Auth | Description |
|------|------|------|-------------|
| `/auth/login` | LoginView | public | Org slug + username + password login |
| `/auth/register` | RegisterView | public | New user + organization registration |
| `/` | — | redirect | Redirects to `/timesheet` |
| `/timesheet` | TimesheetView | protected | Main time tracking calendar |
| `/export` | ExportView | protected | Export with preview table |
| `/admin/orgs` | OrgView | protected | Organization management |
| `/admin/projects` | ProjectsView | protected | Project CRUD |
| `/admin/tickets` | TicketsView | protected | Ticket CRUD with project filter |
| `/admin/users` | UsersView | protected | User management with roles |

Navigation guard redirects unauthenticated users to `/auth/login`.

## Views & Components

### TimesheetView

The main time tracking interface with three calendar view modes.

```mermaid
graph TD
    TV["TimesheetView"]
    CT["CalendarToolbar<br/>prev / next / today / mode"]
    WC["WeeklyCalendar<br/>7 columns, Mon-Sun"]
    DC["DailyCalendar<br/>Single day"]
    MC["MonthlyCalendar<br/>Grid with daily totals"]
    COL["DailyColumn<br/>Hour slots 06-22"]
    CARD["TimeEntryCard<br/>Drag + Resize"]
    DLG["TimeEntryDialog<br/>Create / Edit / Delete"]
    SUM["TimesheetSummary<br/>Daily + weekly totals"]
    RT["RecentTickets<br/>Quick-log sidebar"]

    TV --> CT
    TV --> WC
    TV --> DC
    TV --> MC
    TV --> DLG
    TV --> SUM
    TV --> RT

    WC --> COL
    DC --> COL
    COL --> CARD

    style TV fill:#42b883,color:#fff
    style CARD fill:#1976d2,color:#fff
    style DLG fill:#e65100,color:#fff
```

| Component | File | Purpose |
|-----------|------|---------|
| **CalendarToolbar** | `CalendarToolbar.vue` | Navigation (prev/next/today) and view mode toggle (daily/weekly/monthly) |
| **WeeklyCalendar** | `WeeklyCalendar.vue` | 7-day view with DailyColumn per day, 06:00-22:00 slots, auto-scroll to 08:00 |
| **DailyCalendar** | `DailyCalendar.vue` | Single-day view with one DailyColumn |
| **MonthlyCalendar** | `MonthlyCalendar.vue` | Month grid showing total hours per day, colored dots per project |
| **DailyColumn** | `DailyColumn.vue` | Hour slots, drag-drop target, click-to-create, 15-min snap grid |
| **TimeEntryCard** | `TimeEntryCard.vue` | Draggable card with resize handle, project color, ticket info |
| **TimeEntryDialog** | `TimeEntryDialog.vue` | Modal for create/edit with autocomplete ticket search, time pickers |
| **TimesheetSummary** | `TimesheetSummary.vue` | Weekly bar: daily totals (green >= 8h) and weekly total (green >= 40h) |
| **RecentTickets** | `RecentTickets.vue` | Sidebar widget for quick time entry creation from recent tickets |

### ExportView

Export with live preview and editable descriptions.

| Section | Description |
|---------|-------------|
| Format selector | Excel (.xlsx) or PDF |
| Date range | Start/end date pickers |
| Preview table | `v-data-table` with columns: Date, Start, End, Hours, Project, Ticket, Summary, Description |
| Description override | Inline `v-text-field` per row to customize description before export |
| Download button | POST to `/export/{format}` with overrides |

### Admin Views

| View | Key Features |
|------|-------------|
| **ProjectsView** | Data table, color picker, key/name/lead columns, active toggle |
| **TicketsView** | Data table, multi-project filter dropdown, status/priority chips |
| **UsersView** | Data table, role selection, active/inactive toggle, password change |
| **OrgView** | Data table, settings (working hours, week start) |

## State Management

```mermaid
graph TD
    subgraph Pinia["Pinia Stores"]
        AppStore["appStore<br/>auth, theme, locale, org"]
        TSStore["timesheetStore<br/>entries, viewMode, currentDate"]
        ProjStore["projectsStore<br/>projects[]"]
        TickStore["ticketsStore<br/>tickets[], search"]
    end

    subgraph API["REST API"]
        AuthAPI["Auth Endpoints"]
        TEAPI["TimeEntry Endpoints"]
        ProjAPI["Project Endpoints"]
        TickAPI["Ticket Endpoints"]
    end

    AppStore -->|"login/register/me"| AuthAPI
    TSStore -->|"CRUD + fetch"| TEAPI
    ProjStore -->|"CRUD"| ProjAPI
    TickStore -->|"CRUD + search"| TickAPI

    TSStore -.->|"recentTickets"| TickStore
    TSStore -.->|"currentOrg"| AppStore
```

### appStore

| State | Type | Description |
|-------|------|-------------|
| `auth.user` | Object | Current user (null if logged out) |
| `auth.token` | String | JWT token |
| `currentOrg` | Object | Active organization |
| `orgs` | Array | User's organizations |
| `theme` | `'light'` \| `'dark'` | Active theme |
| `locale` | `'en'` \| `'de'` | Active locale |
| `leftDrawer` | Boolean | Navigation drawer state |

**Actions:** `login`, `register`, `logout`, `fetchMe`, `toggleTheme`, `setLocale`, `toggleLocale`

### timesheetStore

| State | Type | Description |
|-------|------|-------------|
| `currentDate` | Date | Selected date |
| `viewMode` | `'daily'` \| `'weekly'` \| `'monthly'` | Calendar view |
| `entries` | Array | Time entries for current range |
| `recentTickets` | Array | Last 10 unique tickets from entries |
| `loading` | Boolean | Fetch in progress |

**Actions:** `fetchEntries`, `createEntry`, `updateEntry`, `deleteEntry`, `goToNext`, `goToPrevious`, `goToToday`, `setViewMode`

### projectsStore

| State | Type | Description |
|-------|------|-------------|
| `projects` | Array | All projects in org |
| `loading` | Boolean | Fetch in progress |

**Actions:** `fetchProjects`, `createProject`, `updateProject`, `deleteProject`

### ticketsStore

| State | Type | Description |
|-------|------|-------------|
| `tickets` | Array | Tickets (filtered by project) |
| `searchResults` | Array | Ticket search results |
| `selectedProjectIds` | Array | Active project filters |
| `loading` | Boolean | Fetch in progress |

**Actions:** `fetchTickets`, `fetchTicketsForProjects`, `searchTickets`, `createTicket`, `updateTicket`, `deleteTicket`
