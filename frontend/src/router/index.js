import { createRouter, createWebHistory } from 'vue-router';
import DashboardPage from '../pages/DashboardPage.vue';
import RequisitionListPage from '../pages/RequisitionListPage.vue';
import RequisitionCreatePage from '../pages/RequisitionCreatePage.vue';
import RequisitionDetailPage from '../pages/RequisitionDetailPage.vue';
import POCreatePage from '../pages/POCreatePage.vue';
import POListPage from '../pages/POListPage.vue';
import PODetailPage from '../pages/PODetailPage.vue';
import GRListPage from '../pages/GRListPage.vue';
import GRCreatePage from '../pages/GRCreatePage.vue';
import GRDetailPage from '../pages/GRDetailPage.vue';

const routes = [
  { path: '/', name: 'dashboard', component: DashboardPage },
  { path: '/requisitions', name: 'requisitions-list', component: RequisitionListPage },
  { path: '/requisitions/new', name: 'requisitions-create', component: RequisitionCreatePage },
  { path: '/requisitions/:id', name: 'requisitions-detail', component: RequisitionDetailPage, props: true },
  { path: '/purchase-orders', name: 'purchase-orders-list', component: POListPage },
  { path: '/purchase-orders/new', name: 'purchase-orders-create', component: POCreatePage },
  { path: '/purchase-orders/:id', name: 'purchase-orders-detail', component: PODetailPage, props: true },
  { path: '/goods-receipts', name: 'goods-receipts-list', component: GRListPage },
  { path: '/goods-receipts/new', name: 'goods-receipts-create', component: GRCreatePage },
  { path: '/goods-receipts/:id', name: 'goods-receipts-detail', component: GRDetailPage, props: true },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
