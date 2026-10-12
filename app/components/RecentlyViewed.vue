<template>
  <section v-if="visibleProducts.length > 0 || cleared" class="recently-viewed" aria-labelledby="recently-viewed-title">
    <div class="recently-viewed__header">
      <!-- tabindex="-1" : reçoit le focus quand le bouton « Effacer » disparaît -->
      <h2 id="recently-viewed-title" ref="titleRef" class="recently-viewed__title" tabindex="-1">Vus récemment</h2>
      <button v-if="visibleProducts.length > 0" type="button" class="btn btn--secondary btn--sm" @click="clearHistory">
        Effacer l'historique
      </button>
    </div>

    <!-- Région annoncée aux lecteurs d'écran : présente dès le rendu pour
         que le message soit bien lu quand il apparaît. -->
    <p class="recently-viewed__status" role="status">
      <template v-if="cleared">Votre historique de navigation a été effacé.</template>
    </p>

    <ul v-if="visibleProducts.length > 0" class="recently-viewed__list">
      <li v-for="product in visibleProducts" :key="product.id" class="recently-viewed__item">
        <NuxtLink :to="`/produits/${product.id}`" class="recently-viewed__link">
          <img :src="product.thumbnail" alt="" class="recently-viewed__image" width="120" height="120" loading="lazy" >
          <span class="recently-viewed__name">{{ product.title }}</span>
          <span class="recently-viewed__price">{{ formatCents(eurosToCents(product.price)) }}</span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { RecentProduct } from '~/types/recentlyViewed'
import { useRecentlyViewedStore } from '~/stores/recentlyViewed'
import { eurosToCents, formatCents } from '~/utils/money'

const props = defineProps<{
  /** Produit à ne pas afficher (la fiche produit en cours). */
  excludeId?: number
}>()

const store = useRecentlyViewedStore()
const cleared = ref<boolean>(false)
const titleRef = ref<HTMLHeadingElement | null>(null)

/*
 * Chargé pendant le rendu serveur : la liste est dans le HTML initial.
 * Les infos des produits sont transmises au client avec l'état Pinia,
 * donc aucune requête n'est refaite à l'hydratation.
 */
await useAsyncData('recently-viewed-products', async (): Promise<true> => {
  await store.loadProducts()
  return true
})

/** Ordre de l'historique (du plus récent au plus ancien), sans le produit courant. */
const visibleProducts = computed<RecentProduct[]>(() =>
  store.ids
    .filter((id) => id !== props.excludeId)
    .flatMap((id) => {
      const product = store.products[id]
      return product ? [product] : []
    }),
)

/**
 * Le bouton disparaît avec la liste : on replace le focus sur le titre de la
 * section pour que l'utilisateur au clavier ne soit pas renvoyé en haut de page.
 */
async function clearHistory(): Promise<void> {
  store.clear()
  cleared.value = true
  await nextTick()
  titleRef.value?.focus()
}
</script>

<style scoped>
.recently-viewed {
  margin-bottom: var(--space-7);
}

.recently-viewed__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.recently-viewed__title {
  margin: 0;
  outline-offset: 4px;
  font-size: var(--text-2xl);
}

.recently-viewed__status {
  margin: 0 0 var(--space-3);
  color: var(--color-text-muted);
}

.recently-viewed__status:empty {
  margin: 0;
}

.recently-viewed__list {
  display: flex;
  gap: var(--space-4);
  margin: 0;
  padding: 0 0 var(--space-3);
  list-style: none;
  overflow-x: auto;
  scroll-snap-type: x proximity;
}

.recently-viewed__item {
  flex: 0 0 160px;
  scroll-snap-align: start;
}

.recently-viewed__link {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  height: 100%;
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: inherit;
  text-decoration: none;
  transition:
    border-color var(--transition),
    box-shadow var(--transition);
}

.recently-viewed__link:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  color: inherit;
}

.recently-viewed__image {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  object-fit: contain;
  margin-bottom: var(--space-2);
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
}

.recently-viewed__name {
  display: -webkit-box;
  overflow: hidden;
  font-size: var(--text-sm);
  font-weight: 600;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.recently-viewed__price {
  margin-top: auto;
  font-weight: 700;
}
</style>
