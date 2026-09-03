<template>
  <section>
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/" class="back-btn" title="Back to dashboard">&#8592;</RouterLink>
        <div>
          <h2>Purchase Orders</h2>
          <p class="muted">Track and manage all purchase orders</p>
        </div>
      </div>
      <RouterLink to="/purchase-orders/new" class="btn btn-primary">+ New PO</RouterLink>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div v-if="loading" class="loading">Loading purchase orders...</div>

    <div v-else-if="purchaseOrders.length === 0" class="empty-state">
      <p>No purchase orders yet. Create one to get started.</p>
      <RouterLink to="/purchase-orders/new" class="btn btn-primary">Create First PO</RouterLink>
    </div>

    <table v-else class="data-table">
      <thead>
        <tr>
          <th>PO Number</th>
          <th>Vendor Name</th>
          <th>Status</th>
          <th>Created Date</th>
          <th style="width: 100px">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="po in purchaseOrders" :key="po.id">
          <td>
            <RouterLink :to="`/purchase-orders/${po.id}`" class="link">
              {{ po.poNumber }}
            </RouterLink>
          </td>
          <td>{{ po.vendorName }}</td>
          <td>
            <span :class="['status', `status-${po.status.toLowerCase()}`]">
              {{ po.status }}
            </span>
          </td>
          <td>{{ formatDate(po.createdAt) }}</td>
          <td style="text-align: center">
            <RouterLink :to="`/purchase-orders/${po.id}`" class="btn-action" title="View details">
              View
            </RouterLink>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api';

const loading = ref(false);
const errorMessage = ref('');
const purchaseOrders = ref([]);

onMounted(async () => {
  await loadPurchaseOrders();
});

async function loadPurchaseOrders() {
  try {
    loading.value = true;
    const response = await api.listPurchaseOrders();
    purchaseOrders.value = response.items || [];
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

.error {
  padding: 0.75rem 1rem;
  background-color: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c00;
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

.empty-state {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  background: white;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.data-table thead {
  background-color: var(--table-header);
  border-bottom: 1px solid var(--border);
}

.data-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-color);
}

.data-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.data-table tbody tr:hover {
  background-color: var(--bg-hover);
}

.link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.link:hover {
  text-decoration: underline;
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

.btn-action {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--border-color);
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-action:hover {
  background-color: var(--bg-hover);
  border-color: var(--primary-color);
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
