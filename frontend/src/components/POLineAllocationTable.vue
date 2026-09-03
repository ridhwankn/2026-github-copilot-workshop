<template>
  <div class="card-panel">
    <div class="card-panel-header">
      <p class="form-section-title">PO Lines</p>
      <p class="info-text">Select and allocate from available requisition lines</p>
    </div>

    <div v-if="loading" class="loading">Loading requisitions...</div>
    <div v-else-if="availableRequisitions.length === 0" class="empty-state">
      <p>No available purchase requisitions found</p>
    </div>

    <template v-else>
      <div class="section">
        <div class="section-heading">
          <p class="section-title">Approved PR Lines</p>
          <button type="button" class="refresh-btn" @click="emit('refresh')">Refresh Open Lines</button>
        </div>

        <div class="table-scroll">
          <table class="requisition-table" data-testid="available-pr-lines">
            <thead>
              <tr>
                <th>Select</th>
                <th>PR Number</th>
                <th>Line</th>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>UOM</th>
                <th>Requested Qty</th>
                <th>Allocated Qty</th>
                <th>Remaining Qty</th>
                <th>Order Qty</th>
                <th>Delivery Address</th>
                <th>Delivery Date</th>
                <th>Unit Price</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in availableRequisitions" :key="line.id">
                <td>
                  <input
                    type="checkbox"
                    :checked="isLineSelected(line.id)"
                    @change="toggleLineSelection(line)"
                    :data-testid="`add-pr-line-${line.id}`"
                    :aria-label="`Select ${line.itemName}`"
                  />
                </td>
                <td>{{ line.prNumber }}</td>
                <td>{{ line.lineNo || '-' }}</td>
                <td>{{ line.itemCode }}</td>
                <td>{{ line.itemName }}</td>
                <td>{{ line.uom }}</td>
                <td class="right-align">{{ formatNumber(line.qtyRequested) }}</td>
                <td class="right-align">{{ formatNumber(line.qtyAllocated) }}</td>
                <td class="right-align">{{ formatNumber(line.qtyRemaining) }}</td>
                <td>
                  <input
                    v-if="isLineSelected(line.id)"
                    v-model.number="selectedLine(line.id).allocatedQty"
                    type="number"
                    min="0.01"
                    class="table-input qty-input"
                    :data-testid="`allocation-qty-${selectedIndex(line.id)}`"
                    @change="validateAllocation(selectedIndex(line.id))"
                  />
                  <span v-else>-</span>
                </td>
                <td>
                  <input v-if="isLineSelected(line.id)" v-model="selectedLine(line.id).deliveryAddress" class="table-input" placeholder="Type..." />
                  <span v-else>-</span>
                </td>
                <td>
                  <input v-if="isLineSelected(line.id)" v-model="selectedLine(line.id).deliveryDate" type="date" class="table-input" />
                  <span v-else>-</span>
                </td>
                <td class="right-align">
                  <input v-if="isLineSelected(line.id)" v-model.number="selectedLine(line.id).unitPrice" type="number" min="0" step="0.01" class="table-input price-input" @input="emit('update:lines', [...props.lines])" />
                  <span v-else>{{ formatCurrency(line.estUnitPrice) }}</span>
                </td>
                <td class="right-align">{{ isLineSelected(line.id) ? formatCurrency(selectedLine(line.id).allocatedQty * selectedLine(line.id).unitPrice) : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="selected-summary" data-testid="selected-lines-summary">
        <div>
          <span class="summary-label">Selected Lines</span>
          <strong>{{ lines.length }}</strong>
        </div>
        <div class="estimated-total">
          <span class="summary-label">Estimated Total</span>
          <strong data-testid="estimated-total">{{ formatCurrency(estimatedTotal) }}</strong>
        </div>
      </div>

      <div class="panel-actions">
        <slot name="actions"></slot>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  lines: { type: Array, required: true },
  availableRequisitions: { type: Array, required: true },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['update:lines', 'update:error', 'refresh']);

const estimatedTotal = computed(() => props.lines.reduce(
  (total, line) => total + Number(line.allocatedQty || 0) * Number(line.unitPrice || 0),
  0
));

function isLineSelected(prLineId) {
  return props.lines.some((line) => line.prLineId === prLineId);
}

function selectedLine(prLineId) {
  return props.lines.find((line) => line.prLineId === prLineId);
}

function selectedIndex(prLineId) {
  return props.lines.findIndex((line) => line.prLineId === prLineId);
}

function toggleLineSelection(requisitionLine) {
  const newLines = [...props.lines];
  const existingIndex = newLines.findIndex((line) => line.prLineId === requisitionLine.id);

  if (existingIndex !== -1) {
    newLines.splice(existingIndex, 1);
  } else {
    newLines.push({
      prLineId: requisitionLine.id,
      prNumber: requisitionLine.prNumber,
      itemCode: requisitionLine.itemCode,
      itemName: requisitionLine.itemName,
      qtyRemaining: requisitionLine.qtyRemaining,
      allocatedQty: Math.min(1, requisitionLine.qtyRemaining),
      unitPrice: requisitionLine.estUnitPrice || 0,
      uom: requisitionLine.uom,
      siteCode: requisitionLine.siteCode,
      deliveryAddress: requisitionLine.siteCode || '',
      deliveryDate: requisitionLine.requiredDate || '',
    });
  }

  emit('update:lines', newLines);
}

function validateAllocation(index) {
  const line = props.lines[index];
  if (line.allocatedQty > line.qtyRemaining) {
    emit('update:error', `Allocation cannot exceed remaining quantity (${line.qtyRemaining})`);
  }
  emit('update:lines', [...props.lines]);
}

function formatNumber(value) {
  return Number(value || 0).toFixed(2);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
</script>

<style scoped>
.card-panel { background: var(--white); border-radius: var(--radius-card); padding: 24px; margin-bottom: 24px; }
.card-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.form-section-title { margin: 0; font-size: 14px; font-weight: 700; }
.info-text { margin: 0; color: var(--text-muted); font-size: 13px; }
.section { margin: 0; }
.section-heading { display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--primary); border-radius: 4px; padding: 6px 10px; margin-bottom: 10px; }
.section-title { margin: 0; font-size: 14px; font-weight: 700; }
.refresh-btn { border: 0; background: transparent; color: var(--primary); font-size: 12px; font-weight: 600; cursor: pointer; }
.table-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 1280px; }
th, td { padding: 10px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: middle; white-space: nowrap; }
th { background: var(--table-header); font-size: 13px; font-weight: 600; }
.right-align { text-align: right; }
.table-input { min-width: 96px; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-input); font: inherit; color: var(--text); background: var(--white); }
.qty-input { width: 86px; min-width: 86px; }
.price-input { width: 110px; min-width: 110px; }
.table-input:focus { outline: none; border-color: var(--primary); }
input[type='checkbox'] { width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer; }
.selected-summary { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 14px 8px 0; border-top: 1px solid var(--border); }
.selected-summary > div { display: flex; flex-direction: column; gap: 4px; }
.summary-label { color: var(--text-muted); font-size: 12px; }
.selected-summary strong { font-size: 18px; }
.estimated-total { text-align: right; }
.panel-actions { display: flex; justify-content: flex-end; margin-top: 20px; }
.loading, .empty-state { padding: 2rem; text-align: center; color: var(--text-muted); background: var(--table-header); border-radius: var(--radius-input); }
@media (max-width: 720px) { .card-panel-header { align-items: flex-start; flex-direction: column; gap: 6px; } .card-panel { padding: 16px; } }
</style>
