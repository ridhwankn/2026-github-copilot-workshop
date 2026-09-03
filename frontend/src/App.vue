<template>
  <div class="layout">
    <header class="navbar">
      <span class="navbar-brand">Procurement MVP</span>
      <nav>
        <RouterLink to="/" :class="{ active: isDashboard }">Dashboard</RouterLink>
        <RouterLink to="/requisitions" :class="{ active: isRequisitions }">Purchase Requisitions</RouterLink>
        <button
          type="button"
          class="theme-toggle"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleTheme"
        >
          <svg v-if="isDark" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
            <path d="M12 2V4M12 20V22M4 12H2M22 12H20M19.07 4.93L17.66 6.34M6.34 17.66L4.93 19.07M19.07 19.07L17.66 17.66M6.34 6.34L4.93 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </nav>
    </header>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';

const route = useRoute();
const isDashboard = computed(() => route.path === '/');
const isRequisitions = computed(() => route.path.startsWith('/requisitions'));

const isDark = ref(false);

function applyTheme(dark) {
  isDark.value = dark;
  if (dark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

function toggleTheme() {
  const next = !isDark.value;
  applyTheme(next);
  try {
    localStorage.setItem('theme', next ? 'dark' : 'light');
  } catch (e) {
    // localStorage may be unavailable in restricted contexts
  }
}

onMounted(() => {
  let dark = false;
  try {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    dark = saved ? saved === 'dark' : prefersDark;
  } catch (e) {
    // localStorage may be unavailable in restricted contexts
  }
  applyTheme(dark);
});
</script>
