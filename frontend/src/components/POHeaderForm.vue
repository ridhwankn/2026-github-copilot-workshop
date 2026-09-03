<template>
  <div class="card-panel">
    <p class="form-section-title">PO Header</p>
    <div class="form-row">
      <div class="form-group">
        <label>Vendor Name <span class="required">*</span></label>
        <input 
          :value="vendorName"
          @input="$emit('update:vendorName', $event.target.value)"
          placeholder="Enter vendor name..."
          data-testid="vendor-name"
          required
        />
      </div>
      <div class="form-group">
        <label for="needed-by-date">Needed By Date</label>
        <input id="needed-by-date" :value="neededByDate" @input="$emit('update:neededByDate', $event.target.value)" type="date" data-testid="needed-by-date" />
      </div>
      <div class="form-group">
        <label for="currency">Currency</label>
        <select id="currency" :value="currency" @change="$emit('update:currency', $event.target.value)" data-testid="currency">
          <option value="IDR">IDR</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <div class="form-group">
        <label for="payment-terms">Payment Terms</label>
        <input id="payment-terms" :value="paymentTerms" @input="$emit('update:paymentTerms', $event.target.value)" placeholder="Type..." data-testid="payment-terms" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group full">
        <label for="po-notes">Notes</label>
        <textarea id="po-notes" :value="notes" @input="$emit('update:notes', $event.target.value)" placeholder="Type..." data-testid="po-notes"></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  vendorName: {
    type: String,
    required: true,
  },
  neededByDate: { type: String, default: '' },
  currency: { type: String, default: 'IDR' },
  paymentTerms: { type: String, default: '' },
  notes: { type: String, default: '' },
});

defineEmits([
  'update:vendorName',
  'update:neededByDate',
  'update:currency',
  'update:paymentTerms',
  'update:notes',
  'update:error',
]);
</script>

<style scoped>
.card-panel {
  background: white;
  border-radius: var(--radius-card);
  padding: 24px;
  margin-bottom: 24px;
}

.form-section-title {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 700;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.form-group.full { grid-column: 1 / -1; }

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 400;
  color: var(--text-muted);
}

.required {
  color: var(--primary);
}

.form-group input {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  font-size: 13px;
  font-family: inherit;
  color: var(--text);
}

.form-group textarea,
.form-group select {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  font-size: 13px;
  font-family: inherit;
  color: var(--text);
  background: var(--white);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary);
}
</style>
