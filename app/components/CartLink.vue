<template>
  <NuxtLink to="/panier" class="cart-link" :aria-label="label">
    <span aria-hidden="true">🛒 Panier</span>
    <span class="cart-link__count" aria-hidden="true">{{ cart.itemCount }}</span>
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
  gap: 0.5rem;
  color: #fff;
  text-decoration: none;
  font-weight: bold;
  padding: 0.4rem 0.75rem;
  border-radius: 4px;
}
.cart-link:hover {
  background-color: #34495e;
}
.cart-link:focus-visible {
  outline: 3px solid #f39c12;
  outline-offset: 2px;
}
.cart-link__count {
  min-width: 1.5rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  background-color: #fff;
  color: #2c3e50;
  text-align: center;
}
</style>
