# PO List and Detail Pages Design

## Goal
Finish the Vue Purchase Order module by providing Figma-aligned list and detail pages wired to the existing PO REST API.

## Scope
- Keep the existing Vue Router paths `/purchase-orders` and `/purchase-orders/:id`.
- Reuse the existing API client and global design tokens in `frontend/src/styles.css`.
- Reuse existing page patterns and available PO components.
- Keep the UI limited to list, detail, loading, empty, error, and draft submission states.
- Do not add Goods Receipt behavior or new backend endpoints.

## UI Design
The list page uses the established Figma visual language: white page header, circular back control, pill primary action, white table/panel, pink primary color, status badges, and responsive horizontal table scrolling where needed. It displays PO number, vendor, status, creation date, and a detail action.

The detail page uses the same header and panel patterns. It displays PO header information, order lines, allocation/source requisitions, and a `Submit PO` action only while the PO is `DRAFT`. It preserves loading, empty, success, and API error feedback.

## Data Flow
- List calls `api.listPurchaseOrders()` and renders `response.items`.
- Detail calls `api.getPurchaseOrder(route.params.id)` and renders the returned PO.
- Draft submission calls `api.submitPurchaseOrder(route.params.id)`, updates the displayed PO, then returns to the list after the existing success feedback.
- API errors use the existing `statusCode` and `message` fields; 422 errors are shown as validation errors.

## Testing
Add or update focused Vitest component tests for:
- list API loading and row rendering;
- list navigation to detail and create pages;
- detail API rendering of header, lines, and allocations;
- draft-only submit action;
- successful submit state and API error state.

No backend or database changes are required.
