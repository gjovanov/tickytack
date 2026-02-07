# Use Cases

## User Roles & Permissions

```mermaid
graph TD
    Admin["Admin"]
    Manager["Manager"]
    Member["Member"]

    Admin -->|"Full CRUD"| Orgs["Organizations"]
    Admin -->|"Full CRUD"| Users["Users"]
    Admin -->|"Full CRUD"| Projects["Projects"]
    Admin -->|"Full CRUD"| Tickets["Tickets"]
    Admin -->|"Full CRUD"| Time["Time Entries"]
    Admin -->|"Download"| Export["Export"]

    Manager -->|"Create/Edit"| Users
    Manager -->|"Create/Edit"| Projects
    Manager -->|"Full CRUD"| Tickets
    Manager -->|"Full CRUD"| Time
    Manager -->|"Download"| Export

    Member -->|"Full CRUD"| Time
    Member -->|"Read"| Projects
    Member -->|"Read/Create"| Tickets
    Member -->|"Download"| Export

    style Admin fill:#d32f2f,color:#fff
    style Manager fill:#f57c00,color:#fff
    style Member fill:#1976d2,color:#fff
```

### Permission Matrix

| Resource | Admin | Manager | Member |
|----------|-------|---------|--------|
| Organizations | CRUD | Read | Read |
| Users | CRUD | Create/Edit | Read (self) |
| Projects | CRUD | Create/Edit | Read |
| Tickets | CRUD | CRUD | Read/Create |
| Time Entries | CRUD | CRUD | CRUD (own) |
| Export | Download | Download | Download |

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Vue SPA
    participant API as Elysia API
    participant DB as MongoDB

    U->>UI: Enter orgSlug + username + password
    UI->>API: POST /auth/login
    API->>DB: Find user by (username, orgSlug)
    DB-->>API: User document
    API->>API: Verify bcrypt password
    API->>API: Sign JWT
    API-->>UI: Set httpOnly cookie + user JSON
    UI->>UI: Store token in localStorage
    UI->>UI: Redirect to /timesheet
    Note over UI: All subsequent requests include cookie
```

## Time Entry Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created: Click slot / Quick-log
    Created --> Resized: Drag resize handle
    Created --> Moved: Drag to new slot/day
    Created --> Edited: Click card → dialog
    Resized --> Edited
    Moved --> Edited
    Edited --> Exported: Export page
    Edited --> Deleted: Delete button
    Exported --> [*]: .xlsx / .pdf download
    Deleted --> [*]
```

### Creating a Time Entry

Three methods to create a time entry:

```mermaid
graph LR
    A["Click hour slot"] -->|"prefills date + hour"| Dialog["TimeEntryDialog"]
    B["Click recent ticket"] -->|"prefills ticket"| Dialog
    C["Manual"] -->|"all fields empty"| Dialog
    Dialog -->|"save"| API["POST /timeentry"]
    API --> Calendar["Entry appears on calendar"]
```

### Drag & Drop

When dragging a time entry to a new slot:

1. `dragstart` stores entry data + **grab offset** (mouse position relative to card top)
2. `dragover` on target column highlights drop zone
3. `drop` calculates new start time using **card top position** (mouse Y minus grab offset), snapped to 15-minute grid
4. New end time preserves original duration
5. API `PUT` updates the entry

### Resize

When resizing a time entry via the bottom handle:

1. `mousedown` on resize handle starts tracking
2. `mousemove` updates card height in real-time (snapped to 15 minutes)
3. `mouseup` emits new end time and duration
4. API `PUT` sends both `startTime` + `endTime` so backend recalculates duration
5. Click guard (`recentlyResized` flag, 300ms timeout) prevents the edit dialog from opening

## Export Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant EV as ExportView
    participant API as API
    participant GEN as Generator

    U->>EV: Select date range
    EV->>API: GET /timeentry (preview)
    API-->>EV: entries[]
    EV->>U: Show preview table
    U->>EV: Edit descriptions (optional)
    U->>EV: Click Download
    EV->>API: POST /export/excel<br/>{startDate, endDate, locale, descriptionOverrides}
    API->>GEN: generateTimesheetXLSX(entries, opts, overrides)
    Note over GEN: Hours = formula (End-Start)*24<br/>Total = SUM(Hours)
    GEN-->>API: Buffer
    API-->>EV: .xlsx blob
    EV->>U: Browser download
```

### Description Overrides

Users can customize time entry descriptions in the export preview without modifying the original data:

1. Preview table loads entries for the selected date range
2. Each row has an editable description field
3. Modified descriptions are stored in a `descriptionOverrides` map (`{ entryId: text }`)
4. On download, overrides are sent to the API and applied during file generation
5. Original time entry descriptions remain unchanged in the database

## Multi-Tenant Data Flow

```mermaid
graph TD
    Login["Login with orgSlug"] --> Resolve["Resolve org by slug"]
    Resolve --> Auth["Authenticate user in org"]
    Auth --> Context["Set orgId context"]
    Context --> Scope["All queries scoped to orgId"]

    Scope --> TE["Time Entries<br/>orgId + userId"]
    Scope --> Proj["Projects<br/>orgId"]
    Scope --> Tick["Tickets<br/>orgId + projectId"]
    Scope --> Users["Users<br/>orgId"]

    style Login fill:#78909c,color:#fff
    style Context fill:#d32f2f,color:#fff
```

All API endpoints under `/org/:orgId/...` ensure data isolation between organizations. Users can only access data within their own organization.
