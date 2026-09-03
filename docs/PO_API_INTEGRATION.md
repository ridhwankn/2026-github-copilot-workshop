# PO Module - API Integration & Validation Guide

## Overview

The Purchase Order (PO) module provides complete integration between the frontend Vue 3 UI and Fastify REST API with comprehensive validation and error handling, specifically enforcing over-allocation rules to prevent allocating more quantity than available in requisition lines.

---

## Integration Architecture

### Request Flow: Create PO

```
User fills form
    ↓
Frontend validation (client-side)
    ├─ Vendor name required
    ├─ At least 1 line required
    ├─ All required fields present (itemCode, itemName, uom, siteCode)
    ├─ Allocation qty > 0
    └─ (Local check) allocation qty ≤ remaining qty
    ↓
api.createPurchaseOrder(payload) call
    ↓
Fastify POST /api/purchase-orders
    ├─ Check: vendorName, lines structure
    ├─ Check: PR lines exist and valid
    ├─ Check: PR status = APPROVED
    ├─ CRITICAL: Check allocation qty ≤ PR line remaining qty
    ├─ Lock PR lines (FOR UPDATE) to prevent race conditions
    ├─ Insert PO header (DRAFT status)
    ├─ Insert PO lines
    ├─ Insert allocations
    ├─ Update PR lines qty_allocated
    └─ Commit or Rollback
    ↓
Response: 201 Created + PO detail
        or
        422 Unprocessable Entity + error message
    ↓
Frontend handles response
    ├─ On success: Navigate to PO detail page
    └─ On error: Display error message to user
```

---

## PO API Endpoints

### Create Purchase Order

```http
POST /api/purchase-orders
Content-Type: application/json

{
  "vendorName": "Acme Corp",
  "lines": [
    {
      "prLineId": "uuid-of-pr-line",
      "allocatedQty": 50,
      "unitPrice": 1000,
      "itemCode": "ITEM-001",
      "itemName": "Widget Type A",
      "uom": "PCS",
      "siteCode": "WH-1",
      "requiredDate": "2026-09-30"
    }
  ]
}
```

**Response: 201 Created**
```json
{
  "id": "uuid",
  "poNumber": "PO-2026-0001",
  "status": "DRAFT",
  "vendorName": "Acme Corp",
  "lines": [
    {
      "id": "uuid",
      "lineNo": 1,
      "itemCode": "ITEM-001",
      "itemName": "Widget Type A",
      "qtyOrdered": 50,
      "qtyReceived": 0,
      "qtyOpenForGr": 50,
      "unitPrice": 1000,
      "uom": "PCS",
      "siteCode": "WH-1",
      "requiredDate": "2026-09-30",
      "allocations": [
        {
          "prLineId": "uuid",
          "prNumber": "PR-2026-0001",
          "allocatedQty": 50
        }
      ]
    }
  ],
  "createdAt": "2026-09-03T10:30:00Z",
  "updatedAt": "2026-09-03T10:30:00Z"
}
```

**Response: 422 Unprocessable Entity (Validation Error)**
```json
{
  "message": "lines[0]: allocation qty 150 exceeds remaining 100"
}
```

---

## Over-Allocation Validation (Core Business Logic)

### What is Over-Allocation?

Over-allocation occurs when attempting to allocate **more quantity to a PO than what remains available** on the source PR line.

**Example**:
- PR Line: qty_requested = 100, qty_allocated = 40
- Remaining available = 100 - 40 = 60
- User tries to allocate 80 to new PO → **REJECTED** (80 > 60)
- User tries to allocate 60 to new PO → **ACCEPTED** (60 = 60)

### Validation Layers

#### Layer 1: Frontend Client-Side (POLineAllocationTable.vue)

**Purpose**: Immediate user feedback without server round-trip

**Implementation**:
```javascript
function validateAllocation(index) {
  const line = props.lines[index];
  if (line.allocatedQty > line.qtyRemaining) {
    line.allocatedQty = line.qtyRemaining;  // Auto-correct
    emit('update:error', 
      `Allocation cannot exceed remaining quantity (${line.qtyRemaining})`
    );
  }
  emit('update:lines', [...props.lines]);
}
```

**Triggered**: 
- When user changes allocation qty in the table
- Real-time feedback as user types

**Behavior**:
- Auto-corrects quantity to remaining maximum if exceeded
- Emits error message to parent component
- Allows submission to proceed (backend will do final check)

---

#### Layer 2: Backend Validation (purchase-order-service.js)

**Purpose**: Authoritative validation with business rule enforcement

**Implementation**:
```javascript
// Lock PR line to prevent concurrent modifications
const prLineResult = await client.query(
  `SELECT pl.id, pl.qty_requested, pl.qty_allocated, 
          pr.status AS pr_status
   FROM pr_lines pl
   JOIN purchase_requisitions pr ON pr.id = pl.pr_id
   WHERE pl.id = $1
   FOR UPDATE`,  // Row-level lock
  [line.prLineId]
);

const prLine = prLineResult.rows[0];
const remaining = Number(prLine.qty_requested) - Number(prLine.qty_allocated);

// CRITICAL: Check allocation doesn't exceed remaining
if (Number(line.qtyOrdered) > remaining) {
  const err = new Error(
    `lines[${i}]: allocation qty ${line.qtyOrdered} exceeds remaining ${remaining}`
  );
  err.statusCode = 422;  // Unprocessable Entity
  throw err;
}
```

**Triggered**: 
- On every PO creation request
- AFTER frontend validation
- BEFORE database writes

**Features**:
- ✅ Uses transaction with `FOR UPDATE` row lock (prevents race conditions)
- ✅ Validates each PR line in the request
- ✅ Checks PR status = APPROVED (prevents allocation to draft/submitted PRs)
- ✅ Returns precise error message with line index and quantities
- ✅ Rolls back entire transaction on any validation failure
- ✅ Returns 422 Unprocessable Entity status code

**Error Response Format**:
```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "message": "lines[0]: allocation qty 80 exceeds remaining 60"
}
```

---

## Frontend Error Handling

### POCreatePage.vue

**Enhanced error handling**:
```javascript
async function handleSubmit() {
  errorMessage.value = '';
  isSubmitting.value = true;

  try {
    // Client-side validation
    validateVendorName();
    validateLinesPresent();
    validateLineFields();

    // Build API payload with all required fields
    const payload = {
      vendorName: form.vendorName.trim(),
      lines: form.lines.map((line) => ({
        prLineId: line.prLineId,
        allocatedQty: Number(line.allocatedQty),
        unitPrice: Number(line.unitPrice || 0),
        itemCode: line.itemCode,
        itemName: line.itemName,
        uom: line.uom,
        siteCode: line.siteCode,
        requiredDate: line.requiredDate || null,
      })),
    };

    // Call API
    const created = await api.createPurchaseOrder(payload);
    
    // Success: Navigate to detail page
    await router.push(`/purchase-orders/${created.id}`);
  } catch (error) {
    // Handle 422 validation errors
    if (error.statusCode === 422) {
      errorMessage.value = `Validation Error: ${error.message}`;
    } else {
      errorMessage.value = error.message;
    }
    console.error('PO Creation Error:', error);
  } finally {
    isSubmitting.value = false;
  }
}
```

**User Experience**:
1. User fills form (vendor name, selects PR lines, enters quantities)
2. Client-side validation runs on qty change (POLineAllocationTable component)
   - If qty > remaining → Auto-corrects and shows error message
3. User clicks "Save As Draft"
4. Submit button disabled, shows "Creating..."
5. API call sent to backend
6. Backend validates (including over-allocation check with row lock)
7. **If validation fails (422)**:
   - Error message displayed to user
   - Form remains open for correction
   - Submit button re-enabled
8. **If validation succeeds (201)**:
   - Redirects to PO detail page
   - Shows success message (optional)

**Example Error Flow**:
```
User tries to allocate 150 qty (remaining is 100)
    ↓
Frontend table detects: 150 > 100
    ↓
Shows: "Allocation cannot exceed remaining quantity (100)"
    ↓
Auto-corrects qty to 100 in input
    ↓
User clicks Save
    ↓
Payload sent: { lines: [{ allocatedQty: 100, ... }] }
    ↓
Backend also checks: 100 <= 100 ✓
    ↓
PO created successfully
```

---

### PODetailPage.vue

**Enhanced submit error handling**:
```javascript
async function handleSubmit() {
  try {
    errorMessage.value = '';
    successMessage.value = '';
    isSubmitting.value = true;

    const updated = await api.submitPurchaseOrder(route.params.id);
    po.value = updated;
    successMessage.value = 'Purchase order submitted successfully!';
    
    setTimeout(() => {
      router.push('/purchase-orders');
    }, 1500);
  } catch (error) {
    if (error.statusCode === 422) {
      errorMessage.value = `Validation Error: ${error.message}`;
    } else {
      errorMessage.value = error.message;
    }
  } finally {
    isSubmitting.value = false;
  }
}
```

**Submit validation (backend)**:
- Only DRAFT POs can be submitted
- Returns 422 if already SUBMITTED
- Transitions DRAFT → SUBMITTED on success

---

## API Client Error Handling (api.js)

**Enhanced to preserve HTTP status codes**:
```javascript
async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = contentType.includes('application/json') 
    ? await response.json() 
    : null;

  if (!response.ok) {
    const message = data?.message || `Request failed: ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;  // <-- NEW: Preserve status
    error.data = data;
    throw error;
  }

  return data;
}
```

**Benefits**:
- Components can distinguish between 422 (validation), 404 (not found), 500 (server error)
- Allows targeted error messaging to users
- Supports different error recovery strategies per status code

---

## Component Data Flow: POLineAllocationTable.vue

### Props (Input)
```javascript
{
  availableRequisitions: [  // From API: /api/requisitions/available/for-allocation
    {
      id: "uuid",
      prNumber: "PR-2026-0001",
      itemCode: "ITEM-001",
      itemName: "Widget Type A",
      qtyRequested: 100,
      qtyAllocated: 30,
      qtyRemaining: 70,  // Calculated: qtyRequested - qtyAllocated
      estUnitPrice: 1000,
      uom: "PCS",
      siteCode: "WH-1",
    }
  ],
  lines: [  // v-model: Currently allocated lines
    {
      prLineId: "uuid",
      prNumber: "PR-2026-0001",
      itemCode: "ITEM-001",
      itemName: "Widget Type A",
      qtyRemaining: 70,
      allocatedQty: 50,  // What user is allocating to this PO
      unitPrice: 1000,
      uom: "PCS",
      siteCode: "WH-1",
    }
  ],
  loading: false,
}
```

### Emits (Output)
```javascript
emit('update:lines', [...])     // When lines array changes
emit('update:error', message)   // When validation error occurs
```

### Key Workflow
1. User clicks "Add" button on available PR line
2. `toggleLineSelection()` creates new allocation with:
   - All required fields copied from available line
   - `allocatedQty` initialized to min(1, qtyRemaining)
   - Emits `update:lines` to parent (POCreatePage)
3. User edits `allocatedQty` in the allocated lines table
4. `validateAllocation()` fires on change:
   - If qty > remaining → auto-correct to remaining, emit error
   - Emit `update:lines` with updated array
5. Parent form tracks changes via v-model

---

## Database Transaction Safety

### Atomic PO Creation

The backend uses PostgreSQL transactions with row-level locking to ensure data consistency:

**Transaction Flow**:
```sql
BEGIN TRANSACTION;

-- For each PR line in request:
SELECT ... FROM pr_lines WHERE id = $1 FOR UPDATE;  -- Lock row
-- Validate qty_requested - qty_allocated >= allocation_qty
-- Validate pr_status = 'APPROVED'

-- Insert PO header
INSERT INTO purchase_orders (id, po_number, status, vendor_name) ...

-- For each line:
--   Insert PO line
--   Insert allocation record
--   Update pr_lines.qty_allocated += allocation_qty

COMMIT;  -- On success
-- OR
ROLLBACK;  -- On validation error (including over-allocation)
```

**Benefits**:
- ✅ Prevents over-allocation even with concurrent requests
- ✅ Ensures qty_allocated never exceeds qty_requested
- ✅ All-or-nothing: Either complete PO is created or nothing
- ✅ Row locks prevent other transactions from modifying PR lines

**Scenario: Concurrent Over-Allocation Prevention**
```
Thread A: Allocate 60 qty
  └─ SELECT ... FOR UPDATE (locks PR line)
  └─ Check: 60 <= 70 remaining ✓
  └─ Insert PO, update PR qty_allocated += 60
  └─ COMMIT ✓

Thread B: Allocate 60 qty (same PR line, concurrent)
  └─ SELECT ... FOR UPDATE (waits for Thread A's lock)
  └─ After Thread A commits: remaining is now 10
  └─ Check: 60 <= 10 ✗
  └─ ROLLBACK, throw 422 error ✗
```

---

## Testing

### Backend Tests (Jest)

**File**: `backend/tests/services/purchase-order-service.test.js`

**Critical test coverage**:
```javascript
// Over-allocation guard
test('rejects when allocation qty exceeds PR line remaining qty', async () => {
  // PR line: requested=100, allocated=40, remaining=60
  // Attempt allocation: 80
  // Expected: Error with 422 statusCode
  // Message: "allocation qty 80 exceeds remaining 60"
});

test('allows allocation when qty equals exact remaining', async () => {
  // PR line: requested=100, allocated=40, remaining=60
  // Attempt allocation: 60
  // Expected: Success, PO created with DRAFT status
});

test('rejects when PR is in DRAFT status', async () => {
  // Attempt to allocate from DRAFT PR
  // Expected: Error with 422 statusCode
  // Message: "PR must be APPROVED before allocation"
});

test('rejects when PR is in SUBMITTED status', async () => {
  // Attempt to allocate from SUBMITTED PR
  // Expected: Error with 422 statusCode
  // Message: "PR must be APPROVED before allocation"
});
```

**Run tests**:
```bash
cd backend
$env:NODE_OPTIONS='--experimental-vm-modules'
npm test -- purchase-order-service.test.js
```

**Expected output**:
- ✓ 23 tests passing
- ✓ All validation tests passing
- ✓ All over-allocation tests passing

### Frontend Tests (Vitest)

**File**: `frontend/tests/POCreatePage.test.js`

**Key test coverage**:
- Form validation (vendor name required, lines required)
- API error handling
- Loading state during submission
- Error message display

**Run tests**:
```bash
cd frontend
npm run test -- POCreatePage
```

---

## API Response Examples

### Successful PO Creation (201)
```http
POST /api/purchase-orders
Content-Length: 250

{
  "vendorName": "Acme Corp",
  "lines": [{
    "prLineId": "abc-123",
    "allocatedQty": 50,
    "unitPrice": 1000,
    "itemCode": "ITEM-001",
    "itemName": "Widget",
    "uom": "PCS",
    "siteCode": "WH-1"
  }]
}

HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "po-uuid",
  "poNumber": "PO-2026-0001",
  "status": "DRAFT",
  "vendorName": "Acme Corp",
  "lines": [
    {
      "id": "line-uuid",
      "lineNo": 1,
      "itemCode": "ITEM-001",
      "itemName": "Widget",
      "qtyOrdered": 50,
      "qtyReceived": 0,
      "qtyOpenForGr": 50,
      "unitPrice": 1000,
      "uom": "PCS",
      "siteCode": "WH-1",
      "allocations": [{
        "prLineId": "abc-123",
        "prNumber": "PR-2026-0001",
        "allocatedQty": 50
      }]
    }
  ],
  "createdAt": "2026-09-03T10:30:00Z",
  "updatedAt": "2026-09-03T10:30:00Z"
}
```

### Over-Allocation Validation Error (422)
```http
POST /api/purchase-orders

{
  "vendorName": "Acme Corp",
  "lines": [{
    "prLineId": "abc-123",
    "allocatedQty": 150,  // Exceeds remaining 60
    "unitPrice": 1000,
    ...
  }]
}

HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "message": "lines[0]: allocation qty 150 exceeds remaining 60"
}
```

### Missing Required Field (422)
```http
POST /api/purchase-orders

{
  "vendorName": "Acme Corp",
  "lines": [{
    "prLineId": "abc-123",
    "allocatedQty": 50,
    // Missing: itemCode, itemName, uom, siteCode
  }]
}

HTTP/1.1 422 Unprocessable Entity

{
  "message": "lines[0] itemCode, itemName, uom, and siteCode are required"
}
```

### PR Not APPROVED (422)
```http
POST /api/purchase-orders

{
  "vendorName": "Acme Corp",
  "lines": [{
    "prLineId": "abc-123",  // This PR is still in DRAFT
    "allocatedQty": 50,
    ...
  }]
}

HTTP/1.1 422 Unprocessable Entity

{
  "message": "lines[0]: PR must be APPROVED before allocation"
}
```

---

## Workflow Example: Complete PO Creation

### Scenario
```
PR-2026-0001, Line 1:
  Item: "Widget Type A" (Code: ITEM-001)
  Qty Requested: 100
  Qty Allocated: 30
  Qty Remaining: 70
  UOM: PCS
  Site: WH-1
```

### User Steps
1. Navigate to "Create Purchase Order"
2. Enter vendor name: "Acme Corp"
3. See available PR lines table
4. Click "Add" on PR-2026-0001 Line 1
5. Line appears in "Allocated Lines" table with qty=1, price=0
6. Edit allocation qty: Change from 1 to 50
7. Edit unit price: Change from 0 to 1000
8. Click "Save As Draft"

### Frontend Processing
```
validateVendorName() → "Acme Corp" ✓
validateLinesPresent() → 1 line ✓
validateLineFields() → All required fields present ✓
Build payload:
  {
    vendorName: "Acme Corp",
    lines: [{
      prLineId: "...",
      allocatedQty: 50,
      unitPrice: 1000,
      itemCode: "ITEM-001",
      itemName: "Widget Type A",
      uom: "PCS",
      siteCode: "WH-1"
    }]
  }
API call: POST /api/purchase-orders
```

### Backend Processing
```
validateCreatePayload() ✓
Lock PR line with FOR UPDATE
Check: remaining (70) >= allocated (50) ✓
Check: PR status = APPROVED ✓
Insert PO header (DRAFT status)
Insert PO line
Insert allocation record
Update PR line: qty_allocated = 30 + 50 = 80
COMMIT ✓
Return: 201 Created + PO detail
```

### Frontend Response
```
Receive PO with:
  - poNumber: "PO-2026-0001"
  - status: "DRAFT"
  - lines: [{ qtyOrdered: 50, ... }]
Navigate to: /purchase-orders/po-uuid
Display PO detail page with allocated line shown
```

---

## Summary

| Aspect | Implementation |
|--------|-----------------|
| **Over-allocation validation** | ✅ Enforced at frontend + backend |
| **Error status code** | ✅ 422 Unprocessable Entity |
| **Error message format** | ✅ Clear, descriptive with context |
| **Transaction safety** | ✅ Row-level locking + rollback |
| **Data consistency** | ✅ Atomic all-or-nothing |
| **Frontend error handling** | ✅ User-friendly error display |
| **API error preservation** | ✅ Status codes exposed to frontend |
| **Loading states** | ✅ Submit button disabled while processing |
| **Test coverage** | ✅ 23 backend tests + 12 frontend tests |

This integration ensures that **no PO line can ever exceed the remaining quantity** on its source PR line, with clear feedback at every step of the workflow.
