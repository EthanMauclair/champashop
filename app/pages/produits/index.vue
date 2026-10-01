<template>
  <main class="container">
    <h1>Catalogue ChampaShop</h1>

    <!-- Recherche plein texte (debounce 300 ms) -->
    <form class="search-bar" role="search" @submit.prevent="applySearchNow">
      <label for="catalog-search" class="visually-hidden">Rechercher un produit</label>
      <input
        id="catalog-search"
        v-model="searchText"
        type="search"
        name="q"
        placeholder="Rechercher un produit (ex : Samsung, parfum…)"
        class="search-input"
        autocomplete="off"
        @input="debouncedSearch.run()"
      >
    </form>

    <!-- Filtres et tri -->
    <div class="filters-bar">
      <div class="filter-group">
        <label for="category">Catégorie</label>
        <select id="category" :value="filters.category" @change="onCategoryChange">
          <option value="">Toutes les catégories</option>
          <option v-for="cat in categories ?? []" :key="cat.slug" :value="cat.slug">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <fieldset class="filter-group price-group">
        <legend>Prix (€)</legend>
        <label for="min-price" class="visually-hidden">Prix minimum en euros</label>
        <input
          id="min-price"
          type="number"
          min="0"
          step="1"
          inputmode="decimal"
          placeholder="Min"
          :value="filters.minPrice ?? ''"
          class="price-input"
          @change="onPriceChange('minPrice', $event)"
        >
        <span aria-hidden="true">à</span>
        <label for="max-price" class="visually-hidden">Prix maximum en euros</label>
        <input
          id="max-price"
          type="number"
          min="0"
          step="1"
          inputmode="decimal"
          placeholder="Max"
          :value="filters.maxPrice ?? ''"
          class="price-input"
          @change="onPriceChange('maxPrice', $event)"
        >
      </fieldset>

      <div class="filter-group">
        <label for="sort">Trier par</label>
        <select id="sort" :value="sortValue" @change="onSortChange">
          <option value="">Pertinence</option>
          <option value="price-asc">Prix croissant</option>
          <option value="price-desc">Prix décroissant</option>
          <option value="title-asc">Nom (A-Z)</option>
          <option value="title-desc">Nom (Z-A)</option>
          <option value="rating-desc">Mieux notés</option>
          <option value="rating-asc">Moins bien notés</option>
        </select>
      </div>
    </div>

    <!-- Annonce du nombre de résultats pour les lecteurs d'écran -->
    <p class="results-count" role="status" aria-live="polite">
      <template v-if="status !== 'pending' && !error">
        {{ catalogPage.totalItems }} produit{{ catalogPage.totalItems > 1 ? 's' : '' }}
      </template>
    </p>

    <div v-if="status === 'pending'" class="product-grid" aria-busy="true" aria-label="Chargement des produits">
      <ProductSkeleton v-for="n in CATALOG_PAGE_SIZE" :key="n" />
    </div>

    <div v-else-if="error" class="error-state" role="alert">
      <p>Une erreur est survenue lors du chargement du catalogue.</p>
      <button type="button" class="retry-btn" @click="refresh()">Réessayer</button>
    </div>

    <div v-else-if="catalogPage.items.length === 0" class="empty-state">
      <p>Aucun produit ne correspond à vos critères.</p>
      <NuxtLink to="/produits" class="retry-btn">Réinitialiser les filtres</NuxtLink>
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
          class="page-link"
        >
          Précédent
        </NuxtLink>
        <span class="page-info" aria-current="page">Page {{ catalogPage.page }} sur {{ catalogPage.totalPages }}</span>
        <NuxtLink
          v-if="catalogPage.page < catalogPage.totalPages"
          :to="pageLink(catalogPage.page + 1)"
          rel="next"
          class="page-link"
        >
          Suivant
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
.container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
h1 { text-align: center; margin-bottom: 2rem; }
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 2rem; list-style: none; margin: 0; padding: 0; }
.pagination { display: flex; justify-content: center; align-items: center; margin-top: 3rem; gap: 1rem; }
.page-link, .retry-btn { display: inline-block; padding: 0.5rem 1rem; background-color: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; }
.page-link:hover, .retry-btn:hover { background-color: #34495e; }
.page-info { font-weight: bold; }
.results-count { min-height: 1.5rem; color: #4b5563; }
.error-state, .empty-state { text-align: center; padding: 3rem; background-color: #fff3f3; border-radius: 8px; border: 1px solid #ffcdd2; margin-top: 2rem; }
.empty-state { background-color: #f8f9fa; border-color: #e9ecef; }
.retry-btn { margin-top: 1rem; }
.filters-bar { display: flex; justify-content: space-between; align-items: center; background-color: #f8f9fa; padding: 1rem 2rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #eaeaea; flex-wrap: wrap; gap: 1rem; }
.filter-group { display: flex; align-items: center; gap: 0.5rem; }
.price-group { border: none; margin: 0; padding: 0; }
.price-group legend { float: left; margin-right: 0.5rem; padding: 0; }
select { padding: 0.5rem; border: 1px solid #9ca3af; border-radius: 4px; font-size: 1rem; }
.price-input { width: 80px; padding: 0.5rem; border: 1px solid #9ca3af; border-radius: 4px; }
.search-bar { margin-bottom: 1.5rem; display: flex; justify-content: center; }
.search-input { width: 100%; max-width: 600px; padding: 0.75rem 1rem; font-size: 1.1rem; border: 2px solid #d1d5db; border-radius: 8px; }
:focus-visible { outline: 3px solid #f39c12; outline-offset: 2px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
