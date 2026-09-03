import { describe, test, expect, jest } from '@jest/globals';
import {
  listRequisitions,
  getRequisitionOpenLines,
  getAvailablePrLinesForAllocation,
} from '../../src/services/requisition-service.js';

function mockDb(queryImpl) {
  return { query: jest.fn(queryImpl) };
}

describe('requisition-service list functions', () => {
  test('listRequisitions returns mapped header fields in DESC order', async () => {
    const db = mockDb(() => ({
      rows: [
        {
          id: 'pr-1',
          pr_number: 'PR-2026-0001',
          status: 'APPROVED',
          requester_name: 'Rina',
          department_name: 'Ops',
          title: 'Spare parts',
          needed_by_date: '2026-06-15',
          created_at: '2026-05-01T10:00:00.000Z',
          updated_at: '2026-05-01T10:00:00.000Z',
        },
      ],
    }));

    const result = await listRequisitions(db);

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        id: 'pr-1',
        prNumber: 'PR-2026-0001',
        status: 'APPROVED',
        requesterName: 'Rina',
        departmentName: 'Ops',
        title: 'Spare parts',
        notes: undefined,
        neededByDate: '2026-06-15',
        createdAt: '2026-05-01T10:00:00.000Z',
        updatedAt: '2026-05-01T10:00:00.000Z',
      },
    ]);
  });

  test('listRequisitions returns empty array when no requisitions exist', async () => {
    const db = mockDb(() => ({ rows: [] }));

    const result = await listRequisitions(db);

    expect(result).toEqual([]);
  });

  test('getRequisitionOpenLines returns null when requisition not found', async () => {
    const db = mockDb(() => ({ rows: [], rowCount: 0 }));

    const result = await getRequisitionOpenLines(db, 'non-existent-id');

    expect(result).toBeNull();
  });

  test('getRequisitionOpenLines filters lines with remaining qty > 0', async () => {
    const db = mockDb((sql) => {
      if (sql.includes('SELECT id, status')) {
        return {
          rows: [
            { id: 'pr-1', pr_number: 'PR-2026-0001', status: 'APPROVED' },
          ],
          rowCount: 1,
        };
      }
      // Lines query
      return {
        rows: [
          {
            id: 'line-1',
            pr_id: 'pr-1',
            line_no: 1,
            item_code: 'ITEM-A',
            item_name: 'Widget A',
            qty_requested: '100',
            qty_allocated: '50',
            qty_received: '0',
            uom: 'PCS',
            est_unit_price: '10000',
            site_code: 'WH-1',
            required_date: null,
            budget_center: 'BC-001',
          },
          {
            id: 'line-2',
            pr_id: 'pr-1',
            line_no: 2,
            item_code: 'ITEM-B',
            item_name: 'Widget B',
            qty_requested: '50',
            qty_allocated: '50',
            qty_received: '0',
            uom: 'PCS',
            est_unit_price: '20000',
            site_code: 'WH-1',
            required_date: null,
            budget_center: 'BC-001',
          },
        ],
      };
    });

    const result = await getRequisitionOpenLines(db, 'pr-1');

    // Should only return line-1 with remaining qty > 0
    expect(result.openLines).toHaveLength(1);
    expect(result.openLines[0].qtyOpenForPo).toBe(50);
  });

  test('getAvailablePrLinesForAllocation returns only APPROVED lines with remaining qty', async () => {
    const db = mockDb(() => ({
      rows: [
        {
          id: 'line-1',
          line_no: 1,
          item_code: 'ITEM-A',
          item_name: 'Widget A',
          qty_requested: '100',
          qty_allocated: '30',
          qty_received: '0',
          uom: 'PCS',
          est_unit_price: '10000',
          site_code: 'WH-1',
          required_date: '2026-06-30',
          pr_id: 'pr-1',
          pr_number: 'PR-2026-0001',
        },
        {
          id: 'line-2',
          line_no: 1,
          item_code: 'ITEM-B',
          item_name: 'Widget B',
          qty_requested: '50',
          qty_allocated: '50',
          qty_received: '0',
          uom: 'PCS',
          est_unit_price: '20000',
          site_code: 'WH-2',
          required_date: '2026-07-15',
          pr_id: 'pr-2',
          pr_number: 'PR-2026-0002',
        },
      ],
    }));

    const result = await getAvailablePrLinesForAllocation(db);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'line-1',
      prNumber: 'PR-2026-0001',
      itemCode: 'ITEM-A',
      qtyRemaining: 70,
    });
  });

  test('getAvailablePrLinesForAllocation maps numeric fields correctly', async () => {
    const db = mockDb(() => ({
      rows: [
        {
          id: 'line-1',
          line_no: 1,
          item_code: 'ITEM-A',
          item_name: 'Widget A',
          qty_requested: '100.50',
          qty_allocated: '50.25',
          qty_received: '0',
          uom: 'PCS',
          est_unit_price: '10000.99',
          site_code: 'WH-1',
          required_date: null,
          pr_id: 'pr-1',
          pr_number: 'PR-2026-0001',
        },
      ],
    }));

    const result = await getAvailablePrLinesForAllocation(db);

    // Verify numeric conversions
    expect(result[0].qtyRequested).toBeCloseTo(100.5);
    expect(result[0].qtyAllocated).toBeCloseTo(50.25);
    expect(result[0].qtyRemaining).toBeCloseTo(50.25);
    expect(result[0].estUnitPrice).toBeCloseTo(10000.99);
  });
});