# sap-odata-v4
Minimal OData v4-style API in Node/Express implementing core query options:
- `$select`, `$filter` (eq, gt, lt, and/or), `$orderby`, `$top`, `$skip`, `$expand`
- Entity sets: `Products`, `Categories`
- OData metadata at `/odata/$metadata`

## Quickstart
```bash
npm install
npm run dev
```
Then browse `http://localhost:4002/odata/Products?$select=Id,Name&$filter=Price gt 20&$orderby=Price desc&$top=5`.
