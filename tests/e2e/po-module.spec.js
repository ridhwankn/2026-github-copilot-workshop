import { test, expect } from '@playwright/test';

const availableLine = {
  id: 'pr-line-1',
  prNumber: 'PR-2026-0001',
  itemCode: 'BRG-6205',
  itemName: 'Bearing 6205',
  qtyRequested: 20,
  qtyAllocated: 12,
  qtyRemaining: 8,
  uom: 'PCS',
  estUnitPrice: 85000,
  siteCode: 'JKT-PLANT',
  requiredDate: '2026-09-09',
};

function mockAvailableLines(page) {
  return page.route('**/api/requisitions/available/for-allocation', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [availableLine] }),
    });
  });
}

test.describe('Purchase Order module', () => {
  test('creates a purchase order from an approved PR line', async ({ page }) => {
    await mockAvailableLines(page);

    await page.route('**/api/purchase-orders', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      const payload = route.request().postDataJSON();
      expect(payload.vendorName).toBe('PT Sumber Teknik');
      expect(payload.lines[0].prLineId).toBe('pr-line-1');
      expect(payload.lines[0].qtyOrdered).toBe(5);

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'po-1', poNumber: 'PO-2026-0001' }),
      });
    });

    await page.route('**/api/purchase-orders/po-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'po-1',
          poNumber: 'PO-2026-0001',
          vendorName: 'PT Sumber Teknik',
          status: 'DRAFT',
          createdAt: '2026-09-03T00:00:00Z',
          lines: [],
        }),
      });
    });

    await page.goto('/purchase-orders/new');
    await page.getByTestId('vendor-name').fill('PT Sumber Teknik');
    await page.getByTestId('add-pr-line-pr-line-1').click();
    await page.getByTestId('allocation-qty-0').fill('5');
    await page.getByTestId('save-po').click();

    await expect(page).toHaveURL(/\/purchase-orders\/po-1$/);
    await expect(page.getByRole('heading', { name: 'PO-2026-0001' })).toBeVisible();
  });

  test('shows a clear error when allocation exceeds PR remaining quantity', async ({ page }) => {
    await mockAvailableLines(page);

    await page.route('**/api/purchase-orders', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'lines[0]: allocation qty 9 exceeds remaining 8',
        }),
      });
    });

    await page.goto('/purchase-orders/new');
    await page.getByTestId('vendor-name').fill('PT Sumber Teknik');
    await page.getByTestId('add-pr-line-pr-line-1').click();
    await page.getByTestId('allocation-qty-0').fill('9');
    await page.getByTestId('save-po').click();

    await expect(page.getByTestId('po-error')).toContainText(
      'Validation Error: lines[0]: allocation qty 9 exceeds remaining 8'
    );
    await expect(page).toHaveURL(/\/purchase-orders\/new$/);
  });
});
