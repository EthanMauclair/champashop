<template>
  <main class="container">
    <header class="page-header catalog-header">
      <div>
        <h1 class="page-header__title">{{ currentCategoryName || 'Catalogue' }}</h1>
        <p class="page-header__subtitle">Beauté, maison, high-tech, épicerie… tout ChampaShop au même endroit.</p>
      </div>

      <!-- Recherche plein texte (debounce 300 ms) -->
      <form class="search" role="search" @submit.prevent="applySearchNow">
        <label for="catalog-search" class="visually-hidden">Rechercher un produit</label>
        <svg class="search__icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <input
          id="catalog-search"
          v-model="searchText"
          type="search"
          name="q"
          placeholder="Rechercher un produit, une marque…"
          class="input search__input"
          autocomplete="off"
          @input="debouncedSearch.run()"
        >
      </form>
    </header>

    <!-- Filtres et tri -->
    <div class="toolbar card">
      <div class="field">
        <label for="category" class="field__label">Catégorie</label>
        <select id="category" class="select" :value="filters.category" @change="onCategoryChange">
          <option value="">Toutes les catégories</option>
          <option v-for="cat in categories ?? []" :key="cat.slug" :value="cat.slug">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <fieldset class="field price-range">
        <legend class="field__label">Prix (€)</legend>
        <div class="price-range__inputs">
          <label for="min-price" class="visually-hidden">Prix minimum en euros</label>
          <input
            id="min-price"
            type="number"
            min="0"
            step="1"
            inputmode="decimal"
            placeholder="Min"
            :value="filters.minPrice ?? ''"
            class="input"
            @change="onPriceChange('minPrice', $event)"
          >
          <span aria-hidden="true">–</span>
          <label for="max-price" class="visually-hidden">Prix maximum en euros</label>
          <input
            id="max-price"
            type="number"
            min="0"
            step="1"
            inputmode="decimal"
            placeholder="Max"
            :value="filters.maxPrice ?? ''"
            class="input"
            @change="onPriceChange('maxPrice', $event)"
          >
        </div>
      </fieldset>

      <div class="field">
        <label for="sort" class="field__label">Trier par</label>
        <select id="sort" class="select" :value="sortValue" @change="onSortChange">
          <option value="">Pertinence</option>
          <option value="price-asc">Prix croissant</option>
          <option value="price-desc">Prix décroissant</option>
          <option value="title-asc">Nom (A-Z)</option>
          <option value="title-desc">Nom (Z-A)</option>
          <option value="rating-desc">Mieux notés</option>
          <option value="rating-asc">Moins bien notés</option>
        </select>
      </div>

      <NuxtLink v-if="hasActiveFilters" to="/produits" class="btn btn--secondary btn--sm toolbar__reset">
        Effacer les filtres
      </NuxtLink>
    </div>

    <!-- Annonce du nombre de résultats pour les lecteurs d'écran -->
    <p class="results-count" role="status" aria-live="polite">
      <template v-if="status !== 'pending' && !error">
        {{ catalogPage.totalItems }} produit{{ catalogPage.totalItems > 1 ? 's' : '' }}
        <template v-if="filters.q">pour « {{ filters.q }} »</template>
      </template>
    </p>

    <div v-if="status === 'pending'" class="product-grid" aria-busy="true" aria-label="Chargement des produits">
      <ProductSkeleton v-for="n in CATALOG_PAGE_SIZE" :key="n" />
    </div>

    <div v-else-if="error" class="state state--error" role="alert">
      <p>Une erreur est survenue lors du chargement du catalogue.</p>
      <button type="button" class="btn btn--primary" @click="refresh()">Réessayer</button>
    </div>

    <div v-else-if="catalogPage.items.length === 0" class="state">
      <p>Aucun produit ne correspond à vos critères.</p>
      <NuxtLink to="/produits" class="btn btn--primary">Réinitialiser les filtres</NuxtLink>
    </div>

    <template v-else>
      <ul class="product-grid">
        <li v-for="product in catalogPage.items" :key="product.id">
          <ProductCard :product="product" />
        </li>
      </ul>

      <!-- Vrais liens : la pagination reste utilisable sans JavaScript et par les robots -->
      <nav v-if="catalogPage.totalPages > 1" class="pagination" aria-label="Pagination du catalogue">
        <NuxtLink
          v-if="catalogPage.page > 1"
          :to="pageLink(catalogPage.page - 1)"
          rel="prev"
          class="btn btn--secondary btn--sm"
        >
          ← Précédent
        </NuxtLink>
        <span class="pagination__info" aria-current="page">Page {{ catalogPage.page }} sur {{ catalogPage.totalPages }}</span>
        <NuxtLink
          v-if="catalogPage.page < catalogPage.totalPages"
          :to="pageLink(catalogPage.page + 1)"
          rel="next"
          class="btn btn--secondary btn--sm"
        >
          Suivant →
        </NuxtLink>
      </nav>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type { CatalogFilters, CatalogPage, CatalogProduct } from '~/types/catalog'
import type { Category, ProductsResponse } from '~/types/dummyjson'
import {
  CATALOG_FIELDS,
  CATALOG_PAGE_SIZE,
  getCatalogPage,
  parseCatalogQuery,
  patchCatalogFilters,
  toCatalogQuery,
} from '~/utils/catalog'
import { useDebouncedCallback } from '~/composables/useDebouncedCallback'

const API_URL = 'https://dummyjson.com/products'
const SEARCH_DEBOUNCE_MS = 300

const route = useRoute()
const router = useRouter()

/** L'URL est la source de vérité : les filtres sont toujours relus depuis elle. */
const filters = computed<CatalogFilters>(() => parseCatalogQuery(route.query))

const { data: categories } = await useFetch<Category[]>(`${API_URL}/categories`, {
  key: 'catalog-categories',
})

/*
 * Une seule requête par catégorie (limit=0 + select) ; recherche, prix, tri et
 * pagination sont faits en mémoire (voir utils/catalog.ts et le README).
 * Quand la catégorie change pendant qu'une requête est en cours, useFetch
 * annule l'ancienne : une vieille réponse ne peut pas écraser la nouvelle.
 */
const productsUrl = computed<string>(() =>
  filters.value.category
    ? `${API_URL}/category/${encodeURIComponent(filters.value.category)}`
    : API_URL,
)

const { data, status, error, refresh } = await useFetch<ProductsResponse<CatalogProduct>>(productsUrl, {
  query: { limit: 0, select: CATALOG_FIELDS },
})

const catalogPage = computed<CatalogPage<CatalogProduct>>(() =>
  getCatalogPage(data.value?.products ?? [], filters.value),
)

const hasActiveFilters = computed<boolean>(() => Object.keys(toCatalogQuery({ ...filters.value, page: 1 })).length > 0)

// ---- navigation ---------------------------------------------------------

function applyFilters(patch: Partial<CatalogFilters>): void {
  router.push({ query: toCatalogQuery(patchCatalogFilters(filters.value, patch)) })
}

function pageLink(page: number): RouteLocationRaw {
  return { query: toCatalogQuery(patchCatalogFilters(filters.value, { page })) }
}

// ---- recherche ----------------------------------------------------------

const searchText = ref<string>(filters.value.q)

const debouncedSearch = useDebouncedCallback(() => applySearchNow(), SEARCH_DEBOUNCE_MS)

function applySearchNow(): void {
  debouncedSearch.cancel()
  const q = searchText.value.trim()
  if (q !== filters.value.q) {
    applyFilters({ q })
  }
}

// Bouton retour / lien partagé : le champ suit l'URL.
watch(() => filters.value.q, (q) => {
  if (q !== searchText.value.trim()) {
    searchText.value = q
  }
})

// ---- filtres et tri -----------------------------------------------------

const sortValue = computed<string>(() =>
  filters.value.sortBy ? `${filters.value.sortBy}-${filters.value.order}` : '',
)

function onCategoryChange(event: Event): void {
  if (event.target instanceof HTMLSelectElement) {
    applyFilters({ category: event.target.value })
  }
}

function onPriceChange(key: 'minPrice' | 'maxPrice', event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const raw = event.target.value === '' ? null : Number(event.target.value)
  const price = raw !== null && Number.isFinite(raw) && raw >= 0 ? raw : null
  applyFilters(key === 'minPrice' ? { minPrice: price } : { maxPrice: price })
}

function onSortChange(event: Event): void {
  if (!(event.target instanceof HTMLSelectElement)) {
    return
  }
  const [sortBy, order] = event.target.value.split('-')
  const parsed = parseCatalogQuery({ sortBy, order })
  applyFilters({ sortBy: parsed.sortBy, order: parsed.order })
}

// ---- SEO ----------------------------------------------------------------

const currentCategoryName = computed<string>(() =>
  categories.value?.find(cat => cat.slug === filters.value.category)?.name ?? '',
)

useSeoMeta({
  title: () => [
    currentCategoryName.value || 'Catalogue',
    catalogPage.value.page > 1 ? `page ${catalogPage.value.page}` : '',
    'ChampaShop',
  ].filter(Boolean).join(' – '),
  description: () => `Découvrez ${catalogPage.value.totalItems} produits ${currentCategoryName.value ? `de la catégorie ${currentCategoryName.value} ` : ''}sur ChampaShop : recherche, filtres par prix et tri.`,
  ogTitle: 'Catalogue ChampaShop',
  ogDescription: 'Tous les produits ChampaShop : recherche, filtres par catégorie et par prix.',
  ogType: 'website',
})
</script>

<style scoped>
.catalog-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-5);
}

.search {
  position: relative;
  flex: 1 1 320px;
  max-width: 440px;
}

.search__icon {
  position: absolute;
  top: 50%;
  left: var(--space-3);
  color: var(--color-text-muted);
  transform: translateY(-50%);
  pointer-events: none;
}

.search__input {
  padding-left: 2.5rem;
  border-radius: var(--radius-full);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-4);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}

.toolbar .field {
  flex: 1 1 180px;
}

.price-range {
  margin: 0;
  padding: 0;
  border: none;
  min-width: 0;
}

.price-range legend {
  padding: 0;
  margin-bottom: var(--space-1);
}

.price-range__inputs {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
}

.price-range__inputs .input {
  min-width: 0;
}

.toolbar__reset {
  flex: 0 0 auto;
  margin-bottom: 4px;
}

.results-count {
  min-height: 1.5rem;
  margin: 0 0 var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-7);
}

.pagination__info {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: 600;
}
</style>
