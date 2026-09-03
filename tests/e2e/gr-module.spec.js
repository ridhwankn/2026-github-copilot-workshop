import { test, expect } from '@playwright/test';

test.describe('Goods Receipt module', () => {
  test('creates and posts a goods receipt', async ({ page }) => {
    await page.route('**/api/purchase-orders', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{ id: 'po-1', poNumber: 'PO-2026-0001', vendorName: 'PT Sumber Teknik', status: 'SUBMITTED' }] }) });
      } else {
        await route.continue();
      }
    });
    await page.route('**/api/purchase-orders/po-1/open-lines', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ openLines: [{ id: 'po-line-1', lineNo: 1, itemCode: 'BRG-6205', itemName: 'Bearing 6205', qtyOrdered: 12, qtyReceived: 0, qtyOpenForGr: 12, uom: 'PCS', siteCode: 'JKT-PLANT' }] }) });
    });
    await page.route('**/api/goods-receipts', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      const payload = route.request().postDataJSON();
      expect(payload.lines[0].qtyReceived).toBe(5);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'gr-new', grNumber: 'GR-2026-0002', poId: 'po-1', poNumber: 'PO-2026-0001', status: 'DRAFT', lines: [] }) });
    });
    await page.goto('/goods-receipts/new');
    await page.getByLabel('Purchase Order').selectOption('po-1');
    await page.locator('input[type="number"]').first().fill('5');
    await page.getByRole('button', { name: 'Save As Draft' }).click();
    await expect(page).toHaveURL(/\/goods-receipts\/gr-new$/);
  });

  test('shows a seeded draft receipt detail and posts it', async ({ page }) => {
    await page.route('**/api/goods-receipts/gr-1', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'gr-1', grNumber: 'GR-2026-0001', poId: 'po-1', poNumber: 'PO-2026-0001', status: 'DRAFT', receiptDate: '2026-09-03', lines: [{ id: 'gr-line-1', lineNo: 1, itemCode: 'BRG-6205', itemName: 'Bearing 6205', qtyOrdered: 12, qtyReceived: 5, qtyOpenForGr: 7, uom: 'PCS', actualSiteCode: 'JKT-PLANT' }] }) });
    });
    await page.route('**/api/goods-receipts/gr-1/post', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'gr-1', grNumber: 'GR-2026-0001', poId: 'po-1', poNumber: 'PO-2026-0001', status: 'POSTED', lines: [] }) });
    });
    await page.goto('/goods-receipts/gr-1');
    await expect(page.getByRole('heading', { name: 'GR-2026-0001' })).toBeVisible();
    await page.getByRole('button', { name: 'Post GR' }).click();
    await expect(page.getByText('POSTED', { exact: true })).toBeVisible();
  });
});
