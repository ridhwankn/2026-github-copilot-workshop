import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import PODetailPage from '../src/pages/PODetailPage.vue';

// Mock the API
vi.mock('../src/api', () => ({
  api: {
    getPurchaseOrder: vi.fn(() => Promise.resolve({
      id: 'po-1',
      poNumber: 'PO-2026-0001',
      status: 'DRAFT',
      vendorName: 'PT Sumber Teknik',
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:00:00.000Z',
      lines: [
        {
          id: 'line-1',
          lineNo: 1,
          itemCode: 'BRG-001',
          itemName: 'Safety Helmet',
          qtyOrdered: 10,
          qtyReceived: 0,
          qtyOpenForGr: 10,
          unitPrice: 150000,
          uom: 'PCS',
          siteCode: 'WH-JKT',
          requiredDate: '2026-06-30',
          allocations: [
            {
              prNumber: 'PR-2026-0001',
              allocatedQty: 10,
            },
          ],
        },
      ],
    })),
    submitPurchaseOrder: vi.fn(() => Promise.resolve({
      id: 'po-1',
      poNumber: 'PO-2026-0001',
      status: 'SUBMITTED',
      vendorName: 'PT Sumber Teknik',
      lines: [],
    })),
  },
}));

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div></div>' } },
      { path: '/purchase-orders', component: { template: '<div></div>' } },
      { path: '/purchase-orders/:id', component: PODetailPage },
    ],
  });
}

describe('PODetailPage.vue', () => {
  let wrapper;
  let router;

  beforeEach(async () => {
    router = createTestRouter();
    await router.push('/purchase-orders/po-1');
    await router.isReady();

    wrapper = mount(PODetailPage, {
      global: {
        plugins: [router],
      },
    });

    await wrapper.vm.$nextTick();
    // Wait for async data load
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe('rendering', () => {
    test('renders page header with PO number', () => {
      expect(wrapper.find('h2').text()).toContain('PO-2026-0001');
      expect(wrapper.find('.muted').text()).toContain('Purchase Order Details');
    });

    test('renders back button linking to PO list', () => {
      const backLink = wrapper.find('.back-btn');
      expect(backLink.exists()).toBe(true);
      expect(backLink.attributes('href')).toBe('/purchase-orders');
    });

    test('renders PO information section with header details', async () => {
      await wrapper.vm.$nextTick();
      const infoItems = wrapper.findAll('.info-item');
      expect(infoItems.length).toBeGreaterThanOrEqual(4);
      
      const labels = infoItems.map((item) => item.find('label').text());
      expect(labels).toContain('PO Number');
      expect(labels).toContain('Vendor Name');
      expect(labels).toContain('Status');
    });

    test('renders status badge with correct class', async () => {
      await wrapper.vm.$nextTick();
      const badge = wrapper.find('.status-draft');
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toBe('DRAFT');
    });

    test('renders order lines table with columns', async () => {
      await wrapper.vm.$nextTick();
      const tables = wrapper.findAll('table');
      expect(tables.length).toBeGreaterThanOrEqual(1);

      const headers = wrapper.findAll('th');
      const headerTexts = headers.map((h) => h.text());
      expect(headerTexts).toContain('Item Code');
      expect(headerTexts).toContain('Item Name');
      expect(headerTexts).toContain('Qty Order');
      expect(headerTexts).toContain('Unit Price');
    });

    test('renders order line data in table', async () => {
      await wrapper.vm.$nextTick();
      const rows = wrapper.findAll('table tbody tr');
      expect(rows.length).toBeGreaterThanOrEqual(1);

      const row = rows[0];
      expect(row.text()).toContain('BRG-001');
      expect(row.text()).toContain('Safety Helmet');
    });

    test('renders allocation tracking section', async () => {
      await wrapper.vm.$nextTick();
      const titles = wrapper.findAll('.form-section-title');
      expect(titles.some((t) => t.text().includes('Allocations'))).toBe(true);
    });
  });

  describe('submit button visibility', () => {
    test('shows Submit button when PO status is DRAFT', async () => {
      wrapper.vm.po = {
        ...wrapper.vm.po,
        status: 'DRAFT',
      };
      await wrapper.vm.$nextTick();

      const submitBtn = wrapper.findAll('.btn-primary').find((b) => b.text().includes('Submit'));
      expect(submitBtn).toBeDefined();
    });

    test('hides Submit button when PO status is SUBMITTED', async () => {
      wrapper.vm.po = {
        ...wrapper.vm.po,
        status: 'SUBMITTED',
      };
      await wrapper.vm.$nextTick();

      const submitBtn = wrapper.findAll('.btn-primary').find((b) => b.text().includes('Submit'));
      expect(submitBtn).toBeUndefined();
    });

    test('does not show Submit button when PO is undefined', async () => {
      wrapper.vm.po = null;
      await wrapper.vm.$nextTick();

      const submitBtn = wrapper.findAll('.btn-primary').find((b) => b.text()?.includes('Submit'));
      expect(submitBtn).toBeUndefined();
    });
  });

  describe('formatting functions', () => {
    test('formats dates correctly', async () => {
      const date = '2026-05-01T10:00:00.000Z';
      const formatted = wrapper.vm.formatDate(date);
      expect(formatted).toContain('2026');
      expect(formatted).toContain('May');
    });

    test('formats numbers to 2 decimal places', () => {
      expect(wrapper.vm.formatNumber(100.5)).toBe('100.50');
      expect(wrapper.vm.formatNumber(1000)).toBe('1000.00');
    });

    test('formats currency with USD symbol', () => {
      const formatted = wrapper.vm.formatCurrency(150000);
      expect(formatted).toContain('$');
      expect(formatted).toContain('150');
    });
  });

  describe('error handling', () => {
    test('displays error message when PO fails to load', async () => {
      wrapper.vm.errorMessage = 'Failed to load PO';
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.error').exists()).toBe(true);
      expect(wrapper.find('.error').text()).toContain('Failed to load PO');
    });

    test('displays loading state while fetching', async () => {
      wrapper.vm.loading = true;
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.loading').exists()).toBe(true);
      expect(wrapper.find('.loading').text()).toContain('Loading purchase order details');
    });

    test('shows error when PO data is null after load', async () => {
      wrapper.vm.loading = false;
      wrapper.vm.po = null;
      wrapper.vm.errorMessage = 'Could not load';
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.error').text()).toContain('Could not load');
    });
  });

  describe('submit functionality', () => {
    test('calls submitPurchaseOrder API when Submit button clicked', async () => {
      const { api } = await import('../src/api.js');
      
      await wrapper.vm.handleSubmit();
      
      expect(api.submitPurchaseOrder).toHaveBeenCalledWith('po-1');
    });

    test('updates PO status to SUBMITTED after successful submit', async () => {
      wrapper.vm.po = {
        id: 'po-1',
        status: 'DRAFT',
        poNumber: 'PO-2026-0001',
        lines: [],
      };

      await wrapper.vm.handleSubmit();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(wrapper.vm.po.status).toBe('SUBMITTED');
    });

    test('displays success message after submit', async () => {
      await wrapper.vm.handleSubmit();
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.successMessage).toContain('submitted successfully');
    });

    test('clears error message on successful submit', async () => {
      wrapper.vm.errorMessage = 'Previous error';
      
      await wrapper.vm.handleSubmit();
      
      expect(wrapper.vm.errorMessage).toBe('');
    });

    test('redirects to purchase orders list after delay', async () => {
      const pushSpy = vi.spyOn(router, 'push');
      
      await wrapper.vm.handleSubmit();
      await new Promise((resolve) => setTimeout(resolve, 1600));

      expect(pushSpy).toHaveBeenCalledWith('/purchase-orders');
    });
  });
});
