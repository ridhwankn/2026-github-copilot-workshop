import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: { template: '<div>Home</div>' } }],
});

describe('App theme toggle', () => {
  let localStorageMock;

  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorageMock = {
      store: {},
      getItem(key) {
        return this.store[key] ?? null;
      },
      setItem(key, value) {
        this.store[key] = String(value);
      },
    };
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });

  it('toggles data-theme and localStorage when the theme button is clicked', async () => {
    await router.push('/');
    const wrapper = mount(App, { global: { plugins: [router] } });

    expect(document.documentElement.getAttribute('data-theme')).toBeNull();

    const button = wrapper.find('.theme-toggle');
    await button.trigger('click');

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorageMock.store.theme).toBe('dark');

    await button.trigger('click');

    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(localStorageMock.store.theme).toBe('light');
  });

  it('restores saved dark theme on mount', async () => {
    localStorageMock.store.theme = 'dark';
    await router.push('/');
    mount(App, { global: { plugins: [router] } });

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
