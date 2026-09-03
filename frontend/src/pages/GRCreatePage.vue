<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/goods-receipts" class="back-btn" title="Back to list">&#8592;</RouterLink>
        <div>
          <h2>Create Goods Receipt</h2>
          <p class="muted">Receive goods against an open purchase order</p>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error" data-testid="gr-error">{{ errorMessage }}</p>
    <form @submit.prevent="handleSubmit">
      <div class="card-panel">
        <p class="form-section-title">Receipt Information</p>
        <div class="form-row">
          <label>Purchase Order
            <select v-model="form.poId" required @change="selectPurchaseOrder(form.poId)">
              <option value="">Select purchase order</option>
              <option v-for="po in purchaseOrders" :key="po.id" :value="po.id">{{ po.poNumber }} - {{ po.vendorName }}</option>
            </select>
          </label>
          <label>Receipt Date
            <input v-model="form.receiptDate" type="date" required>
          </label>
        </div>
        <label>Notes
          <textarea v-model="form.notes" rows="3" placeholder="Optional notes"></textarea>
        </label>
      </div>

      <div class="card-panel">
        <p class="form-section-title">Open PO Lines</p>
        <div v-if="loadingLines" class="loading">Loading open lines...</div>
        <div v-else-if="!form.poId" class="empty-state"><p>Select a purchase order to see open lines.</p></div>
        <div v-else-if="lines.length === 0" class="empty-state"><p>This purchase order has no open lines.</p></div>
        <table v-else>
          <thead><tr><th>Line</th><th>Item</th><th>Ordered</th><th>Received</th><th>Open</th><th>Receive Qty</th><th>Actual Site</th></tr></thead>
          <tbody>
            <tr v-for="line in lines" :key="line.id">
              <td>{{ line.lineNo }}</td>
              <td>{{ line.itemCode }}<br><span class="muted">{{ line.itemName }}</span></td>
              <td>{{ line.qtyOrdered }} {{ line.uom }}</td>
              <td>{{ line.qtyReceived }}</td>
              <td>{{ line.qtyOpenForGr }}</td>
              <td><input v-model.number="line.qtyReceivedInput" type="number" min="0" step="0.01" :max="line.qtyOpenForGr"></td>
              <td><input v-model="line.actualSiteCode" type="text" required></td>
            </tr>
          </tbody>
        </table>
        <div class="btn-group">
          <RouterLink to="/goods-receipts" class="btn btn-outline">Cancel</RouterLink>
          <button class="btn btn-primary" type="submit" :disabled="isSubmitting || !form.poId || lines.length === 0">{{ isSubmitting ? 'Creating...' : 'Save As Draft' }}</button>
        </div>
      </div>
    </form>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { api } from '../api';

const router = useRouter();
const purchaseOrders = ref([]);
const lines = ref([]);
const loadingLines = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref('');
const form = reactive({ poId: '', receiptDate: new Date().toISOString().slice(0, 10), notes: '' });

onMounted(async () => {
  try {
    purchaseOrders.value = ((await api.listPurchaseOrders()).items || []).filter((po) => po.status === 'SUBMITTED');
  } catch (error) {
    errorMessage.value = error.message;
  }
});

async function selectPurchaseOrder(poId) {
  lines.value = [];
  if (!poId) return;
  try {
    loadingLines.value = true;
    const response = await api.getOpenPurchaseOrderLines(poId);
    lines.value = (response.openLines || []).map((line) => ({ ...line, qtyReceivedInput: 0, actualSiteCode: line.siteCode }));
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loadingLines.value = false;
  }
}

async function handleSubmit() {
  errorMessage.value = '';
  try {
    isSubmitting.value = true;
    const selectedLines = lines.value.filter((line) => Number(line.qtyReceivedInput) > 0);
    if (selectedLines.length === 0) throw new Error('At least one line must be received');
    for (let i = 0; i < selectedLines.length; i++) {
      const line = selectedLines[i];
      if (Number(line.qtyReceivedInput) > Number(line.qtyOpenForGr)) {
        throw new Error(`Line ${line.lineNo}: receipt quantity exceeds open quantity`);
      }
      if (!line.actualSiteCode.trim()) throw new Error(`Line ${line.lineNo}: actual site is required`);
    }
    const created = await api.createGoodsReceipt({
      poId: form.poId,
      receiptDate: form.receiptDate,
      notes: form.notes || null,
      lines: selectedLines.map((line) => ({ poLineId: line.id, qtyReceived: Number(line.qtyReceivedInput), actualSiteCode: line.actualSiteCode.trim() })),
    });
    await router.push(`/goods-receipts/${created.id}`);
  } catch (error) {
    errorMessage.value = error.statusCode === 422 ? `Validation Error: ${error.message}` : error.message;
  } finally {
    isSubmitting.value = false;
  }
}
</script>
