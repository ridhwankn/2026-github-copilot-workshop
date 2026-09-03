<template>
  <section>
    <!-- Page header -->
    <div class="page-header">
      <div>
        <h2>Procurement Dashboard</h2>
        <p class="muted">Overview of PR, PO and GR activities</p>
      </div>
      <div class="btn-group">
        <RouterLink to="/requisitions/new" class="btn btn-outline">+ New PR</RouterLink>
        <RouterLink to="/purchase-orders/new" class="btn btn-outline">+ New PO</RouterLink>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="stat-cards">
      <div class="stat-card">
        <span class="stat-card-title">Purchase Requisitions</span>
        <span class="stat-card-value">{{ stats.totalPr }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-title">Purchase Orders</span>
        <span class="stat-card-value">{{ stats.totalPo }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-title">Approved PR</span>
        <span class="stat-card-value">{{ stats.approvedPr }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-title">Submitted PO</span>
        <span class="stat-card-value">{{ stats.submittedPo }}</span>
      </div>
    </div>

    <!-- Recent Purchase Requisitions -->
    <div class="card-panel">
      <div class="card-panel-header">
        <h3>Recent Purchase Requisitions</h3>
        <RouterLink to="/requisitions">View All</RouterLink>
      </div>
      <table>
        <thead>
          <tr>
            <th>PR No</th>
            <th>Requester</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in stats.recentPr" :key="item.id">
            <td><RouterLink :to="`/requisitions/${item.id}`">{{ item.prNumber }}</RouterLink></td>
            <td>{{ item.requesterName }}</td>
            <td>
              <span class="status-badge" :class="item.status.toLowerCase()">{{ item.status }}</span>
            </td>
            <td>{{ item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Recent Purchase Orders -->
    <div class="card-panel">
      <div class="card-panel-header">
        <h3>Recent Purchase Orders</h3>
        <RouterLink to="/purchase-orders">View All</RouterLink>
      </div>
      <table>
        <thead>
          <tr>
            <th>PO No</th>
            <th>Vendor</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in stats.recentPo" :key="item.id">
            <td><RouterLink :to="`/purchase-orders/${item.id}`">{{ item.poNumber }}</RouterLink></td>
            <td>{{ item.vendorName }}</td>
            <td>
              <span class="status-badge" :class="item.status.toLowerCase()">{{ item.status }}</span>
            </td>
            <td>{{ item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api';

const stats = reactive({
  totalPr: 0,
  draftPr: 0,
  submittedPr: 0,
  approvedPr: 0,
  recentPr: [],
  totalPo: 0,
  submittedPo: 0,
  recentPo: [],
});

onMounted(async () => {
  const prPayload = await api.getDashboard();
  Object.assign(stats, prPayload);
  
  // Load PO data
  try {
    const poResponse = await api.listPurchaseOrders();
    const pos = poResponse.items || [];
    stats.totalPo = pos.length;
    stats.submittedPo = pos.filter((po) => po.status === 'SUBMITTED').length;
    stats.recentPo = pos.slice(0, 5);
  } catch (error) {
    console.error('Error loading PO data:', error);
  }
});
</script>
