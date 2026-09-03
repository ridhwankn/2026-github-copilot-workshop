<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/" class="back-btn" title="Back to dashboard">&#8592;</RouterLink>
        <div>
          <h2>Goods Receipts</h2>
          <p class="muted">Track received goods against purchase orders</p>
        </div>
      </div>
      <RouterLink to="/goods-receipts/new" class="btn btn-primary">+ New GR</RouterLink>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <div v-if="loading" class="loading">Loading goods receipts...</div>
    <div v-else-if="items.length === 0" class="empty-state">
      <p>No goods receipts yet.</p>
      <RouterLink to="/goods-receipts/new" class="btn btn-primary">Create First GR</RouterLink>
    </div>
    <div v-else class="card-panel">
      <table>
        <thead><tr><th>GR Number</th><th>PO Number</th><th>Status</th><th>Receipt Date</th><th>Action</th></tr></thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td><RouterLink :to="`/goods-receipts/${item.id}`">{{ item.grNumber }}</RouterLink></td>
            <td><RouterLink :to="`/purchase-orders/${item.poId}`">{{ item.poNumber }}</RouterLink></td>
            <td><span :class="['status-badge', item.status.toLowerCase()]">{{ item.status }}</span></td>
            <td>{{ item.receiptDate || '-' }}</td>
            <td><RouterLink :to="`/goods-receipts/${item.id}`" class="btn-action">View</RouterLink></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api';

const items = ref([]);
const loading = ref(false);
const errorMessage = ref('');

onMounted(async () => {
  try {
    loading.value = true;
    items.value = (await api.listGoodsReceipts()).items || [];
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
});
</script>
