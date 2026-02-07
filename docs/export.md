# Export

## Overview

The export system generates Excel (.xlsx) and PDF files from time entries with support for:
- Live formulas in Excel (not static values)
- Description overrides without modifying source data
- Locale-aware column headers (EN/DE)
- Preview table in the UI before downloading

## Excel Column Layout

Column order: **Date, Start, End, Hours, Project, Ticket, Summary, Description**

| Column | Cell Type | Format | Example |
|--------|-----------|--------|---------|
| **A: Date** | Text | `yyyy-MM-dd` | `2026-02-02` |
| **B: Start** | Time fraction | `HH:mm` | `09:00` (stored as `0.375`) |
| **C: End** | Time fraction | `HH:mm` | `12:00` (stored as `0.5`) |
| **D: Hours** | Formula | `0.00` | `3.00` |
| **E: Project** | Text | — | `PCLASS` |
| **F: Ticket** | Text | — | `PCLASS-101` |
| **G: Summary** | Text | — | `Implement login` |
| **H: Description** | Text | — | `Worked on auth flow` |

## Excel Formulas

### Hours Column

Each data row uses a formula to calculate hours from the time values:

```
Cell D5: =(C5-B5)*24
Cell D6: =(C6-B6)*24
Cell D7: =(C7-B7)*24
```

This subtracts the start time fraction from the end time fraction and multiplies by 24 to convert from days to hours.

### Total Row

The total row uses a SUM formula across all data rows:

```
Cell D9: =SUM(D5:D7)
```

### Time Fractions

Start and end times are stored as Excel time fractions (fraction of a 24-hour day):

| Time | Calculation | Fraction |
|------|------------|----------|
| 00:00 | `(0*60+0)/(24*60)` | `0.0` |
| 06:00 | `(6*60+0)/(24*60)` | `0.25` |
| 09:00 | `(9*60+0)/(24*60)` | `0.375` |
| 12:00 | `(12*60+0)/(24*60)` | `0.5` |
| 18:00 | `(18*60+0)/(24*60)` | `0.75` |

Excel displays these as `HH:mm` via the number format.

## Spreadsheet Structure

```
Row 1: Title        "Timesheet: John Doe"  (bold, size 14)
Row 2: Period       "2026-02-01 - 2026-02-07"
Row 3: (blank)
Row 4: Headers      Date | Start | End | Hours | Project | Ticket | Summary | Description  (bold)
Row 5: Data         2026-02-02 | 09:00 | 12:00 | =(C5-B5)*24 | PCLASS | PCLASS-101 | ...
Row 6: Data         2026-02-02 | 13:00 | 15:00 | =(C6-B6)*24 | PCLASS | PCLASS-102 | ...
Row 7: Data         2026-02-03 | 10:00 | 11:30 | =(C7-B7)*24 | INT    | INT-200    | ...
Row 8: (blank)
Row 9: Total                     Hours: | =SUM(D5:D7)                              (bold)
```

## Description Overrides

The export API accepts an optional `descriptionOverrides` map:

```json
{
  "startDate": "2026-02-01",
  "endDate": "2026-02-07",
  "locale": "en",
  "descriptionOverrides": {
    "6786745ee422fac0b1d68263": "Custom text for this entry",
    "6786745ee422fac0b1d68264": "Different description"
  }
}
```

Override resolution per entry:
1. If `descriptionOverrides[entry._id]` exists → use override
2. Otherwise → use `entry.description` (original)
3. If neither → empty string

This allows users to customize descriptions for export without modifying the time entry records.

## PDF Output

The PDF generator creates a markdown table rendered to PDF via `md-to-pdf`:

```markdown
# Timesheet Report

**User:** John Doe
**Period:** 2026-02-01 - 2026-02-07

| Date | Project | Ticket | Summary | Start | End | Hours | Description |
|------|---------|--------|---------|-------|-----|-------|-------------|
| 2026-02-02 | PCLASS | PCLASS-101 | Implement login | 09:00 | 12:00 | 3.00 | ... |

**Total Hours:** 6.50
```

PDF also supports `descriptionOverrides` using the same resolution logic.

## Localization

Column headers are locale-aware:

| Key | English | German |
|-----|---------|--------|
| date | Date | Datum |
| start | Start | Beginn |
| end | End | Ende |
| hours | Hours | Stunden |
| project | Project | Projekt |
| ticket | Ticket | Ticket |
| summary | Summary | Zusammenfassung |
| description | Description | Beschreibung |
