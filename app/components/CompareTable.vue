<template>
  <!-- Zone défilante horizontalement sur mobile : focusable (tabindex) et
       nommée pour être parcourue au clavier et annoncée correctement. -->
  <div class="compare-table__scroll" role="region" aria-labelledby="compare-table-caption" tabindex="0">
    <table class="compare-table">
      <caption id="compare-table-caption" class="compare-table__caption">
        {{ caption }}
      </caption>
      <thead>
        <tr>
          <td class="compare-table__corner" />
          <th v-for="product in products" :key="product.id" scope="col" class="compare-table__product">
            <img
              :src="product.thumbnail"
              alt=""
              class="compare-table__image"
              width="160"
              height="160"
              loading="lazy"
            >
            <NuxtLink :to="`/produits/${product.id}`" class="compare-table__title">{{ product.title }}</NuxtLink>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in visibleRows" :key="row.key">
          <th scope="row" class="compare-table__label">{{ row.label }}</th>
          <td
            v-for="cell in row.cells"
            :key="cell.productId"
            class="compare-table__cell"
            :class="{ 'compare-table__cell--best': cell.best }"
          >
            {{ cell.text }}
            <!-- Libellé texte, pas seulement une couleur -->
            <span v-if="cell.best && row.bestLabel" class="compare-table__best">{{ row.bestLabel }}</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="visibleRows.length === 0" class="compare-table__empty">
      Aucune différence : ces produits ont les mêmes caractéristiques.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CompareRow, CompareTableProduct } from '~/types/compare'
import { buildCompareRows, filterCompareRows } from '~/utils/compare'

/**
 * Tableau comparatif accessible : vrai <table> avec <caption>, produits en
 * <th scope="col">, caractéristiques en <th scope="row">. Les lignes et les
 * meilleures valeurs sont calculées par des fonctions pures (utils/compare.ts).
 */
const props = defineProps<{
  products: CompareTableProduct[]
  /** Option « Afficher uniquement les différences ». */
  onlyDifferences: boolean
}>()

const rows = computed<CompareRow[]>(() => buildCompareRows(props.products))
const visibleRows = computed<CompareRow[]>(() => filterCompareRows(rows.value, props.onlyDifferences))

const caption = computed<string>(() => {
  const count = props.products.length
  const base = `Comparaison de ${count} produit${count > 1 ? 's' : ''}`
  return props.onlyDifferences ? `${base} (différences uniquement)` : base
})
</script>

<style scoped>
/*
 * Le défilement horizontal reste dans cette zone : la page elle-même ne
 * déborde jamais, même sur un écran de 320 px.
 */
.compare-table__scroll {
  max-width: 100%;
  overflow-x: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.compare-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: var(--text-sm);
}

.compare-table__caption {
  padding: var(--space-4) var(--space-4) var(--space-2);
  color: var(--color-text-muted);
  font-weight: 600;
  text-align: left;
}

.compare-table th,
.compare-table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  vertical-align: top;
}

.compare-table tbody tr:last-child > * {
  border-bottom: 0;
}

/* Première colonne figée pendant le défilement horizontal. */
.compare-table__corner,
.compare-table__label {
  position: sticky;
  left: 0;
  z-index: 1;
  width: 10rem;
  min-width: 8rem;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}

.compare-table__label {
  font-weight: 600;
}

.compare-table__product {
  min-width: 11rem;
  font-weight: 600;
}

.compare-table__image {
  width: 100%;
  max-width: 160px;
  height: auto;
  aspect-ratio: 1;
  margin-bottom: var(--space-2);
  object-fit: contain;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
}

.compare-table__title {
  color: var(--color-text);
  font-size: var(--text-base);
}

.compare-table__cell {
  min-width: 11rem;
}

.compare-table__cell--best {
  background: var(--color-success-soft);
  font-weight: 600;
}

.compare-table__best {
  display: inline-block;
  margin-left: var(--space-1);
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-success);
  color: #fff;
  font-size: var(--text-xs);
  font-weight: 700;
  white-space: nowrap;
}

.compare-table__empty {
  margin: 0;
  padding: var(--space-4);
  color: var(--color-text-muted);
}

@media (max-width: 640px) {
  .compare-table th,
  .compare-table td {
    padding: var(--space-2) var(--space-3);
  }

  .compare-table__corner,
  .compare-table__label {
    width: 7rem;
    min-width: 7rem;
  }

  .compare-table__product,
  .compare-table__cell {
    min-width: 9.5rem;
  }
}
</style>
