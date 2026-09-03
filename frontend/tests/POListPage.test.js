import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import POListPage from '../src/pages/POListPage.vue';

const { api } = vi.hoisted(() => ({
  api: {
    listPurchaseOrders: vi.fn(),
  },
}));

vi.mock('../src/api', () => ({ api }));

const RouterLinkStub = {
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : to.path"><slot /></a>',
};

function mountPage() {
  return mount(POListPage, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

describe('POListPage.vue', () => {
  beforeEach(() => {
    api.listPurchaseOrders.mockReset();
  });

  test('renders purchase orders returned by the API', async () => {
    api.listPurchaseOrders.mockResolvedValue({
      items: [
        {
          id: 'po-1',
          poNumber: 'PO-2026-0001',
          vendorName: 'PT Sumber Teknik',
          status: 'DRAFT',
          createdAt: '2026-05-01T10:00:00.000Z',
        },
      ],
    });

    const wrapper = mountPage();
    await flushPromises();

    expect(api.listPurchaseOrders).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain('PO-2026-0001');
    expect(wrapper.text()).toContain('PT Sumber Teknik');
    expect(wrapper.text()).toContain('DRAFT');
  });

  test('renders create and detail links', async () => {
    api.listPurchaseOrders.mockResolvedValue({
      items: [{ id: 'po-1', poNumber: 'PO-2026-0001', vendorName: 'Acme', status: 'SUBMITTED' }],
    });

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('a[href="/purchase-orders/new"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/purchase-orders/po-1"]').exists()).toBe(true);
  });

  test('renders an empty state when no purchase orders exist', async () => {
    api.listPurchaseOrders.mockResolvedValue({ items: [] });

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('No purchase orders yet.');
    expect(wrapper.find('table').exists()).toBe(false);
  });

  test('renders the API error message', async () => {
    api.listPurchaseOrders.mockRejectedValue(new Error('Unable to load purchase orders'));

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.error').text()).toContain('Unable to load purchase orders');
  });
});
