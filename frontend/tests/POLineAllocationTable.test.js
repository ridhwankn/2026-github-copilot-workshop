import { describe, test, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import POLineAllocationTable from '../src/components/POLineAllocationTable.vue';

describe('POLineAllocationTable.vue', () => {
  let wrapper;

  const mockRequisitions = [
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
    {
      id: 'line-2',
      prNumber: 'PR-2026-0002',
      itemCode: 'ITEM-B',
      itemName: 'Widget B',
      qtyRequested: 50,
      qtyAllocated: 0,
      qtyRemaining: 50,
      uom: 'PCS',
      estUnitPrice: 20000,
      siteCode: 'WH-2',
      requiredDate: null,
    },
  ];

  beforeEach(() => {
    wrapper = mount(POLineAllocationTable, {
      props: {
        lines: [],
        availableRequisitions: mockRequisitions,
        loading: false,
      },
    });
  });

  describe('rendering', () => {
    test('renders page header section with available lines', () => {
      expect(wrapper.find('.form-section-title').text()).toContain('PO Lines');
      expect(wrapper.find('.info-text').text()).toContain('Select and allocate');
    });

    test('renders available requisition lines table', () => {
      const tables = wrapper.findAll('table');
      expect(tables.length).toBeGreaterThanOrEqual(1);
      
      const table = tables[0];
      expect(table.find('th').text()).toContain('PR Number');
      expect(table.find('th').text()).toContain('Item Code');
    });

    test('displays each available PR line in requisition table', () => {
      const rows = wrapper.findAll('table tbody tr');
      // Should have 2 rows for 2 available lines
      expect(rows.length).toBeGreaterThanOrEqual(2);
    });

    test('renders allocated lines section when lines are added', async () => {
      await wrapper.setProps({
        lines: [
          {
            prLineId: 'line-1',
            prNumber: 'PR-2026-0001',
            itemCode: 'ITEM-A',
            itemName: 'Widget A',
            qtyRemaining: 70,
            allocatedQty: 30,
            unitPrice: 10000,
            uom: 'PCS',
            siteCode: 'WH-1',
          },
        ],
      });

      const titles = wrapper.findAll('.form-section-title');
      expect(titles.length).toBeGreaterThanOrEqual(2);
      expect(titles[1].text()).toContain('Allocated Lines');
    });

    test('shows empty state when no allocated lines', () => {
      expect(wrapper.find('.empty-allocated').exists()).toBe(true);
    });

    test('displays loading state', async () => {
      await wrapper.setProps({ loading: true });
      expect(wrapper.find('.loading').text()).toContain('Loading requisitions');
    });

    test('displays empty state when no available requisitions', async () => {
      await wrapper.setProps({ availableRequisitions: [] });
      expect(wrapper.find('.empty-state').exists()).toBe(true);
    });
  });

  describe('line selection', () => {
    test('selects a line when checkbox is clicked', async () => {
      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      await checkboxes[0].setValue(true);

      const emitted = wrapper.emitted('update:lines');
      expect(emitted).toBeTruthy();
      expect(emitted[0][0]).toHaveLength(1);
      expect(emitted[0][0][0].prLineId).toBe('line-1');
    });

    test('adds line to allocated list when Add button is clicked', async () => {
      const addButtons = wrapper.findAll('.btn-action');
      await addButtons[0].trigger('click');

      const emitted = wrapper.emitted('update:lines');
      expect(emitted).toBeTruthy();
      expect(emitted[0][0]).toHaveLength(1);
      expect(emitted[0][0][0].itemCode).toBe('ITEM-A');
    });

    test('removes line from allocation when Remove button is clicked', async () => {
      await wrapper.setProps({
        lines: [
          {
            prLineId: 'line-1',
            prNumber: 'PR-2026-0001',
            itemCode: 'ITEM-A',
            itemName: 'Widget A',
            qtyRemaining: 70,
            allocatedQty: 30,
            unitPrice: 10000,
            uom: 'PCS',
            siteCode: 'WH-1',
          },
        ],
      });

      const deleteButtons = wrapper.findAll('.btn-danger-icon');
      await deleteButtons[0].trigger('click');

      const emitted = wrapper.emitted('update:lines');
      expect(emitted).toBeTruthy();
      expect(emitted[0][0]).toHaveLength(0);
    });

    test('toggles line selection when Add button clicked again', async () => {
      const addButtons = wrapper.findAll('.btn-action');
      
      // Add line
      await addButtons[0].trigger('click');
      let emitted = wrapper.emitted('update:lines');
      expect(emitted[0][0]).toHaveLength(1);

      // Update props to show line is selected
      await wrapper.setProps({
        lines: [{ prLineId: 'line-1', allocatedQty: 50 }],
      });

      // Toggle off (simulating second click)
      await addButtons[0].trigger('click');
      emitted = wrapper.emitted('update:lines');
      // Should now show removal (empty array)
      expect(emitted[emitted.length - 1][0]).toHaveLength(0);
    });
  });

  describe('allocation validation', () => {
    test('validates allocated qty does not exceed remaining qty', async () => {
      await wrapper.setProps({
        lines: [
          {
            prLineId: 'line-1',
            prNumber: 'PR-2026-0001',
            itemCode: 'ITEM-A',
            itemName: 'Widget A',
            qtyRemaining: 70,
            allocatedQty: 100, // Exceeds remaining
            unitPrice: 10000,
            uom: 'PCS',
            siteCode: 'WH-1',
          },
        ],
      });

      const inputs = wrapper.findAll('.qty-input');
      const firstInput = inputs[0];
      await firstInput.setValue(100); // Try to allocate more than remaining

      // Trigger validation (blur event)
      await firstInput.trigger('blur');

      // Should emit error
      const errorEmitted = wrapper.emitted('update:error');
      expect(errorEmitted).toBeTruthy();
      expect(errorEmitted[0][0]).toContain('allocation cannot exceed remaining');
    });

    test('allows allocation exactly equal to remaining qty', async () => {
      await wrapper.setProps({
        lines: [
          {
            prLineId: 'line-1',
            prNumber: 'PR-2026-0001',
            itemCode: 'ITEM-A',
            itemName: 'Widget A',
            qtyRemaining: 70,
            allocatedQty: 70,
            unitPrice: 10000,
            uom: 'PCS',
            siteCode: 'WH-1',
          },
        ],
      });

      expect(wrapper.find('.qty-input').element.value).toBe('70.00');
    });

    test('shows allocated qty calculations', async () => {
      await wrapper.setProps({
        lines: [
          {
            prLineId: 'line-1',
            prNumber: 'PR-2026-0001',
            itemCode: 'ITEM-A',
            itemName: 'Widget A',
            qtyRemaining: 70,
            allocatedQty: 30,
            unitPrice: 10000,
            uom: 'PCS',
            siteCode: 'WH-1',
          },
        ],
      });

      // Find cell with remaining calculation (70 - 30 = 40)
      const rows = wrapper.findAll('table tbody tr');
      const secondAllocTable = rows[rows.length - 1];
      expect(secondAllocTable.text()).toContain('40'); // Remaining after allocation
    });
  });

  describe('form interactions', () => {
    test('allows editing allocated qty in allocated lines table', async () => {
      await wrapper.setProps({
        lines: [
          {
            prLineId: 'line-1',
            prNumber: 'PR-2026-0001',
            itemCode: 'ITEM-A',
            itemName: 'Widget A',
            qtyRemaining: 70,
            allocatedQty: 30,
            unitPrice: 10000,
            uom: 'PCS',
            siteCode: 'WH-1',
          },
        ],
      });

      const qtyInput = wrapper.find('.qty-input');
      expect(qtyInput.exists()).toBe(true);
      
      await qtyInput.setValue(50);
      await qtyInput.trigger('change');

      const emitted = wrapper.emitted('update:lines');
      expect(emitted).toBeTruthy();
      expect(emitted[0][0][0].allocatedQty).toBe(50);
    });

    test('allows editing unit price in allocated lines table', async () => {
      await wrapper.setProps({
        lines: [
          {
            prLineId: 'line-1',
            prNumber: 'PR-2026-0001',
            itemCode: 'ITEM-A',
            itemName: 'Widget A',
            qtyRemaining: 70,
            allocatedQty: 30,
            unitPrice: 10000,
            uom: 'PCS',
            siteCode: 'WH-1',
          },
        ],
      });

      const priceInput = wrapper.find('.price-input');
      expect(priceInput.exists()).toBe(true);

      await priceInput.setValue(15000);

      const emitted = wrapper.emitted('update:lines');
      expect(emitted).toBeTruthy();
      expect(emitted[0][0][0].unitPrice).toBe(15000);
    });
  });
});
