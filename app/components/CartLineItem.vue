<template>
  <li class="cart-line">
    <img :src="product.thumbnail" alt="" class="cart-line__image" width="80" height="80" loading="lazy">

    <div class="cart-line__info">
      <h2 class="cart-line__title">
        <NuxtLink :to="`/produits/${product.id}`">{{ product.title }}</NuxtLink>
      </h2>
      <p class="cart-line__meta">
        {{ formatCents(unitPriceCents) }} l'unité · {{ product.stock }} en stock
      </p>
    </div>

    <div class="cart-line__quantity" role="group" :aria-label="`Quantité de ${product.title}`">
      <button
        type="button"
        class="cart-line__step"
        :aria-label="`Diminuer la quantité de ${product.title}`"
        @click="emit('update-quantity', item.quantity - 1)"
      >
        −
      </button>
      <label :for="inputId" class="visually-hidden">Quantité de {{ product.title }}</label>
      <input
        :id="inputId"
        ref="quantityInput"
        type="number"
        inputmode="numeric"
        min="0"
        :max="product.stock"
        :value="item.quantity"
        :aria-describedby="message ? messageId : undefined"
        class="cart-line__input"
        @change="onInputChange"
      >
      <button
        type="button"
        class="cart-line__step"
        :aria-label="`Augmenter la quantité de ${product.title}`"
        @click="emit('update-quantity', item.quantity + 1)"
      >
        +
      </button>
    </div>

    <p class="cart-line__total">{{ formatCents(unitPriceCents * item.quantity) }}</p>

    <button
      type="button"
      class="cart-line__remove"
      :aria-label="`Retirer ${product.title} du panier`"
      @click="emit('remove')"
    >
      Retirer
    </button>

    <p v-if="message" :id="messageId" class="cart-line__message" role="alert">
      {{ message }}
    </p>
  </li>
</template>

<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from 'vue'
import type { CartItem, CartProduct } from '~/types/cart'
import { eurosToCents, formatCents } from '~/utils/money'

const props = withDefaults(defineProps<{
  item: CartItem
  product: CartProduct
  /** Message d'erreur/info propre à cette ligne (ex. stock dépassé). */
  message?: string | null
}>(), {
  message: null,
})

const emit = defineEmits<{
  'update-quantity': [quantity: number]
  remove: []
}>()

const quantityInput = useTemplateRef<HTMLInputElement>('quantityInput')

const inputId = computed<string>(() => `quantite-${props.product.id}`)
const messageId = computed<string>(() => `message-${props.product.id}`)
const unitPriceCents = computed<number>(() => eurosToCents(props.product.price))

async function onInputChange(event: Event): Promise<void> {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  emit('update-quantity', Number(target.value))
  // Si le store a plafonné la quantité à une valeur identique à l'ancienne,
  // Vue ne re-rend pas l'input : on resynchronise l'affichage à la main.
  await nextTick()
  if (quantityInput.value) {
    quantityInput.value.value = String(props.item.quantity)
  }
}
</script>

<style scoped>
.cart-line {
  display: grid;
  grid-template-columns: 80px 1fr auto auto auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid #eaeaea;
}
.cart-line__image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
}
.cart-line__title {
  font-size: 1.05rem;
  margin: 0 0 0.25rem;
}
.cart-line__title a {
  color: #2c3e50;
}
.cart-line__meta {
  margin: 0;
  color: #4b5563;
  font-size: 0.9rem;
}
.cart-line__quantity {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.cart-line__input {
  width: 3.5rem;
  padding: 0.4rem;
  text-align: center;
  border: 1px solid #9ca3af;
  border-radius: 4px;
}
.cart-line__step,
.cart-line__remove {
  padding: 0.4rem 0.7rem;
  border: 1px solid #2c3e50;
  border-radius: 4px;
  background: #fff;
  color: #2c3e50;
  cursor: pointer;
}
.cart-line__remove {
  border-color: #b42318;
  color: #b42318;
}
.cart-line__step:focus-visible,
.cart-line__remove:focus-visible,
.cart-line__input:focus-visible {
  outline: 3px solid #f39c12;
  outline-offset: 2px;
}
.cart-line__total {
  margin: 0;
  font-weight: bold;
  min-width: 6rem;
  text-align: right;
}
.cart-line__message {
  grid-column: 2 / -1;
  margin: 0;
  color: #b42318;
  font-size: 0.9rem;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
@media (max-width: 640px) {
  .cart-line {
    grid-template-columns: 64px 1fr;
  }
}
</style>
