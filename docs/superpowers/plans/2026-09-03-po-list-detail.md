# PO List and Detail Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the Vue Purchase Order list and detail pages with existing Figma-aligned patterns and PO API integration.

**Architecture:** Keep page-level data loading in `POListPage.vue` and `PODetailPage.vue`, use the existing `api.js` client and router paths, and reuse global tokens/components rather than introducing a new UI abstraction. The backend contract remains unchanged.

**Tech Stack:** Vue 3, Vue Router, Vite, Vitest, @vue/test-utils, existing CSS variables.

---

### Task 1: Verify existing PO page behavior with focused tests [logic]

**TDD Required:** YES
**Test file:** `frontend/tests/POListPage.test.js`, `frontend/tests/PODetailPage.test.js`

**Files:**
- Modify: `frontend/tests/POListPage.test.js`
- Modify: `frontend/tests/PODetailPage.test.js`

- [ ] **Step 1: Write or update failing tests**

Cover these observable behaviors:

```javascript
it('renders purchase orders returned by the API', async () => {
  api.listPurchaseOrders.mockResolvedValue({
    items: [{ id: 'po-1', poNumber: 'PO-001', vendorName: 'Acme', status: 'DRAFT', createdAt: '2026-09-03T00:00:00Z' }],
  });

  const wrapper = mount(POListPage, { global: { stubs: { RouterLink: RouterLinkStub } } });
  await flushPromises();

  expect(wrapper.text()).toContain('PO-001');
  expect(wrapper.text()).toContain('Acme');
});

it('shows submit action only for a draft purchase order', async () => {
  api.getPurchaseOrder.mockResolvedValue({ id: 'po-1', poNumber: 'PO-001', vendorName: 'Acme', status: 'DRAFT', lines: [] });

  const wrapper = mount(PODetailPage, { global: { stubs: { RouterLink: RouterLinkStub } } });
  await flushPromises();

  expect(wrapper.get('button').text()).toContain('Submit PO');
});
```

Use the existing test mock style and add equivalent submitted/error cases where they are missing.

- [ ] **Step 2: Run the focused tests to verify the behavior gap**

Run from `frontend`:

```powershell
npm test -- --run frontend/tests/POListPage.test.js frontend/tests/PODetailPage.test.js
```

Expected: existing behavior tests pass or fail only where the current page does not satisfy the Figma/API contract.

- [ ] **Step 3: Record the smallest required page changes**

Compare failures against the existing page code. Do not change API method names or route paths.

- [ ] **Step 4: Commit**

Do not commit automatically in this workspace; leave changes available for the user to review.

### Task 2: Align PO list page with existing Figma design system [logic]

**TDD Required:** YES
**Test file:** `frontend/tests/POListPage.test.js`

**Files:**
- Modify: `frontend/src/pages/POListPage.vue`
- Modify: `frontend/tests/POListPage.test.js`

- [ ] **Step 1: Add failing assertions for user-visible states**

The tests must assert the page renders:

```javascript
expect(wrapper.text()).toContain('Purchase Orders');
expect(wrapper.text()).toContain('New PO');
expect(wrapper.text()).toContain('Loading purchase orders...');
expect(wrapper.text()).toContain('No purchase orders yet.');
```

Also assert API errors are rendered from `error.message`.

- [ ] **Step 2: Run the focused list test**

```powershell
npm test -- --run tests/POListPage.test.js
```

Expected: FAIL only for missing or mismatched behavior.

- [ ] **Step 3: Implement the minimal list behavior**

Keep `api.listPurchaseOrders()`, `response.items || []`, and the existing route links. Use the global Figma tokens (`--primary`, `--white`, `--border`, `--radius-card`, `--radius-btn`) and avoid introducing separate conflicting color variables. Keep loading, empty, error, and table states mutually exclusive.

- [ ] **Step 4: Run the focused list test**

```powershell
npm test -- --run tests/POListPage.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

Do not commit automatically; retain the focused diff.

### Task 3: Align PO detail page with existing Figma design system [logic]

**TDD Required:** YES
**Test file:** `frontend/tests/PODetailPage.test.js`

**Files:**
- Modify: `frontend/src/pages/PODetailPage.vue`
- Modify: `frontend/tests/PODetailPage.test.js`

- [ ] **Step 1: Add failing assertions for detail behavior**

Assert header fields, order lines, allocation source requisitions, draft-only submission, success feedback, and API error feedback:

```javascript
expect(wrapper.text()).toContain('PO-001');
expect(wrapper.text()).toContain('Acme');
expect(wrapper.text()).toContain('Widget');
expect(wrapper.text()).toContain('PR-2026-0001');
await wrapper.get('button').trigger('click');
expect(api.submitPurchaseOrder).toHaveBeenCalledWith('po-1');
```

- [ ] **Step 2: Run the focused detail test**

```powershell
npm test -- --run tests/PODetailPage.test.js
```

Expected: FAIL only where the page does not satisfy the assertions.

- [ ] **Step 3: Implement the minimal detail behavior**

Keep `api.getPurchaseOrder(route.params.id)` and `api.submitPurchaseOrder(route.params.id)`. Render header, order lines, and allocation data from the API response. Show `Submit PO` only for `DRAFT`; disable it while submitting; preserve `statusCode === 422` as a validation message. Keep the existing navigation paths and global Figma styles.

- [ ] **Step 4: Run the focused detail test**

```powershell
npm test -- --run tests/PODetailPage.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

Do not commit automatically; retain the focused diff.

### Task 4: Validate router, build, and complete frontend tests [wiring]

**TDD Required:** NO — final integration validation of existing wiring.

**Files:**
- Verify: `frontend/src/router/index.js`
- Verify: `frontend/src/api.js`
- Verify: `frontend/src/pages/POListPage.vue`
- Verify: `frontend/src/pages/PODetailPage.vue`

- [ ] **Step 1: Run the complete frontend test suite**

```powershell
cd frontend
npm test
```

Expected: PO list/detail tests pass; any unrelated pre-existing failures are reported separately.

- [ ] **Step 2: Build the frontend**

```powershell
npm run build
```

Expected: Vite production build completes successfully.

- [ ] **Step 3: Check the running application**

With PostgreSQL, backend, and frontend running, open:

- `http://localhost:5173/purchase-orders`
- `http://localhost:5173/purchase-orders/<existing-po-id>`

Confirm list loads, detail opens, and draft submission calls the existing API.

- [ ] **Step 4: Report final status**

Summarize changed files, test results, build result, and any residual pre-existing test failures.
