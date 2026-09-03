<template>
  <section>
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/purchase-orders" class="back-btn" title="Back to list">&#8592;</RouterLink>
        <div>
          <h2>{{ po?.poNumber || 'Loading...' }}</h2>
          <p class="muted">Purchase Order Details</p>
        </div>
      </div>
      <button 
        v-if="po && po.status === 'DRAFT'" 
        class="btn btn-primary" 
        @click="handleSubmit"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? 'Submitting...' : 'Submit PO' }}
      </button>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success">{{ successMessage }}</p>

    <div v-if="loading" class="loading">Loading purchase order details...</div>

    <template v-else-if="po">
      <!-- PO Header Section -->
      <div class="card-panel">
        <p class="form-section-title">PO Information</p>
        <div class="info-grid">
          <div class="info-item">
            <label>PO Number</label>
            <p>{{ po.poNumber }}</p>
          </div>
          <div class="info-item">
            <label>Vendor Name</label>
            <p>{{ po.vendorName }}</p>
          </div>
          <div class="info-item">
            <label>Status</label>
            <p>
              <span :class="['status', `status-${po.status.toLowerCase()}`]">
                {{ po.status }}
              </span>
            </p>
          </div>
          <div class="info-item">
            <label>Created Date</label>
            <p>{{ formatDate(po.createdAt) }}</p>
          </div>
        </div>
      </div>

      <!-- PO Lines Section -->
      <div class="card-panel">
        <p class="form-section-title">Order Lines</p>
        <table v-if="po.lines && po.lines.length > 0" class="data-table">
          <thead>
            <tr>
              <th style="width: 50px">Line</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th style="width: 80px">Qty Order</th>
              <th style="width: 80px">Qty Recv</th>
              <th style="width: 80px">Open for GR</th>
              <th style="width: 100px">Unit Price</th>
              <th>UOM</th>
              <th>Site</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, index) in po.lines" :key="index">
              <td>{{ index + 1 }}</td>
              <td>{{ line.itemCode }}</td>
              <td>{{ line.itemName }}</td>
              <td class="right-align">{{ formatNumber(line.qtyOrdered) }}</td>
              <td class="right-align">{{ formatNumber(line.qtyReceived) }}</td>
              <td class="right-align">{{ formatNumber(line.qtyOpenForGr) }}</td>
              <td class="right-align">{{ formatCurrency(line.unitPrice) }}</td>
              <td>{{ line.uom }}</td>
              <td>{{ line.siteCode }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">
          <p>No order lines</p>
        </div>
      </div>

      <!-- Allocation Tracking Section -->
      <div class="card-panel">
        <p class="form-section-title">Source Requisitions (Allocations)</p>
        <table v-if="po.lines && po.lines.length > 0" class="data-table">
          <thead>
            <tr>
              <th>PO Line</th>
              <th>PR Number</th>
              <th>Allocated Qty</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, lineIdx) in po.lines" :key="lineIdx">
              <td v-if="line.allocations && line.allocations.length > 0">
                {{ lineIdx + 1 }}
              </td>
              <td colspan="3" v-else style="text-align: center; color: var(--text-muted)">
                {{ lineIdx === 0 ? 'No allocations for line ' + (lineIdx + 1) : '' }}
              </td>
            </tr>
            <tr v-for="(line, lineIdx) in po.lines" :key="`alloc-${lineIdx}`">
              <td v-if="line.allocations && line.allocations.length > 0">
                <template v-for="(alloc, allocIdx) in line.allocations" :key="allocIdx">
                  <div v-if="allocIdx > 0" style="border-top: 1px solid var(--border-color); padding-top: 0.5rem; margin-top: 0.5rem">
                    {{ lineIdx + 1 }}
                  </div>
                </template>
              </td>
              <td v-if="line.allocations && line.allocations.length > 0">
                <template v-for="(alloc, allocIdx) in line.allocations" :key="allocIdx">
                  <div v-if="allocIdx > 0" style="border-top: 1px solid var(--border-color); padding-top: 0.5rem; margin-top: 0.5rem">
                    {{ alloc.prNumber }}
                  </div>
                  <div v-else>{{ alloc.prNumber }}</div>
                </template>
              </td>
              <td v-if="line.allocations && line.allocations.length > 0" class="right-align">
                <template v-for="(alloc, allocIdx) in line.allocations" :key="allocIdx">
                  <div v-if="allocIdx > 0" style="border-top: 1px solid var(--border-color); padding-top: 0.5rem; margin-top: 0.5rem">
                    {{ formatNumber(alloc.allocatedQty) }}
                  </div>
                  <div v-else>{{ formatNumber(alloc.allocatedQty) }}</div>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">
          <p>No allocations</p>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="btn-group">
        <RouterLink to="/purchase-orders" class="btn btn-outline">Back to List</RouterLink>
      </div>
    </template>

    <div v-else class="error">
      Could not load purchase order details.
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { api } from '../api';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const po = ref(null);

onMounted(async () => {
  await loadPurchaseOrder();
});

async function loadPurchaseOrder() {
  try {
    loading.value = true;
    errorMessage.value = '';
    po.value = await api.getPurchaseOrder(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
    po.value = null;
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  try {
    errorMessage.value = '';
    successMessage.value = '';
    isSubmitting.value = true;

    const updated = await api.submitPurchaseOrder(route.params.id);
    po.value = updated;
    successMessage.value = 'Purchase order submitted successfully!';
    setTimeout(() => {
      router.push('/purchase-orders');
    }, 1500);
  } catch (error) {
    if (error.statusCode === 422) {
      errorMessage.value = `Validation Error: ${error.message}`;
    } else {
      errorMessage.value = error.message;
    }
    console.error('PO Submit Error:', error);
  } finally {
    isSubmitting.value = false;
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1rem 0;
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--primary);
  color: var(--white);
  cursor: pointer;
  font-size: 18px;
  color: var(--text-color);
  text-decoration: none;
}

.back-btn:hover { opacity: 0.85; }

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-color);
}

.page-header .muted {
  margin: 0.25rem 0 0 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.btn {
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  transition: all 0.2s;
}

.btn-primary {
  background-color: var(--primary);
  color: var(--white);
}

.btn-primary:hover { opacity: 0.85; }

.btn-outline {
  background-color: transparent;
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.btn-outline:hover {
  background-color: var(--bg-hover);
}

.error {
  padding: 0.75rem 1rem;
  background-color: #fee;
  border: 1px solid #fcc;
  border-radius: var(--radius-input);
  color: #c00;
  margin-bottom: 1rem;
}

.success {
  padding: 0.75rem 1rem;
  background-color: #efe;
  border: 1px solid #cfc;
  border-radius: 4px;
  color: #060;
  margin-bottom: 1rem;
}

.loading,
.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
  background-color: var(--white);
  border-radius: var(--radius-card);
}

.card-panel {
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-section-title {
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.info-item label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.info-item p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-color);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.data-table thead {
  background-color: var(--table-header);
  border-bottom: 1px solid var(--border);
}

.data-table th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-color);
}

.data-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.data-table tbody tr:hover {
  background-color: rgba(255, 64, 129, 0.04);
}

.right-align {
  text-align: right;
}

.status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-draft {
  background-color: #fff3cd;
  color: #856404;
}

.status-submitted {
  background-color: #cfe2ff;
  color: #084298;
}

.btn-group {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  justify-content: flex-end;
}

@media (max-width: 720px) {
  .page-header {
    gap: 16px;
    align-items: flex-start;
  }

  .page-header .btn {
    padding: 10px 16px;
    white-space: nowrap;
  }

  .data-table {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
}
</style>
