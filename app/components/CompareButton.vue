<template>
  <div class="compare-button">
    <!-- Bouton bascule : son état est porté par aria-pressed, son libellé ne
         change pas (un lecteur d'écran annonce « Comparer, bouton, activé »). -->
    <button
      type="button"
      class="btn btn--block"
      :class="[compact ? 'btn--sm' : '', isSelected ? 'compare-button__toggle--on' : 'btn--secondary']"
      :aria-pressed="isSelected"
      :aria-label="`Comparer : ${product.title}`"
      @click="onToggle"
    >
      <span aria-hidden="true">{{ isSelected ? '✓' : '⇄' }}</span>
      Comparer
    </button>
    <!-- Zone annoncée aux lecteurs d'écran (présente dès le rendu pour que
         le message soit bien lu quand il apparaît). -->
    <p class="compare-button__message" role="status" aria-live="polite">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { CompareProduct } from '~/types/compare'
import { useCompareStore } from '~/stores/compare'
import { COMPARE_FULL_MESSAGE } from '~/utils/compare'

/**
 * Bouton « Comparer » réutilisable : cartes du catalogue et fiche produit.
 * Aucune règle métier ici : le store délègue à utils/compare.ts.
 */
const props = withDefaults(
  defineProps<{
    product: CompareProduct
    /** Variante discrète pour les cartes du catalogue. */
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)

const compare = useCompareStore()
const message = ref<string>('')

const isSelected = computed<boolean>(() => compare.has(props.product.id))

// Une place s'est libérée (retrait depuis la barre…) : le message n'est plus vrai.
watch(
  () => compare.isFull,
  (isFull) => {
    if (!isFull) {
      message.value = ''
    }
  },
)

async function onToggle(): Promise<void> {
  const result = compare.toggle(props.product)
  // On vide d'abord la zone : un même message répété est ainsi annoncé à
  // nouveau si l'utilisateur réessaie.
  message.value = ''
  if (result.rejected) {
    // Au 4ᵉ produit : rien n'est ajouté, le message est annoncé.
    await nextTick()
    message.value = COMPARE_FULL_MESSAGE
  }
}
</script>

<style scoped>
.compare-button__toggle--on,
.compare-button__toggle--on:hover:not(:disabled) {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
  color: var(--color-accent-hover);
}

.compare-button__message {
  margin: var(--space-2) 0 0;
  color: var(--color-danger);
  font-size: var(--text-sm);
}

.compare-button__message:empty {
  margin: 0;
}
</style>
