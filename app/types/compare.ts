import type { Product } from './dummyjson'

/**
 * Informations affichées dans la barre de comparaison (miniature + titre).
 * Elles ne sont PAS stockées dans le cookie `compare` (identifiants
 * uniquement) : elles viennent de la carte cliquée ou sont rechargées.
 */
export type CompareProduct = Pick<Product, 'id' | 'title' | 'thumbnail'>

/** Résultat de toggleCompare (signature imposée par le sujet). */
export interface CompareToggleResult {
  ids: number[]
  /** Vrai si l'ajout a été refusé parce que le comparateur est plein. */
  rejected: boolean
}

/** Champs d'un produit utiles au tableau comparatif (demandés via `?select=`). */
export type CompareTableProduct = Pick<
  Product,
  | 'id'
  | 'title'
  | 'thumbnail'
  | 'price'
  | 'discountPercentage'
  | 'rating'
  | 'availabilityStatus'
  | 'stock'
  | 'category'
  | 'weight'
  | 'dimensions'
  | 'warrantyInformation'
  | 'shippingInformation'
> &
  Partial<Pick<Product, 'brand'>>

/** Résultat du chargement des produits de la page /comparer. */
export interface CompareLoadResult {
  /** Produits chargés, dans l'ordre de l'URL. */
  products: CompareTableProduct[]
  /** Identifiants inexistants (404) : retirés de l'URL. */
  notFoundIds: number[]
  /** Identifiants dont le chargement a échoué (réseau…) : gardés dans l'URL. */
  failedIds: number[]
}

/** Caractéristiques comparées (une ligne du tableau chacune). */
export type CompareRowKey =
  | 'price'
  | 'discount'
  | 'rating'
  | 'availability'
  | 'stock'
  | 'brand'
  | 'category'
  | 'weight'
  | 'dimensions'
  | 'warranty'
  | 'shipping'

/** Une cellule du tableau : la valeur d'une caractéristique pour un produit. */
export interface CompareCell {
  productId: number
  text: string
  /** Meilleure valeur de la ligne (prix le plus bas, note la plus haute…). */
  best: boolean
}

/** Une ligne du tableau comparatif. */
export interface CompareRow {
  key: CompareRowKey
  label: string
  cells: CompareCell[]
  /** Libellé texte de la meilleure valeur (« Meilleur prix »), null si la ligne n'est pas comparable. */
  bestLabel: string | null
  /** Vrai si tous les produits ont la même valeur (masquée par « Afficher uniquement les différences »). */
  identical: boolean
}
