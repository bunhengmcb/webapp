MCB Inventory V43.14-STAGING — Role-Based Access Control

Scope
- Developer: full access to every module and every site.
- Admin: full operational/admin access to every site; cannot create/assign Developer.
- Storekeeper: operational modules only. Writes are server-enforced to assigned site; legitimate site transfers may update the counterpart site.
- QS: Dashboard, BOM Control, Current Stock, Transactions, Alerts. BOM writes are server-enforced to assigned site. Item Master/stock/equipment writes are blocked.
- Management: read-only dashboard/BOM/current stock/transactions/alerts.
- User Access remains Developer/Admin only. Admin access requests require Developer approval.

Security boundary
The UI hides disallowed modules, but the important control is also in /api/state. A user cannot bypass the sidebar and submit a forbidden state change directly to the API.

Site behavior
For non-Developer/non-Admin users with a primary site, the Site View selector is locked to that site and operational entry forms only offer that assigned site. Storekeeper transfer source is locked to the assigned site.

Install
1. Extract this patch over D:\MCB-Inventory-System-Source
2. Run: npx vinext build
3. Run: npx @vinext/cloudflare deploy --name mcb-inventory-staging

No D1 migration is required for V43.14.

Verification checklist
1. Developer: all modules + ALL SITES.
2. Admin: all modules + ALL SITES.
3. Storekeeper: no User Access / Item Master; assigned-site selector locked; stock operations at assigned site succeed; another-site API write is rejected 403.
4. QS: BOM can be edited only for assigned site; stock/equipment state writes rejected 403.
5. Management: read-only; any state PUT returns 403 if it changes data.
6. Admin request approval still requires Developer.
