# Goods Receipts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the GR API and Vue workflow for creating, reviewing, and posting receipts against open PO quantities.

**Architecture:** Follow the existing PO pattern with a focused `goods-receipt-service.js`, thin Fastify routes, API client methods, and three Vue pages. Posting uses a database transaction and row locks so PO and related PR received quantities stay consistent.

**Tech Stack:** Fastify, PostgreSQL, Vue 3, Jest, Vitest, Playwright.

---

### Task 1: GR service validation and create [logic]

**TDD Required:** YES
**Test file:** `backend/tests/services/goods-receipt-service.test.js`

**Files:**
- Create: `backend/tests/services/goods-receipt-service.test.js`
- Create: `backend/src/services/goods-receipt-service.js`

- [ ] Write tests for a valid draft receipt, missing lines, non-positive quantity, and quantity greater than the PO line open quantity.
- [ ] Run `npm test -- --runInBand backend/tests/services/goods-receipt-service.test.js` from the repository root and confirm the new service behavior fails before implementation.
- [ ] Implement mappers, `listGoodsReceipts`, `getGoodsReceiptById`, and transactional `createGoodsReceipt` using `goods_receipts` and `gr_lines`.
- [ ] Run the focused Jest test and confirm it passes.

### Task 2: GR post transaction [logic]

**TDD Required:** YES
**Test file:** `backend/tests/services/goods-receipt-service.test.js`

**Files:**
- Modify: `backend/tests/services/goods-receipt-service.test.js`
- Modify: `backend/src/services/goods-receipt-service.js`

- [ ] Add tests proving a draft GR posts once, updates `po_lines.qty_received` and related `pr_lines.qty_received`, and rejects a posted GR.
- [ ] Run the focused Jest tests and confirm the new tests fail for the missing post behavior.
- [ ] Implement `postGoodsReceipt` with `BEGIN`, row locks, final open-quantity checks, quantity updates, status update, `COMMIT`, and rollback on error.
- [ ] Run the focused Jest test and confirm it passes.

### Task 3: GR REST routes and API client [wiring]

**TDD Required:** NO — route registration and API method wiring; service tests cover the behavior.

**Files:**
- Create: `backend/src/routes/goods-receipt-routes.js`
- Modify: `backend/src/app.js`
- Modify: `frontend/src/api.js`

- [ ] Register `GET /api/goods-receipts`, `POST /api/goods-receipts`, `GET /api/goods-receipts/:id`, and `POST /api/goods-receipts/:id/post` with the same error response convention as PO routes.
- [ ] Register the route plugin in the Fastify app.
- [ ] Add list, create, detail, and post methods to the frontend API object.
- [ ] Run the backend Jest suite and confirm route registration does not break startup.

### Task 4: GR pages and navigation [logic]

**TDD Required:** YES
**Test file:** `frontend/tests/GRCreatePage.test.js`, `frontend/tests/GRDetailPage.test.js`

**Files:**
- Create: `frontend/src/pages/GRListPage.vue`
- Create: `frontend/src/pages/GRCreatePage.vue`
- Create: `frontend/src/pages/GRDetailPage.vue`
- Modify: `frontend/src/router/index.js`
- Modify: `frontend/src/App.vue`
- Create/Modify: `frontend/tests/GRCreatePage.test.js`, `frontend/tests/GRDetailPage.test.js`

- [ ] Write tests for loading PO open lines, submitting a positive receipt payload, displaying a draft GR, and invoking post.
- [ ] Run the focused frontend tests and confirm they fail before the pages exist.
- [ ] Implement pages using existing `page-header`, `card-panel`, `data-table`, form, status, and error patterns.
- [ ] Add routes `/goods-receipts`, `/goods-receipts/new`, and `/goods-receipts/:id`, plus a navigation link.
- [ ] Run the focused frontend tests and confirm they pass.

### Task 5: End-to-end GR flow [logic]

**TDD Required:** YES
**Test file:** `tests/e2e/gr-module.spec.js`

**Files:**
- Create: `tests/e2e/gr-module.spec.js`

- [ ] Add a Playwright test that opens the seeded PO, creates a partial GR, posts it, and verifies `POSTED` status and received quantity.
- [ ] Add a Playwright test that attempts an over-receipt and verifies the validation message.
- [ ] Start the database, backend, and frontend using the repository's existing commands; run `npx playwright test tests/e2e/gr-module.spec.js`.
- [ ] Run frontend build and the full backend/frontend test suites.