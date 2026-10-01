<template>
  <div class="add-to-cart">
    <button
      type="button"
      class="btn btn--block"
      :class="[compact ? 'btn--secondary btn--sm' : 'btn--primary', { 'add-to-cart__button--done': justAdded }]"
      :disabled="isOutOfStock"
      :aria-label="buttonLabel"
      @click="onAdd"
    >
      <span aria-hidden="true">{{ justAdded ? '✓' : '+' }}</span>
      {{ isOutOfStock ? 'Rupture de stock' : justAdded ? 'Ajouté' : 'Ajouter au panier' }}
    </button>
    <!-- Zone annoncée par les lecteurs d'écran à chaque ajout. -->
    <p
      class="add-to-cart__message"
      :class="{
        'add-to-cart__message--error': lastResult && !lastResult.ok,
        'visually-hidden': compact && lastResult?.ok,
      }"
      role="status"
      aria-live="polite"
    >
      {{ lastResult?.message ?? '' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
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
  /** Variante discrète pour les cartes du catalogue. */
  compact?: boolean
}>(), {
  quantity: 1,
  compact: false,
})

const emit = defineEmits<{
  added: [result: CartUpdate]
}>()

const FEEDBACK_DURATION_MS = 1500

const cart = useCartStore()
const lastResult = ref<CartUpdate | null>(null)
const justAdded = ref<boolean>(false)
let feedbackTimer: ReturnType<typeof setTimeout> | undefined

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

  // Retour visuel bref sur le bouton (« ✓ Ajouté »).
  justAdded.value = result.ok
  clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => {
    justAdded.value = false
  }, FEEDBACK_DURATION_MS)
}

onBeforeUnmount(() => clearTimeout(feedbackTimer))
</script>

<style scoped>
.add-to-cart__button--done,
.add-to-cart__button--done:hover:not(:disabled) {
  background: var(--color-success);
  border-color: var(--color-success);
  color: #fff;
}

.add-to-cart__message {
  margin: var(--space-2) 0 0;
  font-size: var(--text-sm);
  color: var(--color-success);
}

.add-to-cart__message:empty {
  margin: 0;
}

.add-to-cart__message--error {
  color: var(--color-danger);
}
</style>
