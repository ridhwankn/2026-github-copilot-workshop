<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/goods-receipts" class="back-btn" title="Back to list">&#8592;</RouterLink>
        <div>
          <h2>{{ receipt?.grNumber || 'Loading...' }}</h2>
          <p class="muted">Goods Receipt Details</p>
        </div>
      </div>
      <button v-if="receipt?.status === 'DRAFT'" class="btn btn-primary" :disabled="isPosting" @click="handlePost">{{ isPosting ? 'Posting...' : 'Post GR' }}</button>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success">{{ successMessage }}</p>
    <div v-if="loading" class="loading">Loading goods receipt...</div>
    <template v-else-if="receipt">
      <div class="card-panel">
        <p class="form-section-title">Receipt Information</p>
        <div class="info-grid">
          <div><label>GR Number</label><p>{{ receipt.grNumber }}</p></div>
          <div><label>PO Number</label><p><RouterLink :to="`/purchase-orders/${receipt.poId}`">{{ receipt.poNumber }}</RouterLink></p></div>
          <div><label>Status</label><p><span :class="['status-badge', receipt.status.toLowerCase()]">{{ receipt.status }}</span></p></div>
          <div><label>Receipt Date</label><p>{{ receipt.receiptDate || '-' }}</p></div>
        </div>
        <div v-if="receipt.notes"><label>Notes</label><p>{{ receipt.notes }}</p></div>
      </div>
      <div class="card-panel">
        <p class="form-section-title">Receipt Lines</p>
        <table v-if="receipt.lines.length">
          <thead><tr><th>Line</th><th>Item</th><th>Ordered</th><th>Received</th><th>Open</th><th>Actual Site</th></tr></thead>
          <tbody><tr v-for="line in receipt.lines" :key="line.id">
            <td>{{ line.lineNo }}</td><td>{{ line.itemCode }}<br><span class="muted">{{ line.itemName }}</span></td>
            <td>{{ line.qtyOrdered }} {{ line.uom }}</td><td>{{ line.qtyReceived }}</td><td>{{ line.qtyOpenForGr }}</td><td>{{ line.actualSiteCode }}</td>
          </tr></tbody>
        </table>
        <div v-else class="empty-state"><p>No receipt lines</p></div>
      </div>
      <div class="btn-group"><RouterLink to="/goods-receipts" class="btn btn-outline">Back to List</RouterLink></div>
    </template>
    <div v-else class="error">Could not load goods receipt details.</div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { api } from '../api';

const route = useRoute();
const receipt = ref(null);
const loading = ref(false);
const isPosting = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

onMounted(loadReceipt);

async function loadReceipt() {
  try {
    loading.value = true;
    receipt.value = await api.getGoodsReceipt(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

async function handlePost() {
  try {
    isPosting.value = true;
    errorMessage.value = '';
    receipt.value = await api.postGoodsReceipt(route.params.id);
    successMessage.value = 'Goods receipt posted successfully.';
  } catch (error) {
    errorMessage.value = error.statusCode === 422 ? `Validation Error: ${error.message}` : error.message;
  } finally {
    isPosting.value = false;
  }
}
</script>
