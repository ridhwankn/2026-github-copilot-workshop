import { jest, describe, test, expect } from '@jest/globals';
import {
  createGoodsReceipt,
  getGoodsReceiptById,
  listGoodsReceipts,
  postGoodsReceipt,
} from '../../src/services/goods-receipt-service.js';

function mockClient(queryResponses) {
  return {
    query: jest.fn((sql, params) => queryResponses(sql, params)),
    release: jest.fn(),
  };
}

function mockDb(client, queryFn) {
  return {
    pool: { connect: jest.fn(() => Promise.resolve(client)) },
    query: jest.fn(queryFn || (() => ({ rows: [], rowCount: 0 }))),
  };
}

function validPayload(overrides = {}) {
  return {
    poId: 'po-001',
    receiptDate: '2026-09-03',
    notes: 'Partial delivery',
    lines: [{
      poLineId: 'po-line-001',
      qtyReceived: 5,
      actualSiteCode: 'JKT-PLANT',
    }],
    ...overrides,
  };
}

describe('createGoodsReceipt – payload validation', () => {
  test('rejects an empty line collection', async () => {
    await expect(createGoodsReceipt(mockDb(null), validPayload({ lines: [] })))
      .rejects.toMatchObject({
        message: 'lines must contain at least one item',
        statusCode: 422,
      });
  });

  test('rejects a non-positive receipt quantity', async () => {
    await expect(createGoodsReceipt(mockDb(null), validPayload({
      lines: [{ ...validPayload().lines[0], qtyReceived: 0 }],
    }))).rejects.toMatchObject({
      message: 'lines[0].qtyReceived must be greater than 0',
      statusCode: 422,
    });
  });
});

describe('createGoodsReceipt – open quantity guard', () => {
  test('rejects when receipt quantity exceeds the PO line open quantity', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM purchase_orders')) {
        return { rows: [{ id: 'po-001', status: 'SUBMITTED' }], rowCount: 1 };
      }
      if (sql.includes('FROM po_lines') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{ po_id: 'po-001', po_status: 'SUBMITTED', po_line_id: 'po-line-001', qty_ordered: 10, qty_received: 7 }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });

    await expect(createGoodsReceipt(mockDb(client), validPayload()))
      .rejects.toMatchObject({
        message: 'lines[0]: receipt qty 5 exceeds open quantity 3',
        statusCode: 422,
      });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

describe('postGoodsReceipt', () => {
  test('updates PO and related PR quantities in one transaction', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM goods_receipts') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 'gr-001', po_id: 'po-001', status: 'DRAFT' }], rowCount: 1 };
      }
      if (sql.includes('FROM gr_lines')) {
        return { rows: [{ po_line_id: 'po-line-001', qty_received: 5 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    const db = mockDb(client, (sql) => {
      if (sql.includes('FROM goods_receipts') && !sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 'gr-001', gr_number: 'GR-2026-0001', po_id: 'po-001', status: 'POSTED', receipt_date: '2026-09-03', notes: null }], rowCount: 1 };
      }
      if (sql.includes('FROM gr_lines')) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    });

    const result = await postGoodsReceipt(db, 'gr-001');

    expect(result.status).toBe('POSTED');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.query.mock.calls.some(([sql]) => sql.includes('UPDATE po_lines'))).toBe(true);
    expect(client.query.mock.calls.some(([sql]) => sql.includes('UPDATE pr_lines'))).toBe(true);
  });

  test('rejects a GR that is already posted', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM goods_receipts') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 'gr-001', po_id: 'po-001', status: 'POSTED' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });

    await expect(postGoodsReceipt(mockDb(client), 'gr-001'))
      .rejects.toMatchObject({
        message: 'Only DRAFT goods receipt can be posted',
        statusCode: 422,
      });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

describe('goods receipt queries', () => {
  test('maps receipt list rows', async () => {
    const db = mockDb(null, (sql) => {
      if (sql.includes('FROM goods_receipts')) {
        return { rows: [{ id: 'gr-001', gr_number: 'GR-2026-0001', po_id: 'po-001', po_number: 'PO-2026-0001', status: 'DRAFT', receipt_date: '2026-09-03', created_at: new Date(), updated_at: new Date() }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });

    const result = await listGoodsReceipts(db);
    expect(result[0]).toMatchObject({ grNumber: 'GR-2026-0001', poNumber: 'PO-2026-0001' });
  });
});
