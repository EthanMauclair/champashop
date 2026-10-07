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
