# PO Create Page Components

This directory contains reusable Vue 3 components for the Purchase Order (PO) creation workflow.

## Components Overview

### 1. POCreatePage.vue
**Location:** `frontend/src/pages/POCreatePage.vue`

Main page component for creating a new Purchase Order. This page:
- Displays a header form for vendor information
- Shows an allocation table for selecting PR lines
- Validates form submission
- Prepares payload for API submission

**Props:** None (standalone page)

**Data Model:**
```javascript
{
  vendorName: String,           // Vendor name (required)
  lines: Array<{
    prLineId: UUID,             // Purchase Requisition Line ID
    prNumber: String,           // PR number for reference
    itemCode: String,
    itemName: String,
    qtyRemaining: Number,       // Remaining qty available for allocation
    allocatedQty: Number,       // Qty being allocated to this PO (required)
    unitPrice: Number,          // Unit price for this PO line
    uom: String,               // Unit of measurement
    siteCode: String,
  }>
}
```

**Integration Point:**
Replace the commented API call on line 90 with actual API integration:
```javascript
const created = await api.createPurchaseOrder(payload);
await router.push(`/purchase-orders/${created.id}`);
```

---

### 2. POHeaderForm.vue
**Location:** `frontend/src/components/POHeaderForm.vue`

Reusable component for PO header information (vendor name).

**Props:**
- `vendorName` (String, required): The vendor name value

**Emits:**
- `update:vendorName`: Emitted when vendor name changes (v-model compatible)
- `update:error`: Emitted if validation errors occur (optional)

**Usage Example:**
```vue
<POHeaderForm 
  v-model:vendor-name="form.vendorName"
  @update:error="(msg) => errorMessage = msg"
/>
```

---

### 3. POLineAllocationTable.vue
**Location:** `frontend/src/components/POLineAllocationTable.vue`

Complex reusable component for managing line item allocations from PR to PO.

**Props:**
- `lines` (Array, required): Current allocated lines
- `availableRequisitions` (Array, required): List of available PR lines to allocate
- `loading` (Boolean, default: false): Loading state indicator

**Emits:**
- `update:lines`: Emitted when lines array changes (v-model compatible)
- `update:error`: Emitted for validation messages

**Structure:**
The component has two main sections:
1. **Available Requisition Lines Table** - Shows all PR lines that can be allocated
   - Checkbox to select/deselect lines
   - Displays: PR Number, Item Code, Item Name, Qty Requested, Remaining Qty, UOM, Est. Price, Site
   - Action button to add/remove from allocation

2. **Allocated Lines Table** - Shows selected lines with allocation details
   - Editable fields: Allocated Qty, Unit Price
   - Displays remaining qty after allocation
   - Action button to remove from allocation

**Expected Data Format for availableRequisitions:**
```javascript
[
  {
    id: UUID,                   // PR Line ID
    prNumber: String,
    itemCode: String,
    itemName: String,
    qtyRequested: Number,
    qtyRemaining: Number,       // qty_requested - qty_allocated
    qtyAllocated: Number,
    uom: String,
    estUnitPrice: Number,
    siteCode: String,
    requiredDate: Date,
    budgetCenter: String,
  }
]
```

**Usage Example:**
```vue
<POLineAllocationTable 
  v-model:lines="form.lines"
  :available-requisitions="availableRequisitions"
  :loading="loadingRequisitions"
  @update:error="(msg) => errorMessage = msg"
/>
```

**Key Features:**
- Validation: Allocated qty cannot exceed remaining qty
- Automatic validation on blur
- Maintains form state reactivity
- Clear visual feedback for selections

---

## Integration Checklist

### Phase 1: Connect to Backend APIs
- [ ] Implement `getRequisitionOpenLines()` in `backend/src/services/requisition-service.js`
- [ ] Implement `listPurchaseOrders()` in `backend/src/services/purchase-order-service.js`
- [ ] Implement `createPurchaseOrder()` in `backend/src/services/purchase-order-service.js`
- [ ] Add API methods to `frontend/src/api.js`:
  ```javascript
  listOpenRequisitionLines: () => apiFetch('/api/requisitions/open-lines'),
  createPurchaseOrder: (payload) => apiFetch('/api/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  ```

### Phase 2: Load PR Lines on Page Mount
- [ ] Uncomment the `loadAvailableRequisitions()` function call
- [ ] Replace the mock API call with actual endpoint

### Phase 3: Complete API Integration
- [ ] Uncomment the `handleSubmit()` API call
- [ ] Add route guard for validation
- [ ] Add success notification

---

## Styling Notes

All components use CSS variables from the baseline:
- `--primary-color`: Primary action color
- `--primary-hover`: Primary color on hover
- `--border-color`: Border and divider color
- `--bg-color`: Main background
- `--bg-secondary`: Secondary background (tables)
- `--bg-hover`: Hover background
- `--text-color`: Main text color
- `--text-muted`: Muted/secondary text

Components are responsive and follow the existing design system.

---

## Testing Hints

### Manual Testing Flow:
1. Navigate to `/purchase-orders/new`
2. Enter vendor name (e.g., "Acme Corp")
3. Mock open PR lines will appear in Available table (once API connected)
4. Click "+ Add" to select PR lines
5. Enter allocation qty and unit price for each line
6. Click "Save As Draft" to submit

### Unit Test Structure:
```javascript
// Test file: tests/components/POCreatePage.test.js
describe('POCreatePage', () => {
  test('validates vendor name is required', () => { /* ... */ });
  test('validates at least one line is allocated', () => { /* ... */ });
  test('prepares correct payload structure', () => { /* ... */ });
});

// Test file: tests/components/POLineAllocationTable.test.js
describe('POLineAllocationTable', () => {
  test('prevents allocation exceeding remaining qty', () => { /* ... */ });
  test('emits update:lines on line selection', () => { /* ... */ });
});
```

---

## Known Limitations (By Design for MVP)

- [ ] No validation against supplier performance metrics
- [ ] No blind receiving support (GR requires matching PO qty exactly)
- [ ] No split shipments on single PO line
- [ ] No price override validation against purchase agreements
- [ ] No budget check at allocation time (handled in approval)

These are intentionally left for Phase 4+ expansion as they add complexity unsuitable for workshop context.
