<template>
  <div class="add-to-cart">
    <button
      type="button"
      class="add-to-cart__button"
      :disabled="isOutOfStock"
      :aria-label="buttonLabel"
      @click="onAdd"
    >
      {{ isOutOfStock ? 'Rupture de stock' : 'Ajouter au panier' }}
    </button>
    <!-- Zone annoncée par les lecteurs d'écran à chaque ajout. -->
    <p
      class="add-to-cart__message"
      :class="{ 'add-to-cart__message--error': lastResult && !lastResult.ok }"
      role="status"
      aria-live="polite"
    >
      {{ lastResult?.message ?? '' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CartProduct, CartUpdate } from '~/types/cart'
import { useCartStore } from '~/stores/cart'

/**
 * Bouton réutilisable : catalogue (F1) et fiche produit (F2).
 * Il ne contient aucune règle métier : il délègue au store, qui délègue
 * à utils/cart.ts (vérification du stock).
 */
const props = withDefaults(defineProps<{
  product: CartProduct
  quantity?: number
}>(), {
  quantity: 1,
})

const emit = defineEmits<{
  added: [result: CartUpdate]
}>()

const cart = useCartStore()
const lastResult = ref<CartUpdate | null>(null)

const isOutOfStock = computed<boolean>(() => props.product.stock <= 0)

// Le libellé accessible reprend le texte visible + le nom du produit,
// pour distinguer les 12 boutons du catalogue au lecteur d'écran.
const buttonLabel = computed<string>(() =>
  `${isOutOfStock.value ? 'Rupture de stock' : 'Ajouter au panier'} : ${props.product.title}`,
)

function onAdd(): void {
  const result = cart.add(props.product, props.quantity)
  lastResult.value = result
  emit('added', result)
}
</script>

<style scoped>
.add-to-cart {
  margin-top: 0.75rem;
}
.add-to-cart__button {
  width: 100%;
  padding: 0.6rem 1rem;
  background-color: #2c3e50;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}
.add-to-cart__button:hover:not(:disabled) {
  background-color: #34495e;
}
.add-to-cart__button:focus-visible {
  outline: 3px solid #f39c12;
  outline-offset: 2px;
}
.add-to-cart__button:disabled {
  background-color: #6b7280;
  cursor: not-allowed;
}
.add-to-cart__message {
  min-height: 1.25rem;
  margin: 0.4rem 0 0;
  font-size: 0.85rem;
  color: #1e6b3a;
}
.add-to-cart__message--error {
  color: #b42318;
}
</style>
