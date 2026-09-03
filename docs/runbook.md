# PO Module Implementation Runbook

## ✅ Plan Validation

**Status:** VALID for MVP scope  
**Feasibility:** 4-5 hours (realistic for workshop)  
**Risk Level:** LOW — database schema pre-built, PR baseline exists as reference

### Validation Checks
- ✅ Database schema already exists (migration 001_init_procurement_mvp.sql)
- ✅ Sample seed data exists (PO + GR structures already in DB)
- ✅ PR module provides implementation pattern (to copy)
- ✅ API requirements are well-defined in plan.md
- ✅ Tech stack is stable (Fastify + Vue + Jest + Playwright)
- ✅ Scope is bounded (PO only, GR out of scope, Bookmark optional)

---

## 🎯 PO Implementation - Strict Task Sequence

### Phase 1: Backend Foundation (PO APIs)
**Duration:** 90 minutes  
**Deliverable:** 4 PO endpoints fully functional with DB integration

#### Task 1.1: Implement PO Service (Service Layer)
**Depends on:** ✅ Database running + schema exists  
**Checkpoint:** Service exports 6 functions

```
File: backend/src/services/purchase-order-service.js
Functions to implement:
  1. createPurchaseOrder(vendorName)
  2. getPurchaseOrderById(id)
  3. getPurchaseOrderOpenLines(id)
  4. submitPurchaseOrder(id)
  5. addPOLine(poId, prLineData, allocatedQty) — with allocation validation
  6. validateAllocation(prLineId, allocatedQty) — reject if over-allocated
```

**Validation Checkpoint:**
```bash
jest backend/tests/services/purchase-order-service.test.js
# Must pass: 
#   ✅ createPurchaseOrder returns PO with DRAFT status
#   ✅ validateAllocation rejects qty > remaining
#   ✅ addPOLine updates pr_lines.qty_allocated atomically
```

---

#### Task 1.2: Implement PO Routes (Route Handlers)
**Depends on:** Task 1.1 complete  
**Checkpoint:** Routes respond with correct status codes

```
File: backend/src/routes/purchase-order-routes.js
Endpoints to implement:
  1. POST /api/purchase-orders
     Request: { vendorName }
     Response: { id, po_number, status: "DRAFT", ... }
     
  2. POST /api/purchase-orders/:id/submit
     Request: {}
     Response: updated PO with status: "SUBMITTED"
     
  3. GET /api/purchase-orders/:id
     Response: PO header + po_lines array
     
  4. GET /api/purchase-orders/:id/open-lines
     Response: po_lines where qty_received < qty_ordered
```

**Validation Checkpoint:**
```bash
# Test each endpoint manually or via Jest route tests
curl -X GET http://localhost:3000/api/purchase-orders/[id]
# Must return 200 with valid PO JSON structure
```

---

#### Task 1.3: Database Validation & Sample Data Check
**Depends on:** Task 1.2 complete  
**Checkpoint:** Query returns expected seed data

```sql
-- Run in terminal:
docker compose exec -T db psql -U workshop -d procurement_mvp -c "
  SELECT po.id, po.po_number, po.status, COUNT(pol.id) as line_count
  FROM purchase_orders po
  LEFT JOIN po_lines pol ON po.id = pol.po_id
  GROUP BY po.id
  LIMIT 5;
"
-- Expected: PO-2026-0001 with status SUBMITTED and 2 po_lines
```

---

### Phase 2: Frontend Foundation (PO Pages)
**Duration:** 90 minutes  
**Deliverable:** 3 Vue pages fully integrated with backend APIs

#### Task 2.1: Create PO List Page
**Depends on:** Task 1.2 complete (APIs functional)  
**Checkpoint:** Page renders with API data

```
File: frontend/src/pages/POListPage.vue
Must include:
  1. Fetch GET /api/purchase-orders (paginate if needed)
  2. Display table: PO Number | Vendor | Status | Open Qty | Actions
  3. Link to PODetailPage on row click
  4. Button to navigate to POCreatePage
  5. Follow CSS pattern from RequisitionListPage.vue (baseline reference)
```

**Validation Checkpoint:**
```bash
npm run dev
# Open http://localhost:5173
# Navigate to PO List
# Must show at least 1 PO from seed data
```

---

#### Task 2.2: Create PO Create Page (From Approved PR Lines)
**Depends on:** Task 2.1 complete + frontend router configured  
**Checkpoint:** Form submits and creates PO

```
File: frontend/src/pages/POCreatePage.vue
Must include:
  1. Fetch GET /api/requisitions/:id/open-lines (only APPROVED PRs)
  2. Form: vendor name input
  3. Table to select + allocate PR lines:
     - Checkbox to select PR line
     - Input qty_allocated (max = PR line remaining qty)
     - Show validation error if over-allocated
  4. Submit button → POST /api/purchase-orders + add lines
  5. Redirect to PODetailPage on success
  6. Follow UI pattern from RequisitionCreatePage.vue (baseline)
```

**Validation Checkpoint:**
```bash
# On Create PO page:
# 1. Should show APPROVED PR lines from seed data
# 2. Select line + enter qty (max 12 for Bearing 6205)
# 3. Submit → should create PO with status DRAFT
# 4. Verify in DB: pr_lines.qty_allocated incremented
```

---

#### Task 2.3: Create PO Detail Page
**Depends on:** Task 2.2 complete  
**Checkpoint:** Page displays all PO data and allows submit action

```
File: frontend/src/pages/PODetailPage.vue
Must include:
  1. Fetch GET /api/purchase-orders/:id
  2. Display PO header: number, vendor, status, created_at
  3. Display po_lines table: item code | name | qty ordered | qty received | unit price
  4. Conditional button:
     - If status = DRAFT: show "Submit PO" button
     - If status = SUBMITTED: show "View" button (disabled submit)
  5. Submit → POST /api/purchase-orders/:id/submit
  6. Breadcrumb: Back to PO List
  7. Link to GR Create (optional, for future)
  8. Follow pattern from RequisitionDetailPage.vue
```

**Validation Checkpoint:**
```bash
# Navigate to PO Detail for created PO
# Verify: header shows correct vendor, status = DRAFT
# Click "Submit PO" → status should change to SUBMITTED
# Refresh page → status persists as SUBMITTED
```

---

#### Task 2.4: Update Frontend Router
**Depends on:** Task 2.3 complete  
**Checkpoint:** Routes work end-to-end

```
File: frontend/src/router/index.js
Add routes:
  1. /po-list → POListPage
  2. /po-create → POCreatePage
  3. /po/:id → PODetailPage

Update DashboardPage.vue navigation:
  - Add link to "Purchase Orders" → /po-list
```

**Validation Checkpoint:**
```bash
# From Dashboard, click "Purchase Orders" link
# Should navigate to /po-list
# All navigation links should work without 404 errors
```

---

### Phase 3: Validation & Testing (PO-Focused)
**Duration:** 60 minutes  
**Deliverable:** Jest + Playwright tests passing

#### Task 3.1: Jest Tests - PO Service & Routes
**Depends on:** Task 1.3 complete  
**Checkpoint:** All PO tests pass

```
File: backend/tests/services/purchase-order-service.test.js
Test cases (minimum):
  1. ✅ createPurchaseOrder() returns PO with DRAFT status
  2. ✅ validateAllocation() rejects qty > PR line remaining
  3. ✅ addPOLine() updates pr_lines.qty_allocated atomically
  4. ✅ submitPurchaseOrder() changes status DRAFT → SUBMITTED
  5. ✅ getPurchaseOrderOpenLines() filters qty_received < qty_ordered

File: backend/tests/routes/purchase-order-routes.test.js
Test cases (minimum):
  1. ✅ POST /api/purchase-orders returns 201 + PO ID
  2. ✅ POST /api/purchase-orders/:id/submit returns 200 + SUBMITTED status
  3. ✅ GET /api/purchase-orders/:id returns 200 + PO JSON
  4. ✅ GET /api/purchase-orders/:id returns 404 if not found
```

**Validation Checkpoint:**
```bash
cd backend
npm test
# Output must show:
#   purchase-order-service.test.js: 5 passed
#   purchase-order-routes.test.js: 4 passed
```

---

#### Task 3.2: Playwright E2E - PO Flow
**Depends on:** Phase 2 complete + backend running  
**Checkpoint:** E2E flow passes

```
File: e2e/po-flow.spec.js
Test scenario:
  1. Open app → Dashboard
  2. Navigate to PO List
  3. Click "Create PO"
  4. Select approved PR line (Bearing 6205 qty 12)
  5. Enter vendor name
  6. Submit → verify PO created with DRAFT status
  7. Navigate to PO Detail
  8. Click "Submit PO" button
  9. Verify status changed to SUBMITTED
  10. Verify pr_lines.qty_allocated updated in DB
```

**Validation Checkpoint:**
```bash
npm run test:e2e
# Output must show:
#   ✅ po-flow.spec.js: 1 passed
# Screenshot saved to test-results/ if assertion fails
```

---

### Phase 4: Code Review & Merge
**Duration:** 30 minutes  
**Deliverable:** PR merged to main

#### Task 4.1: Self-Review Checklist
**Depends on:** Phase 3 passing  

```
Review checklist:
  ✅ Code follows naming conventions (explicit, no clever patterns)
  ✅ Error messages are clear and actionable
  ✅ Service layer handles all business rules (not in routes)
  ✅ Frontend follows baseline CSS variables (colors, spacing)
  ✅ No emojis in code/commits
  ✅ Comments explain WHY, not WHAT
  ✅ All 4 PO endpoints present and tested
  ✅ Validation rejects over-allocation with clear error
  ✅ Routes thin, handlers delegate to service
  ✅ Frontend pages consistent with baseline UI
```

---

#### Task 4.2: Create Pull Request
**Depends on:** Task 4.1 complete  

```
PR Template:
  Title: "feat: implement PO module (list/create/detail/submit)"
  
  Description:
    ## Changes
    - Implement PO APIs: create, submit, get, open-lines
    - Implement PO validation: reject over-allocation
    - Implement PO UI: list, create, detail pages
    - Add Jest tests for PO service & routes
    - Add Playwright E2E test for PO flow
    
    ## Testing
    - Jest: backend/tests/ ✅ all pass
    - Playwright: e2e/po-flow.spec.js ✅ pass
    - Manual: PO flow works end-to-end
    
    ## Breaking Changes
    None
```

**Validation Checkpoint:**
```bash
git status
# All changes staged, ready to push
git log --oneline | head -5
# Verify commit messages are clear
```

---

## 🏁 Final Verification (All Phases Complete)

### Checkpoint 1: Database State
```bash
docker compose exec -T db psql -U workshop -d procurement_mvp -c "
  SELECT 
    (SELECT COUNT(*) FROM purchase_orders) as po_count,
    (SELECT COUNT(*) FROM po_lines) as po_line_count,
    (SELECT COUNT(*) FROM pr_line_allocations) as allocation_count;
"
# Expected: po_count >= 1, po_line_count >= 2, allocation_count >= 2
```

### Checkpoint 2: Backend Tests
```bash
cd backend
npm test -- purchase-order
# Expected: All PO tests pass
```

### Checkpoint 3: Frontend Tests
```bash
npm run test:e2e
# Expected: PO E2E flow passes
```

### Checkpoint 4: App Running
```bash
npm run dev
# Open http://localhost:5173
# Navigate: Dashboard → PO List → Create PO → Detail → Submit
# Expected: All pages load, all actions work, no errors in console
```

---

## ⏱️ Time Allocation Summary

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 1 | PO Service | 30 min | Pending |
| 1 | PO Routes | 30 min | Pending |
| 1 | DB Validation | 30 min | Pending |
| 2 | PO List Page | 30 min | Pending |
| 2 | PO Create Page | 30 min | Pending |
| 2 | PO Detail Page | 20 min | Pending |
| 2 | Router Update | 10 min | Pending |
| 3 | Jest Tests | 30 min | Pending |
| 3 | Playwright E2E | 30 min | Pending |
| 4 | Code Review + PR | 30 min | Pending |
| | **TOTAL** | **270 min (4.5 hrs)** | |

---

## 🚫 Out of Scope (Explicitly Excluded)

- ❌ GR module implementation
- ❌ Advanced approval workflows
- ❌ Notifications
- ❌ Reporting dashboards
- ❌ User authentication/authorization
- ❌ Bookmark feature (post-backlog, optional)
- ❌ Pagination (list pages)
- ❌ Undo/draft recovery

---

## 🔀 Parallel Work Opportunities

After Task 1.3:
- Tasks 2.1, 2.2, 2.3 can be worked in **parallel** (frontend) while Task 1 continues (backend fine-tuning)
- Task 3 must wait for both Phase 1 & 2 complete

---

## 📊 Success Criteria (MVP Done)

✅ All 4 PO endpoints implemented and tested  
✅ PO pages (list/create/detail) fully functional  
✅ Allocation validation enforces qty <= PR remaining  
✅ PO status transitions work (DRAFT → SUBMITTED)  
✅ Jest: ≥5 meaningful PO tests passing  
✅ Playwright: ≥1 PO E2E flow test passing  
✅ App runs locally without errors  
✅ PR merged to feature/po-module branch  

---

## 📖 How to Use This Runbook

1. **Start with Phase 1** — implement backend APIs first
2. **Validate each task** — use checkpoints before moving to next
3. **Parallel Phase 2** — can start frontend after Task 1.3
4. **Phase 3 last** — testing depends on both 1 & 2 complete
5. **Phase 4 final** — review and merge to feature branch

**Reference existing code:** Use PR module files as templates:
- Backend: `backend/src/services/requisition-service.js` + `backend/src/routes/requisition-routes.js`
- Frontend: `frontend/src/pages/RequisitionListPage.vue` + `RequisitionCreatePage.vue` + `RequisitionDetailPage.vue`
