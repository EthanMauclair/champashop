<template>
  <NuxtLink to="/panier" class="cart-link" :aria-label="label">
    <svg class="cart-link__icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle cx="10" cy="20" r="1.5" fill="currentColor" />
      <circle cx="17" cy="20" r="1.5" fill="currentColor" />
    </svg>
    <span class="cart-link__label" aria-hidden="true">Panier</span>
    <span v-if="cart.itemCount > 0" class="cart-link__count" aria-hidden="true">{{ cart.itemCount }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCartStore } from '~/stores/cart'

const cart = useCartStore()

const label = computed<string>(() => {
  const count = cart.itemCount
  return `Panier, ${count} article${count > 1 ? 's' : ''}`
})
</script>

<style scoped>
.cart-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 40px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-full);
  background: var(--color-text);
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  transition: background-color var(--transition);
}

.cart-link:hover {
  background: #000;
  color: #fff;
}

.cart-link__icon {
  flex-shrink: 0;
}

/* Petits écrans : icône seule, le nom reste porté par aria-label. */
@media (max-width: 520px) {
  .cart-link {
    padding: 0 var(--space-3);
  }

  .cart-link__label {
    display: none;
  }
}

.cart-link__count {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 var(--space-1);
  border-radius: var(--radius-full);
  background: #fff;
  color: var(--color-text);
  font-size: var(--text-xs);
  font-weight: 700;
}
</style>
