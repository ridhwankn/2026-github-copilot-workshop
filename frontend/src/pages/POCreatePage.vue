<template>
  <section>
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/purchase-orders" class="back-btn" title="Back to list">&#8592;</RouterLink>
        <div>
          <h2>Create Purchase Order</h2>
          <p class="muted">Create PO by allocating from approved purchase requisitions</p>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error" data-testid="po-error">{{ errorMessage }}</p>

    <form @submit.prevent="handleSubmit">
      <!-- PO Header card -->
      <POHeaderForm 
        v-model:vendor-name="form.vendorName"
        v-model:needed-by-date="form.neededByDate"
        v-model:currency="form.currency"
        v-model:payment-terms="form.paymentTerms"
        v-model:notes="form.notes"
        @update:error="(msg) => errorMessage = msg"
      />

      <!-- PO Line Allocation card -->
      <POLineAllocationTable 
        v-model:lines="form.lines"
        :available-requisitions="availableRequisitions"
        :loading="loadingRequisitions"
        @update:error="(msg) => errorMessage = msg"
        @refresh="loadAvailableRequisitions"
      >
        <template #actions>
          <div class="btn-group">
            <RouterLink to="/purchase-orders" class="btn btn-outline">Cancel</RouterLink>
            <button class="btn btn-primary" type="button" data-testid="save-po" :disabled="isSubmitting" @click="handleSubmit">{{ isSubmitting ? 'Creating...' : 'Save As Draft' }}</button>
          </div>
        </template>
      </POLineAllocationTable>
    </form>
  </section>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import POHeaderForm from '../components/POHeaderForm.vue';
import POLineAllocationTable from '../components/POLineAllocationTable.vue';
import { api } from '../api';

const router = useRouter();
const errorMessage = ref('');
const loadingRequisitions = ref(false);
const isSubmitting = ref(false);
const availableRequisitions = ref([]);

const form = reactive({
  vendorName: '',
  neededByDate: '',
  currency: 'IDR',
  paymentTerms: '',
  notes: '',
  lines: [],
});

// Load available PR lines on component mount
onMounted(async () => {
  await loadAvailableRequisitions();
});

async function loadAvailableRequisitions() {
  try {
    loadingRequisitions.value = true;
    const response = await api.getAvailablePrLinesForAllocation();
    availableRequisitions.value = response.items || [];
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loadingRequisitions.value = false;
  }
}

async function handleSubmit() {
  errorMessage.value = '';
  isSubmitting.value = true;

  try {
    // Client-side validation
    if (!form.vendorName.trim()) {
      throw new Error('Vendor name is required');
    }

    if (form.lines.length === 0) {
      throw new Error('At least one line must be allocated');
    }

    // Validate that all lines have valid allocations and required fields
    for (let i = 0; i < form.lines.length; i++) {
      const line = form.lines[i];
      if (!line.prLineId) {
        throw new Error(`Line ${i + 1}: PR line ID is missing`);
      }
      if (line.allocatedQty <= 0) {
        throw new Error(`Line ${i + 1}: Allocation quantity must be greater than 0`);
      }
      if (!line.itemCode || !line.itemName) {
        throw new Error(`Line ${i + 1}: Item code and name are required`);
      }
      if (!line.uom || !line.siteCode) {
        throw new Error(`Line ${i + 1}: UOM and site code are required`);
      }
    }

    const payload = {
      vendorName: form.vendorName.trim(),
      lines: form.lines.map((line) => ({
        prLineId: line.prLineId,
        qtyOrdered: Number(line.allocatedQty),
        unitPrice: Number(line.unitPrice || 0),
        itemCode: line.itemCode,
        itemName: line.itemName,
        uom: line.uom,
        siteCode: line.siteCode,
        requiredDate: line.requiredDate || null,
      })),
    };

    const created = await api.createPurchaseOrder(payload);
    await router.push(`/purchase-orders/${created.id}`);
  } catch (error) {
    // Handle 422 validation errors from backend
    if (error.statusCode === 422) {
      errorMessage.value = `Validation Error: ${error.message}`;
    } else {
      errorMessage.value = error.message;
    }
    console.error('PO Creation Error:', error);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--primary);
  color: var(--white);
  cursor: pointer;
  font-size: 20px;
  font-weight: 700;
  text-decoration: none;
}

.back-btn:hover { opacity: 0.85; }

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.page-header .muted {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.error {
  margin-bottom: 16px;
}

.btn-group {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  justify-content: flex-end;
}

</style>
