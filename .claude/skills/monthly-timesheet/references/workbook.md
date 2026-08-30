# The Zeiterfassung workbook

`e069019-Zeiterfassung.xlsx` — SharePoint
`/sites/PNA/CEPS/PNABauprojektmanagementplattform/P.CON/`.
One sheet per month, named `MM-YYYY`. As of 2026-08-31: 29 sheets,
`04-2024` … `08-2026`, 725 entries, 4649.50 h.

Locate it via the site's REST API rather than guessing a path —
`/sites/PNA/CEPS/_api/web/GetFileById('<sourcedoc GUID>')` returns
`ServerRelativeUrl`. `/sites/PNA/CEPS` is a **subsite**, so
`/sites/PNA/_api/...` returns 403 for it.

## Two layouts — always detect columns by header text

**Layout 1 — `04-2024` … `01-2026`** (22 sheets)

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Datum | Kommen | Gehen | **Pause [min.]** | Tätigkeit | Beschreibung | Jira-Ref. / Applikation | Arbeitszeit `=(C-B)*24-D/60` | Anmerkung |

**Layout 2 — `02-2026` onward** (7 sheets)

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| Datum | Kommen | Gehen | Tätigkeit | Beschreibung | Jira-Ref. / Applikation | Arbeitszeit `=(C-B)*24` | Anmerkung |

**The trap:** computing hours as `(end-start)` on Layout 1 ignores the break and
overstates every month before 02-2026 — `09-2024` reads 188 h instead of 168 h,
and the whole migration reads 4921 h instead of 4507.50 h. It looks plausible,
which is why it must be caught by reconciling against each sheet's own `SUM()`
formula rather than by eyeballing.

Header rows sit at row 9; data starts at row 10. Column positions shift between
layouts, so match on the header strings (`datum`, `kommen`, `gehen`, `pause`,
`tätigkeit`, `beschreibung`, `jira`, `arbeitszeit`, `anmerkung`).

## Meta block (rows 2-7)

```
Projekt/ Geschäftsbereich | PNA - Modernisierung Bauprojektmanagement Plattform   (B2:D2 merged)
Monat                     | MM-YYYY
Mitarbeiter (eNr.)        | Goran Jovanov (e069019)
Rolle                     | Senior Developer Fullstack
Lieferant                 | T-Systems
Bestell-Nr.               | 339/4350820370
```

## Totals block and the cross-sheet chain

Below the data, three rows keyed off the Jira-Ref column:

```
Gesamt            =SUM(G10:G<last+1>)
Durchschnittlich  =AVERAGE(G<gesamt>,'<prev>'!G61,'<prev-1>'!G44, … ,'01-2026'!H41)
Kontingent (Rest) =1760-G<gesamt>-'<prev>'!G61- … -'01-2026'!H41
```

The chain covers the **calendar year** only, and `1760` is that year's hour
budget. Each month's total sits at a different cell (`01-2026` is at `H41`
because it is Layout 1 with the extra column) — `add-month-sheet.ts` derives the
chain by finding each sheet's own `SUM()` cell rather than hardcoding it.

## Package parts that must survive an edit

```
docMetadata/LabelInfo.xml     Microsoft Purview sensitivity label, enabled="1"
xl/drawings/drawing1..28.xml  one per sheet, referencing…
xl/media/image1..4.jpeg       …the embedded logos
customXml/item1..4.xml        SharePoint content-type metadata
xl/printerSettings/*.bin
headerFooter oddFooter        the "TLP gelb (Adressatenkreis)" classification marking
```

ExcelJS models none of the first four. Reading and writing this workbook with it
produces a file that opens fine and has quietly lost its classification — worse
than not editing it at all. Hence the ZIP-level approach in
`scripts/add-month-sheet.ts`, which touches 8 of 143 parts and leaves 135
byte-identical.

`xl/calcChain.xml` is deleted on write so Excel rebuilds it; its
`[Content_Types].xml` override and workbook relationship go with it.

## Known defects in the source (as of 2026-08-31)

- **`03-2026` rows 25-28 are dated `2026-02-09`, but belong to `2026-03-09`.**
  They sit between the 03-06 and 03-10 rows and 03-09 is the only March weekday
  otherwise missing; Feb 9 already has its own four entries with the same time
  blocks. A month-digit typo worth 10 h. `extract-workbook.ts` corrects it and
  logs the correction. **Still uncorrected in the workbook itself.**
- **Duplicate / overlapping rows.** `2026-02-18` books 18 h (rows 45/47 and 46/48
  share time blocks) and `2026-07-22` books 14 h (rows 53/54 duplicate 43/44,
  same ticket, same note). The sheet `SUM`s include them, so they were billed —
  they are carried through rather than silently dropped.
- 188 rows carry a date but no times — weekends (`WOCHEENDE`) and non-worked
  days. Correctly skipped.
