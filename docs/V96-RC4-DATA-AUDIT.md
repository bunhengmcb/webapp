# V96 RC4 Data Audit — 29 Aug 2026

Source checked: MCB-INVENTORY-SYSTEM-V10-OFFICIAL-FINAL.xlsx.

- Active Project/Site records found: 4 — VLS, SSP, FPF, WH.
- Item Master populated rows found: 980.
- Item Master rows with missing UOM: 386. These remain review warnings; quantity must never be auto-converted.
- Approved BOM source sheet (`BOM Data`) populated data rows found: 0. The sheet currently contains headers/instructions only.
- Opening Current Stock is NOT taken from legacy Current Stock. Verified Physical Count remains mandatory.
- Library search did not surface a populated verified Physical Count dataset in this pass.

## Release impact
Project/Site and Item Master can be prepared for migration. BOM and Opening Stock are hard data blockers until approved BOM rows and verified Physical Count actual quantities are supplied/confirmed. Do not substitute BOM Control calculations or legacy Current Stock.
