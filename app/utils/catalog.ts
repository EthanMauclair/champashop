/**
 * Logique du catalogue (F1) en fonctions pures : lecture/écriture des query
 * params, recherche plein texte, filtres, tri et pagination.
 * Aucune dépendance à Vue ou Nuxt : testé dans tests/unit/catalog.spec.ts.
 *
 * Stratégie (voir README) : DummyJSON ne sait pas filtrer par prix ni
 * combiner recherche + catégorie. On charge donc en une seule requête tous
 * les produits de la catégorie (`limit=0`), en ne demandant que les champs
 * utiles (`select`), puis on filtre, trie et pagine ici, côté Nuxt.
 */
import type { CatalogFilters, CatalogPage, CatalogSortField, SortOrder } from '../types/catalog'
import type { Product } from '../types/dummyjson'

export const CATALOG_PAGE_SIZE = 12

/** Champs demandés à l'API (réduit fortement le poids de la réponse). */
export const CATALOG_FIELDS = 'title,description,category,price,discountPercentage,rating,stock,tags,brand,thumbnail'

const SORT_FIELDS: readonly CatalogSortField[] = ['price', 'rating', 'title']

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  page: 1,
  q: '',
  category: '',
  sortBy: null,
  order: 'asc',
  minPrice: null,
  maxPrice: null,
}

/* ------------------------------------------------------------------ */
/* URL <-> filtres                                                    */
/* ------------------------------------------------------------------ */

/** Un query param peut être absent, une chaîne, null ou un tableau. */
function firstString(value: unknown): string {
  if (Array.isArray(value)) {
    return firstString(value[0])
  }
  return typeof value === 'string' ? value.trim() : ''
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(firstString(value))
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parsePrice(value: unknown): number | null {
  const raw = firstString(value).replace(',', '.')
  if (raw === '') {
    return null
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function isSortField(value: string): value is CatalogSortField {
  return (SORT_FIELDS as readonly string[]).includes(value)
}

/**
 * Reconstruit les filtres à partir des query params de l'URL.
 * Toute valeur invalide (page « abc », prix négatif, tri inconnu…) est
 * remplacée par la valeur par défaut au lieu de casser la page.
 */
export function parseCatalogQuery(query: Record<string, unknown>): CatalogFilters {
  const sortBy = firstString(query.sortBy)
  return {
    page: parsePositiveInteger(query.page, DEFAULT_CATALOG_FILTERS.page),
    q: firstString(query.q),
    category: firstString(query.category),
    sortBy: isSortField(sortBy) ? sortBy : null,
    order: firstString(query.order) === 'desc' ? 'desc' : 'asc',
    minPrice: parsePrice(query.minPrice),
    maxPrice: parsePrice(query.maxPrice),
  }
}

/**
 * Inverse de parseCatalogQuery : produit les query params à mettre dans
 * l'URL, en omettant les valeurs par défaut pour garder des URL courtes.
 */
export function toCatalogQuery(filters: CatalogFilters): Record<string, string> {
  const query: Record<string, string> = {}
  if (filters.q) query.q = filters.q
  if (filters.category) query.category = filters.category
  if (filters.sortBy) {
    query.sortBy = filters.sortBy
    query.order = filters.order
  }
  if (filters.minPrice !== null) query.minPrice = String(filters.minPrice)
  if (filters.maxPrice !== null) query.maxPrice = String(filters.maxPrice)
  if (filters.page > 1) query.page = String(filters.page)
  return query
}

/**
 * Applique une modification aux filtres. Tout changement autre que la page
 * ramène à la page 1 (sinon on pourrait atterrir sur une page vide).
 */
export function patchCatalogFilters(filters: CatalogFilters, patch: Partial<CatalogFilters>): CatalogFilters {
  const pageOnly = Object.keys(patch).every(key => key === 'page')
  return { ...filters, ...patch, page: pageOnly ? (patch.page ?? filters.page) : 1 }
}

/* ------------------------------------------------------------------ */
/* Recherche, filtres, tri, pagination                                */
/* ------------------------------------------------------------------ */

type SearchableProduct = Pick<Product, 'title' | 'category'>
  & Partial<Pick<Product, 'description' | 'brand' | 'tags'>>

/** Minuscules et sans accents : « Crème » et « creme » se valent. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Recherche plein texte : chaque mot saisi doit apparaître dans le titre,
 * la description, la marque, la catégorie ou les tags du produit.
 */
export function matchesSearch(product: SearchableProduct, search: string): boolean {
  const terms = normalizeText(search).split(/\s+/).filter(term => term !== '')
  if (terms.length === 0) {
    return true
  }
  const haystack = normalizeText([
    product.title,
    product.description ?? '',
    product.brand ?? '',
    product.category,
    ...(product.tags ?? []),
  ].join(' '))
  return terms.every(term => haystack.includes(term))
}

export function filterProducts<T extends SearchableProduct & Pick<Product, 'price'>>(
  products: T[],
  filters: Pick<CatalogFilters, 'q' | 'minPrice' | 'maxPrice'>,
): T[] {
  return products.filter(product =>
    matchesSearch(product, filters.q)
    && (filters.minPrice === null || product.price >= filters.minPrice)
    && (filters.maxPrice === null || product.price <= filters.maxPrice),
  )
}

/** Trie sans modifier le tableau reçu. `sortBy` null = ordre de l'API. */
export function sortProducts<T extends Pick<Product, 'price' | 'rating' | 'title'>>(
  products: T[],
  sortBy: CatalogSortField | null,
  order: SortOrder,
): T[] {
  if (sortBy === null) {
    return [...products]
  }
  const direction = order === 'asc' ? 1 : -1
  return [...products].sort((a, b) => {
    const comparison = sortBy === 'title'
      ? a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' })
      : a[sortBy] - b[sortBy]
    return comparison * direction
  })
}

/** Découpe en pages ; une page hors limites est ramenée dans [1, totalPages]. */
export function paginateItems<T>(items: T[], page: number, pageSize = CATALOG_PAGE_SIZE): CatalogPage<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    totalItems: items.length,
  }
}

/** Pipeline complet : filtres -> tri -> pagination. */
export function getCatalogPage<T extends SearchableProduct & Pick<Product, 'price' | 'rating'>>(
  products: T[],
  filters: CatalogFilters,
): CatalogPage<T> {
  const filtered = filterProducts(products, filters)
  const sorted = sortProducts(filtered, filters.sortBy, filters.order)
  return paginateItems(sorted, filters.page)
}
