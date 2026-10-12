<template>
  <aside v-if="compare.count > 0" class="compare-bar" aria-labelledby="compare-bar-title">
    <div class="compare-bar__inner">
      <!-- tabindex="-1" : reçoit le focus quand le bouton « Retirer » cliqué disparaît -->
      <h2 id="compare-bar-title" ref="titleRef" class="compare-bar__title" tabindex="-1">
        Comparer ({{ compare.count }}/{{ COMPARE_MAX }})
      </h2>

      <ul class="compare-bar__list">
        <li v-for="item in items" :key="item.id" class="compare-bar__item">
          <img
            v-if="item.product"
            :src="item.product.thumbnail"
            alt=""
            class="compare-bar__thumb"
            width="40"
            height="40"
          >
          <span v-else class="compare-bar__thumb compare-bar__thumb--empty" aria-hidden="true">?</span>
          <span class="compare-bar__name">{{ item.label }}</span>
          <button
            type="button"
            class="compare-bar__remove"
            :aria-label="`Retirer ${item.label} du comparateur`"
            @click="removeItem(item.id)"
          >
            <span aria-hidden="true">×</span>
          </button>
        </li>
      </ul>

      <NuxtLink :to="toComparePath(compare.ids)" class="btn btn--accent btn--sm compare-bar__link">
        Voir la comparaison
      </NuxtLink>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { CompareProduct } from '~/types/compare'
import { useCompareStore } from '~/stores/compare'
import { COMPARE_MAX, toComparePath } from '~/utils/compare'

interface CompareBarItem {
  id: number
  /** Absent si le produit n'a pas pu être chargé (erreur réseau). */
  product: CompareProduct | undefined
  label: string
}

const compare = useCompareStore()
const titleRef = ref<HTMLHeadingElement | null>(null)

/*
 * Chargé pendant le rendu serveur : les miniatures sont dans le HTML initial
 * et transmises au client avec l'état Pinia (aucune requête à l'hydratation).
 */
await useAsyncData('compare-bar-products', async (): Promise<true> => {
  await compare.loadProducts()
  return true
})

const items = computed<CompareBarItem[]>(() =>
  compare.ids.map((id) => {
    const product = compare.products[id]
    return { id, product, label: product?.title ?? `Produit n° ${id}` }
  }),
)

/**
 * Le bouton cliqué disparaît avec le produit : on replace le focus sur le
 * titre de la barre, ou sur le contenu de la page si la barre disparaît.
 */
async function removeItem(id: number): Promise<void> {
  compare.remove(id)
  await nextTick()
  if (titleRef.value) {
    titleRef.value.focus()
  } else {
    document.getElementById('contenu')?.focus()
  }
}
</script>

<style scoped>
/*
 * Collée en bas de l'écran pendant le défilement (sticky) mais placée à la
 * fin de la page : arrivé en bas, elle ne masque jamais le pied de page.
 */
.compare-bar {
  position: sticky;
  bottom: 0;
  z-index: 40;
  background: rgb(255 255 255 / 0.96);
  backdrop-filter: saturate(180%) blur(12px);
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -8px 24px rgb(17 24 39 / 0.08);
}

.compare-bar__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3) var(--space-4);
  max-width: var(--container-width);
  margin: 0 auto;
  padding: var(--space-3) var(--space-5);
}

.compare-bar__title {
  margin: 0;
  font-size: var(--text-base);
  white-space: nowrap;
  outline-offset: 4px;
}

.compare-bar__list {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: var(--space-2);
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.compare-bar__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  max-width: 190px;
  min-width: 0;
  padding: var(--space-1);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}

.compare-bar__thumb {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  object-fit: contain;
  background: var(--color-surface-muted);
  border-radius: 50%;
}

.compare-bar__thumb--empty {
  display: inline-grid;
  place-items: center;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.compare-bar__name {
  overflow: hidden;
  font-size: var(--text-sm);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compare-bar__remove {
  display: inline-grid;
  flex-shrink: 0;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--text-lg);
  line-height: 1;
  cursor: pointer;
  transition: background-color var(--transition), color var(--transition);
}

.compare-bar__remove:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

/*
 * Petits écrans : barre compacte (titre et lien sur une ligne, miniatures
 * en dessous) pour ne pas occuper l'écran. Les noms sont masqués ; chaque
 * bouton de retrait garde le nom du produit dans son aria-label.
 */
@media (max-width: 640px) {
  .compare-bar__inner {
    justify-content: space-between;
    gap: var(--space-2) var(--space-3);
    padding: var(--space-2) var(--space-4);
  }

  .compare-bar__list {
    flex-basis: 100%;
    flex-wrap: nowrap;
    order: 3;
  }

  .compare-bar__name {
    display: none;
  }
}
</style>
