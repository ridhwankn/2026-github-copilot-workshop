import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import GRCreatePage from '../src/pages/GRCreatePage.vue';

vi.mock('../src/api', () => ({
  api: {
    listPurchaseOrders: vi.fn(() => Promise.resolve({ items: [{ id: 'po-1', poNumber: 'PO-2026-0001', status: 'SUBMITTED' }] })),
    getOpenPurchaseOrderLines: vi.fn(() => Promise.resolve({
      purchaseOrder: { id: 'po-1', poNumber: 'PO-2026-0001', status: 'SUBMITTED' },
      openLines: [{ id: 'po-line-1', lineNo: 1, itemCode: 'BRG-6205', itemName: 'Bearing 6205', qtyOrdered: 12, qtyReceived: 0, qtyOpenForGr: 12, uom: 'PCS', siteCode: 'JKT-PLANT' }],
    })),
    createGoodsReceipt: vi.fn(() => Promise.resolve({ id: 'gr-new' })),
  },
}));

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/goods-receipts', component: { template: '<div></div>' } },
      { path: '/goods-receipts/new', component: GRCreatePage },
      { path: '/goods-receipts/:id', component: { template: '<div></div>' } },
    ],
  });
}

describe('GRCreatePage.vue', () => {
  let wrapper;
  let router;

  beforeEach(async () => {
    router = createTestRouter();
    await router.push('/goods-receipts/new');
    await router.isReady();
    wrapper = mount(GRCreatePage, { global: { plugins: [router] } });
    await Promise.resolve();
    await wrapper.vm.$nextTick();
  });

  test('loads submitted purchase orders and open lines', async () => {
    expect(wrapper.find('h2').text()).toContain('Create Goods Receipt');
    expect(wrapper.vm.purchaseOrders).toHaveLength(1);
    await wrapper.vm.selectPurchaseOrder('po-1');
    expect(wrapper.vm.lines[0].itemCode).toBe('BRG-6205');
  });

  test('sends received quantity and actual site to the API', async () => {
    const { api } = await import('../src/api');
    wrapper.vm.form.poId = 'po-1';
    await wrapper.vm.selectPurchaseOrder('po-1');
    wrapper.vm.lines[0].qtyReceivedInput = 5;
    wrapper.vm.lines[0].actualSiteCode = 'JKT-RECEIVING';
    await wrapper.vm.handleSubmit();

    expect(api.createGoodsReceipt).toHaveBeenCalledWith(expect.objectContaining({
      poId: 'po-1',
      lines: [{ poLineId: 'po-line-1', qtyReceived: 5, actualSiteCode: 'JKT-RECEIVING' }],
    }));
  });
});
