# Goods Receipts Module Design

**Goal:** Complete the procurement flow with a small Goods Receipts (GR) module that receives submitted purchase orders and posts received quantities back to PO and PR lines.

**Scope:** Add GR list, create, and detail pages; REST endpoints for list, create, detail, and post; transactional quantity validation and updates; focused Jest, Vue, and Playwright coverage.

## Behavior

- A GR can be created only for a submitted PO with at least one open line.
- A GR contains a receipt date, optional notes, and one or more lines with `poLineId`, positive `qtyReceived`, and `actualSiteCode`.
- Each received quantity must not exceed the PO line's current open quantity.
- Posting is allowed only for a draft GR. Posting locks the relevant rows, increments `po_lines.qty_received` and the related `pr_lines.qty_received`, and changes the GR status to `POSTED` in one transaction.
- Repeated posting and invalid status transitions return a clear 422 response; missing records return 404.

## API

- `GET /api/goods-receipts` returns GR headers ordered newest first.
- `POST /api/goods-receipts` creates a draft GR and its lines.
- `GET /api/goods-receipts/:id` returns the GR header and enriched lines.
- `POST /api/goods-receipts/:id/post` posts the GR and returns the updated detail.

## UI

- Add Goods Receipts to the main navigation.
- GR List shows GR number, PO number, status, receipt date, and a detail action.
- GR Create selects an eligible PO, loads open lines, and allows receiving partial quantities.
- GR Detail displays header and quantity tracking, with `Post GR` available for drafts and a link back to the PO.
- Reuse the existing page header, card panel, table, form, status, and error styles.

## Testing

- Jest service tests cover create validation, over-receipt rejection, posting updates, and draft-only posting.
- Vue tests cover the create form payload and detail post action.
- Playwright covers the seeded draft GR and a create/post flow through the application.