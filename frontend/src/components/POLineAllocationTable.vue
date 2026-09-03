<template>
  <div class="card-panel">
    <div class="card-panel-header">
      <p class="form-section-title" style="margin: 0">PO Lines</p>
      <p class="info-text">Select and allocate from available requisition lines</p>
    </div>

    <div v-if="loading" class="loading">Loading requisitions...</div>

    <div v-else-if="availableRequisitions.length === 0" class="empty-state">
      <p>No available purchase requisitions found</p>
    </div>

    <template v-else>
      <!-- Available PR Lines Table -->
      <div class="section">
        <p class="section-title">Available Requisition Lines</p>
        <table class="requisition-table" data-testid="available-pr-lines">
          <thead>
            <tr>
              <th style="width: 40px"></th>
              <th>PR Number</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th style="width: 80px">Qty Req</th>
              <th style="width: 100px">Remaining</th>
              <th>UOM</th>
              <th>Est. Price</th>
              <th>Site</th>
              <th style="width: 80px">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in availableRequisitions" :key="line.id">
              <td>
                <input
                  type="checkbox"
                  :checked="isLineSelected(line.id)"
                  @change="toggleLineSelection(line)"
                />
              </td>
              <td>{{ line.prNumber }}</td>
              <td>{{ line.itemCode }}</td>
              <td>{{ line.itemName }}</td>
              <td class="right-align">{{ formatNumber(line.qtyRequested) }}</td>
              <td class="right-align">{{ formatNumber(line.qtyRemaining) }}</td>
              <td>{{ line.uom }}</td>
              <td class="right-align">{{ formatCurrency(line.estUnitPrice) }}</td>
              <td>{{ line.siteCode }}</td>
              <td>
                <button
                  type="button"
                  class="btn-action"
                  :data-testid="`add-pr-line-${line.id}`"
                  @click="toggleLineSelection(line)"
                  :title="isLineSelected(line.id) ? 'Remove' : 'Add'"
                >
                  {{ isLineSelected(line.id) ? '✓ Added' : '+ Add' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Allocated Lines Table -->
      <div class="section">
        <p class="section-title">Allocated Lines</p>
        <table v-if="lines.length > 0" class="allocation-table">
          <thead>
            <tr>
              <th style="width: 50px">Line</th>
              <th>PR Number</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th style="width: 100px">Alloc Qty</th>
              <th style="width: 100px">Remaining</th>
              <th style="width: 100px">Unit Price</th>
              <th>UOM</th>
              <th>Site</th>
              <th style="width: 60px">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, index) in lines" :key="index">
              <td>{{ index + 1 }}</td>
              <td>{{ line.prNumber }}</td>
              <td>{{ line.itemCode }}</td>
              <td>{{ line.itemName }}</td>
              <td>
                <input
                  v-model.number="line.allocatedQty"
                  type="number"
                  min="0.01"
                  step="0.01"
                  :max="line.qtyRemaining"
                  @change="validateAllocation(index)"
                  class="qty-input"
                  :data-testid="`allocation-qty-${index}`"
                  required
                />
              </td>
              <td class="right-align">{{ formatNumber(line.qtyRemaining - line.allocatedQty) }}</td>
              <td>
                <input
                  v-model.number="line.unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  class="price-input"
                  @input="emit('update:lines', [...props.lines])"
                />
              </td>
              <td>{{ line.uom }}</td>
              <td>{{ line.siteCode }}</td>
              <td style="text-align: center">
                <button
                  type="button"
                  class="btn-danger-icon"
                  @click="removeAllocation(index)"
                  title="Remove"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M5.5 1.5h5M2 3.5h12M3.5 3.5l.75 9.5a1.5 1.5 0 0 0 1.5 1.5h4.5a1.5 1.5 0 0 0 1.5-1.5l.75-9.5M6.5 6.5v4.5M9.5 6.5v4.5"
                      stroke="currentColor"
                      stroke-width="1.2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-allocated">
          <p>No lines allocated yet. Add lines from the requisition table above.</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  lines: {
    type: Array,
    required: true,
  },
  availableRequisitions: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:lines', 'update:error']);

// Check if a line is already selected
function isLineSelected(prLineId) {
  return props.lines.some((line) => line.prLineId === prLineId);
}

// Toggle line selection
function toggleLineSelection(requisitionLine) {
  const newLines = [...props.lines];
  const existingIndex = newLines.findIndex((line) => line.prLineId === requisitionLine.id);

  if (existingIndex !== -1) {
    // Remove if already selected
    newLines.splice(existingIndex, 1);
  } else {
    // Add new allocation line
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
    });
  }

  emit('update:lines', newLines);
}

// Validate allocation doesn't exceed remaining quantity
function validateAllocation(index) {
  const line = props.lines[index];
  if (line.allocatedQty > line.qtyRemaining) {
    line.allocatedQty = line.qtyRemaining;
    emit('update:error', `Allocation cannot exceed remaining quantity (${line.qtyRemaining})`);
  }
  emit('update:lines', [...props.lines]);
}

// Remove an allocation
function removeAllocation(index) {
  const newLines = props.lines.filter((_, i) => i !== index);
  emit('update:lines', newLines);
}

// Formatting helpers
function formatNumber(value) {
  return Number(value).toFixed(2);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}
</script>

<style scoped>
.card-panel {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.card-panel-header {
  margin-bottom: 1.5rem;
}

.form-section-title {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
}

.info-text {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.section {
  margin-bottom: 2rem;
}

.section-title {
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-color);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.loading,
.empty-state,
.empty-allocated {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
  background-color: var(--bg-secondary);
  border-radius: 4px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

table thead {
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

table th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-color);
}

table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

table tbody tr:hover {
  background-color: var(--bg-hover);
}

.right-align {
  text-align: right;
}

.qty-input,
.price-input {
  width: 100%;
  padding: 0.4rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: inherit;
}

.qty-input:focus,
.price-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

input[type='checkbox'] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.btn-action {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--border-color);
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-action:hover {
  background-color: var(--bg-hover);
  border-color: var(--primary-color);
}

.btn-danger-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #c00;
  transition: all 0.2s;
}

.btn-danger-icon:hover {
  background-color: #fee;
  border-radius: 4px;
}
</style>
