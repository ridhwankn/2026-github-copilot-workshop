import { v4 as uuidv4 } from 'uuid';

function mapHeader(row) {
  return {
    id: row.id,
    prNumber: row.pr_number,
    status: row.status,
    requesterName: row.requester_name,
    departmentName: row.department_name,
    title: row.title,
    notes: row.notes,
    neededByDate: row.needed_by_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLine(row) {
  return {
    id: row.id,
    lineNo: row.line_no,
    itemCode: row.item_code,
    itemName: row.item_name,
    qtyRequested: Number(row.qty_requested),
    qtyAllocated: Number(row.qty_allocated),
    qtyReceived: Number(row.qty_received),
    qtyOpenForPo: Number(row.qty_requested) - Number(row.qty_allocated),
    uom: row.uom,
    estUnitPrice: Number(row.est_unit_price),
    siteCode: row.site_code,
    requiredDate: row.required_date,
    budgetCenter: row.budget_center,
  };
}

function createPrNumber(count) {
  const next = String(Number(count) + 1).padStart(4, '0');
  return `PR-2026-${next}`;
}

export async function listRequisitions(db) {
  const { rows } = await db.query(
    `SELECT id, pr_number, status, requester_name, department_name, title, needed_by_date, created_at, updated_at
     FROM purchase_requisitions
     ORDER BY created_at DESC`
  );

  return rows.map(mapHeader);
}

export async function getRequisitionById(db, id) {
  const headerResult = await db.query(
    `SELECT * FROM purchase_requisitions WHERE id = $1`,
    [id]
  );

  if (headerResult.rowCount === 0) {
    return null;
  }

  const linesResult = await db.query(
    `SELECT * FROM pr_lines WHERE pr_id = $1 ORDER BY line_no ASC`,
    [id]
  );

  return {
    ...mapHeader(headerResult.rows[0]),
    lines: linesResult.rows.map(mapLine),
  };
}

export async function getRequisitionOpenLines(db, id) {
  const requisition = await db.query(
    `SELECT id, status, pr_number FROM purchase_requisitions WHERE id = $1`,
    [id]
  );

  if (requisition.rowCount === 0) {
    return null;
  }

  const linesResult = await db.query(
    `SELECT * FROM pr_lines WHERE pr_id = $1 ORDER BY line_no ASC`,
    [id]
  );

  const openLines = linesResult.rows
    .map(mapLine)
    .filter((line) => line.qtyOpenForPo > 0);

  return {
    requisition: {
      id: requisition.rows[0].id,
      prNumber: requisition.rows[0].pr_number,
      status: requisition.rows[0].status,
    },
    openLines,
  };
}

export async function getAvailablePrLinesForAllocation(db) {
  // Get all PR lines from APPROVED requisitions that have remaining qty to allocate
  const { rows } = await db.query(
    `SELECT 
       pl.id,
       pl.line_no,
       pl.item_code,
       pl.item_name,
       pl.qty_requested,
       pl.qty_allocated,
       pl.qty_received,
       pl.uom,
       pl.est_unit_price,
       pl.site_code,
       pl.required_date,
       pr.id as pr_id,
       pr.pr_number
     FROM pr_lines pl
     JOIN purchase_requisitions pr ON pr.id = pl.pr_id
     WHERE pr.status = 'APPROVED'
       AND (pl.qty_requested - pl.qty_allocated) > 0
     ORDER BY pr.created_at DESC, pl.line_no ASC`
  );

  return rows.map((row) => ({
    id: row.id,
    prNumber: row.pr_number,
    prId: row.pr_id,
    itemCode: row.item_code,
    itemName: row.item_name,
    qtyRequested: Number(row.qty_requested),
    qtyAllocated: Number(row.qty_allocated),
    qtyRemaining: Number(row.qty_requested) - Number(row.qty_allocated),
    uom: row.uom,
    estUnitPrice: Number(row.est_unit_price),
    siteCode: row.site_code,
    requiredDate: row.required_date,
  }));
}

function validateCreatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Body is required';
  }

  const requiredTextFields = ['requesterName', 'departmentName', 'title'];
  for (const field of requiredTextFields) {
    if (!payload[field] || typeof payload[field] !== 'string') {
      return `${field} is required`;
    }
  }

  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    return 'lines must contain at least one item';
  }

  for (const line of payload.lines) {
    if (!line.itemCode || !line.itemName || !line.uom || !line.siteCode) {
      return 'line itemCode, itemName, uom, and siteCode are required';
    }

    if (Number(line.qtyRequested) <= 0) {
      return 'line qtyRequested must be greater than 0';
    }

    if (Number(line.estUnitPrice) < 0) {
      return 'line estUnitPrice must be greater than or equal to 0';
    }
  }

  return null;
}

export async function createRequisition(db, payload) {
  const validationError = validateCreatePayload(payload);
  if (validationError) {
    const err = new Error(validationError);
    err.statusCode = 422;
    throw err;
  }

  const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM purchase_requisitions`);
  const prNumber = createPrNumber(countResult.rows[0].total);
  const requisitionId = uuidv4();

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO purchase_requisitions (id, pr_number, status, requester_name, department_name, title, notes, needed_by_date)
       VALUES ($1, $2, 'DRAFT', $3, $4, $5, $6, $7)`,
      [
        requisitionId,
        prNumber,
        payload.requesterName,
        payload.departmentName,
        payload.title,
        payload.notes || null,
        payload.neededByDate || null,
      ]
    );

    for (let index = 0; index < payload.lines.length; index += 1) {
      const line = payload.lines[index];
      await client.query(
        `INSERT INTO pr_lines (
          id, pr_id, line_no, item_code, item_name, qty_requested, qty_allocated, qty_received,
          uom, est_unit_price, site_code, required_date, budget_center
        ) VALUES ($1, $2, $3, $4, $5, $6, 0, 0, $7, $8, $9, $10, $11)`,
        [
          uuidv4(),
          requisitionId,
          index + 1,
          line.itemCode,
          line.itemName,
          Number(line.qtyRequested),
          line.uom,
          Number(line.estUnitPrice || 0),
          line.siteCode,
          line.requiredDate || null,
          line.budgetCenter || null,
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return getRequisitionById(db, requisitionId);
}

export async function submitRequisition(db, id) {
  const currentResult = await db.query(
    `SELECT id, status FROM purchase_requisitions WHERE id = $1`,
    [id]
  );

  if (currentResult.rowCount === 0) {
    return null;
  }

  const current = currentResult.rows[0];
  if (current.status !== 'DRAFT') {
    const err = new Error('Only DRAFT requisition can be submitted');
    err.statusCode = 422;
    throw err;
  }

  await db.query(
    `UPDATE purchase_requisitions
     SET status = 'SUBMITTED', updated_at = NOW()
     WHERE id = $1`,
    [id]
  );

  return getRequisitionById(db, id);
}

export async function approveRequisition(db, id) {
  const currentResult = await db.query(
    `SELECT id, status FROM purchase_requisitions WHERE id = $1`,
    [id]
  );

  if (currentResult.rowCount === 0) {
    return null;
  }

  const current = currentResult.rows[0];
  if (current.status !== 'SUBMITTED') {
    const err = new Error('Only SUBMITTED requisition can be approved');
    err.statusCode = 422;
    throw err;
  }

  await db.query(
    `UPDATE purchase_requisitions
     SET status = 'APPROVED', updated_at = NOW()
     WHERE id = $1`,
    [id]
  );

  return getRequisitionById(db, id);
}
