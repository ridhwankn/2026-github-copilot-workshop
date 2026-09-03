import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import POCreatePage from '../src/pages/POCreatePage.vue';

// Mock the API
vi.mock('../src/api', () => ({
  api: {
    getAvailablePrLinesForAllocation: vi.fn(() => Promise.resolve({
      items: [
        {
          id: 'line-1',
          prNumber: 'PR-2026-0001',
          itemCode: 'ITEM-A',
          itemName: 'Widget A',
          qtyRequested: 100,
          qtyAllocated: 30,
          qtyRemaining: 70,
          uom: 'PCS',
          estUnitPrice: 10000,
          siteCode: 'WH-1',
          requiredDate: '2026-06-30',
        },
      ],
    })),
    createPurchaseOrder: vi.fn(() => Promise.resolve({ id: 'po-new', poNumber: 'PO-2026-0002' })),
  },
}));

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div></div>' } },
      { path: '/purchase-orders', component: { template: '<div></div>' } },
      { path: '/purchase-orders/new', component: POCreatePage },
      { path: '/purchase-orders/:id', component: { template: '<div></div>' } },
    ],
  });
}

describe('POCreatePage.vue', () => {
  let wrapper;
  let router;

  beforeEach(async () => {
    router = createTestRouter();
    await router.push('/purchase-orders/new');
    await router.isReady();

    wrapper = mount(POCreatePage, {
      global: {
        plugins: [router],
        stubs: {
          POHeaderForm: true,
          POLineAllocationTable: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
  });

  test('renders page header with title', () => {
    expect(wrapper.find('h2').text()).toContain('Create Purchase Order');
    expect(wrapper.find('.muted').text()).toContain('allocating from approved purchase requisitions');
  });

  test('renders back button linking to purchase orders list', () => {
    const backLink = wrapper.find('.back-btn');
    expect(backLink.exists()).toBe(true);
    expect(backLink.attributes('href')).toBe('/purchase-orders');
  });

  test('renders PO header form component', () => {
    expect(wrapper.findComponent({ name: 'POHeaderForm' }).exists()).toBe(true);
  });

  test('renders PO line allocation table component', () => {
    expect(wrapper.findComponent({ name: 'POLineAllocationTable' }).exists()).toBe(true);
  });

  test('renders Cancel and Save buttons', () => {
    const buttons = wrapper.findAll('.btn');
    const cancelBtn = buttons.find((b) => b.text().includes('Cancel'));
    const saveBtn = buttons.find((b) => b.text().includes('Save'));

    expect(cancelBtn).toBeDefined();
    expect(saveBtn).toBeDefined();
  });

  test('displays error message when vendorName is empty on submit', async () => {
    wrapper.vm.form.vendorName = '';
    wrapper.vm.form.lines = [{ prLineId: 'line-1', allocatedQty: 5 }];

    await wrapper.vm.handleSubmit();
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.errorMessage).toContain('Vendor name is required');
    expect(wrapper.find('.error').text()).toContain('Vendor name is required');
  });

  test('displays error message when no lines are allocated', async () => {
    wrapper.vm.form.vendorName = 'Test Vendor';
    wrapper.vm.form.lines = [];

    await wrapper.vm.handleSubmit();
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.errorMessage).toContain('At least one line must be allocated');
  });

  test('displays error when line has invalid allocation', async () => {
    wrapper.vm.form.vendorName = 'Test Vendor';
    wrapper.vm.form.lines = [{ prLineId: 'line-1', allocatedQty: 0 }];

    await wrapper.vm.handleSubmit();
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.errorMessage).toContain('Allocation quantity must be greater than 0');
  });

  test('updates form when POHeaderForm emits vendor-name update', async () => {
    const headerForm = wrapper.findComponent({ name: 'POHeaderForm' });
    await headerForm.vm.$emit('update:vendor-name', 'New Vendor');
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.form.vendorName).toBe('New Vendor');
  });

  test('updates form when POLineAllocationTable emits lines update', async () => {
    const lineTable = wrapper.findComponent({ name: 'POLineAllocationTable' });
    const testLines = [{ prLineId: 'line-1', allocatedQty: 50 }];
    await lineTable.vm.$emit('update:lines', testLines);
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.form.lines).toEqual(testLines);
  });

  test('loads available PR lines on mount', async () => {
    expect(wrapper.vm.availableRequisitions).toHaveLength(1);
    expect(wrapper.vm.availableRequisitions[0].prNumber).toBe('PR-2026-0001');
  });

  test('displays loading state when fetching requisitions', async () => {
    wrapper.vm.loadingRequisitions = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent({ name: 'POLineAllocationTable' }).props('loading')).toBe(true);
  });
});
