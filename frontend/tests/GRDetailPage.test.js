import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import GRDetailPage from '../src/pages/GRDetailPage.vue';

vi.mock('../src/api', () => ({
  api: {
    getGoodsReceipt: vi.fn(() => Promise.resolve({
      id: 'gr-1', grNumber: 'GR-2026-0001', poId: 'po-1', poNumber: 'PO-2026-0001', status: 'DRAFT', receiptDate: '2026-09-03',
      lines: [{ lineNo: 1, itemCode: 'BRG-6205', itemName: 'Bearing 6205', qtyOrdered: 12, qtyReceived: 5, qtyOpenForGr: 7, uom: 'PCS', actualSiteCode: 'JKT-PLANT' }],
    })),
    postGoodsReceipt: vi.fn(() => Promise.resolve({
      id: 'gr-1', grNumber: 'GR-2026-0001', poId: 'po-1', poNumber: 'PO-2026-0001', status: 'POSTED', lines: [],
    })),
  },
}));

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/goods-receipts/:id', component: GRDetailPage }],
  });
}

describe('GRDetailPage.vue', () => {
  test('posts a draft goods receipt', async () => {
    const router = createTestRouter();
    await router.push('/goods-receipts/gr-1');
    await router.isReady();
    const wrapper = mount(GRDetailPage, { global: { plugins: [router] } });
    await Promise.resolve();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('h2').text()).toContain('GR-2026-0001');
    await wrapper.vm.handlePost();

    const { api } = await import('../src/api');
    expect(api.postGoodsReceipt).toHaveBeenCalledWith('gr-1');
    expect(wrapper.vm.receipt.status).toBe('POSTED');
  });
});
