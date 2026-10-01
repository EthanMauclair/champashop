<template>
  <li class="cart-line">
    <div class="cart-line__media">
      <img :src="product.thumbnail" alt="" class="cart-line__image" width="88" height="88" loading="lazy">
    </div>

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
      class="btn btn--danger-ghost btn--sm cart-line__remove"
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
  grid-template-columns: 88px minmax(0, 1fr) auto auto auto;
  grid-template-areas:
    'media info quantity total remove'
    'media message message message message';
  align-items: center;
  column-gap: var(--space-5);
  row-gap: var(--space-2);
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--color-border);
}

.cart-line:last-child {
  border-bottom: none;
}

.cart-line__media {
  grid-area: media;
  width: 88px;
  height: 88px;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.cart-line__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: var(--space-1);
}

.cart-line__info {
  grid-area: info;
  min-width: 0;
}

.cart-line__title {
  margin: 0 0 var(--space-1);
  font-size: var(--text-base);
}

.cart-line__title a {
  color: var(--color-text);
  text-decoration: none;
}

.cart-line__title a:hover {
  text-decoration: underline;
}

.cart-line__meta {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.cart-line__quantity {
  grid-area: quantity;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.cart-line__step {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  font-size: var(--text-lg);
  cursor: pointer;
}

.cart-line__step:hover {
  background: var(--color-surface-muted);
}

.cart-line__step:focus-visible,
.cart-line__input:focus-visible {
  outline-offset: -3px;
}

.cart-line__input {
  width: 3rem;
  height: 36px;
  border: none;
  background: transparent;
  text-align: center;
  font-weight: 600;
  -moz-appearance: textfield;
  appearance: textfield;
}

.cart-line__input::-webkit-inner-spin-button,
.cart-line__input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.cart-line__total {
  grid-area: total;
  min-width: 6rem;
  margin: 0;
  text-align: right;
  font-weight: 700;
}

.cart-line__remove {
  grid-area: remove;
}

.cart-line__message {
  grid-area: message;
  margin: 0;
  color: var(--color-danger);
  font-size: var(--text-sm);
}

@media (max-width: 720px) {
  .cart-line {
    grid-template-columns: 72px minmax(0, 1fr) auto;
    grid-template-areas:
      'media info info'
      'media quantity total'
      'media remove remove'
      'media message message';
    column-gap: var(--space-4);
  }

  .cart-line__media {
    width: 72px;
    height: 72px;
  }

  .cart-line__remove {
    justify-self: start;
    padding-left: 0;
  }
}
</style>
