import type { Product } from './dummyjson'

/** Champs triables du catalogue (paramètre d'URL `sortBy`). */
export type CatalogSortField = 'price' | 'rating' | 'title'

/** Sens du tri (paramètre d'URL `order`). */
export type SortOrder = 'asc' | 'desc'

/**
 * État complet de la vue catalogue. L'URL est la source de vérité :
 * cet objet est toujours reconstruit à partir des query params.
 */
export interface CatalogFilters {
  page: number
  /** Recherche plein texte (`q`). Chaîne vide = pas de recherche. */
  q: string
  /** Slug de catégorie DummyJSON. Chaîne vide = toutes. */
  category: string
  sortBy: CatalogSortField | null
  order: SortOrder
  /** Bornes de prix en euros, `null` = pas de borne. */
  minPrice: number | null
  maxPrice: number | null
}

/** Champs d'un produit utiles au catalogue (demandés via `?select=`). */
export type CatalogProduct = Pick<
  Product,
  'id' | 'title' | 'description' | 'category' | 'price' | 'discountPercentage'
  | 'rating' | 'stock' | 'tags' | 'brand' | 'thumbnail'
>

/** Une page de résultats prête à afficher. */
export interface CatalogPage<T> {
  items: T[]
  /** Page réellement affichée (bornée entre 1 et totalPages). */
  page: number
  totalPages: number
  totalItems: number
}
