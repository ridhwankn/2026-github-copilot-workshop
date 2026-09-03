import { v4 as uuidv4 } from 'uuid';

function mapHeader(row) {
  return {
    id: row.id,
    grNumber: row.gr_number,
    poId: row.po_id,
    poNumber: row.po_number,
    status: row.status,
    receiptDate: row.receipt_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLine(row) {
  const qtyOrdered = Number(row.qty_ordered);
  const qtyReceived = Number(row.qty_received);
  return {
    id: row.id,
    lineNo: row.line_no,
    poLineId: row.po_line_id,
    itemCode: row.item_code,
    itemName: row.item_name,
    qtyOrdered,
    qtyReceived,
    qtyOpenForGr: qtyOrdered - qtyReceived,
    uom: row.uom,
    unitPrice: Number(row.unit_price),
    actualSiteCode: row.actual_site_code,
  };
}

function validateCreatePayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Body is required';
  if (!payload.poId) return 'poId is required';
  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    return 'lines must contain at least one item';
  }

  for (let i = 0; i < payload.lines.length; i++) {
    const line = payload.lines[i];
    if (!line.poLineId) return `lines[${i}].poLineId is required`;
    if (!Number(line.qtyReceived) || Number(line.qtyReceived) <= 0) {
      return `lines[${i}].qtyReceived must be greater than 0`;
    }
    if (!line.actualSiteCode || !String(line.actualSiteCode).trim()) {
      return `lines[${i}].actualSiteCode is required`;
    }
  }
  return null;
}

function createGrNumber(count) {
  return `GR-2026-${String(Number(count) + 1).padStart(4, '0')}`;
}

export async function listGoodsReceipts(db) {
  const { rows } = await db.query(
    `SELECT gr.id, gr.gr_number, gr.po_id, po.po_number, gr.status,
            gr.receipt_date, gr.created_at, gr.updated_at
     FROM goods_receipts gr
     JOIN purchase_orders po ON po.id = gr.po_id
     ORDER BY gr.created_at DESC`
  );
  return rows.map(mapHeader);
}

export async function getGoodsReceiptById(db, id) {
  const headerResult = await db.query(
    `SELECT gr.*, po.po_number
     FROM goods_receipts gr
     JOIN purchase_orders po ON po.id = gr.po_id
     WHERE gr.id = $1`,
    [id]
  );
  if (headerResult.rowCount === 0) return null;

  const linesResult = await db.query(
    `SELECT grl.*, pol.item_code, pol.item_name, pol.qty_ordered,
            pol.qty_received AS po_qty_received, pol.uom, pol.unit_price
     FROM gr_lines grl
     JOIN po_lines pol ON pol.id = grl.po_line_id
     WHERE grl.gr_id = $1
     ORDER BY grl.line_no ASC`,
    [id]
  );

  return {
    ...mapHeader(headerResult.rows[0]),
    lines: linesResult.rows.map((row) => mapLine({
      ...row,
      qty_received: row.qty_received,
    })),
  };
}

export async function createGoodsReceipt(db, payload) {
  const validationError = validateCreatePayload(payload);
  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 422;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const poResult = await client.query(
      `SELECT id, status FROM purchase_orders WHERE id = $1 FOR UPDATE`,
      [payload.poId]
    );
    if (poResult.rowCount === 0) {
      const error = new Error('Purchase order not found');
      error.statusCode = 422;
      throw error;
    }
    if (poResult.rows[0].status !== 'SUBMITTED') {
      const error = new Error('Only SUBMITTED purchase order can receive goods');
      error.statusCode = 422;
      throw error;
    }

    const checkedLines = [];
    for (let i = 0; i < payload.lines.length; i++) {
      const line = payload.lines[i];
      const result = await client.query(
        `SELECT pol.id, pol.po_id, pol.qty_ordered, pol.qty_received,
                pol.item_code, pol.item_name, pol.uom, pol.unit_price
         FROM po_lines pol
         WHERE pol.id = $1 AND pol.po_id = $2
         FOR UPDATE`,
        [line.poLineId, payload.poId]
      );
      if (result.rowCount === 0) {
        const error = new Error(`lines[${i}]: PO line not found`);
        error.statusCode = 422;
        throw error;
      }

      const poLine = result.rows[0];
      const remaining = Number(poLine.qty_ordered) - Number(poLine.qty_received);
      if (Number(line.qtyReceived) > remaining) {
        const error = new Error(`lines[${i}]: receipt qty ${line.qtyReceived} exceeds open quantity ${remaining}`);
        error.statusCode = 422;
        throw error;
      }
      checkedLines.push({ ...line, poLine });
    }

    const countResult = await client.query(`SELECT COUNT(*)::int AS total FROM goods_receipts`);
    const grId = uuidv4();
    const grNumber = createGrNumber(countResult.rows[0].total);

    await client.query(
      `INSERT INTO goods_receipts (id, gr_number, po_id, status, receipt_date, notes)
       VALUES ($1, $2, $3, 'DRAFT', $4, $5)`,
      [grId, grNumber, payload.poId, payload.receiptDate || null, payload.notes || null]
    );

    for (let i = 0; i < checkedLines.length; i++) {
      const line = checkedLines[i];
      await client.query(
        `INSERT INTO gr_lines (id, gr_id, po_line_id, line_no, qty_received, actual_site_code)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), grId, line.poLineId, i + 1, Number(line.qtyReceived), String(line.actualSiteCode).trim()]
      );
    }

    await client.query('COMMIT');
    return getGoodsReceiptById(db, grId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function postGoodsReceipt(db, id) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const headerResult = await client.query(
      `SELECT id, po_id, status FROM goods_receipts WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (headerResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    if (headerResult.rows[0].status !== 'DRAFT') {
      const error = new Error('Only DRAFT goods receipt can be posted');
      error.statusCode = 422;
      throw error;
    }

    const linesResult = await client.query(
      `SELECT grl.po_line_id, grl.qty_received, pol.qty_ordered, pol.qty_received AS po_qty_received
       FROM gr_lines grl
       JOIN po_lines pol ON pol.id = grl.po_line_id
       WHERE grl.gr_id = $1
       FOR UPDATE`,
      [id]
    );
    if (linesResult.rowCount === 0) {
      const error = new Error('Goods receipt must contain at least one line');
      error.statusCode = 422;
      throw error;
    }

    for (let i = 0; i < linesResult.rows.length; i++) {
      const line = linesResult.rows[i];
      const remaining = Number(line.qty_ordered) - Number(line.po_qty_received);
      if (Number(line.qty_received) > remaining) {
        const error = new Error(`lines[${i}]: receipt qty ${line.qty_received} exceeds open quantity ${remaining}`);
        error.statusCode = 422;
        throw error;
      }

      await client.query(
        `UPDATE po_lines
         SET qty_received = qty_received + $1, updated_at = NOW()
         WHERE id = $2`,
        [Number(line.qty_received), line.po_line_id]
      );
      await client.query(
        `UPDATE pr_lines pr
         SET qty_received = pr.qty_received + ($1 * allocation.allocated_qty / $2), updated_at = NOW()
         FROM pr_line_allocations allocation
         WHERE allocation.pr_line_id = pr.id AND allocation.po_line_id = $3`,
        [Number(line.qty_received), Number(line.qty_ordered), line.po_line_id]
      );
    }

    await client.query(
      `UPDATE goods_receipts SET status = 'POSTED', updated_at = NOW() WHERE id = $1`,
      [id]
    );
    await client.query('COMMIT');
    return getGoodsReceiptById(db, id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
