import type { Product } from './dummyjson'

/**
 * Informations affichées pour un produit « vu récemment ».
 * Elles ne sont PAS stockées dans le cookie (identifiants uniquement) :
 * elles viennent de la fiche produit visitée ou sont rechargées depuis l'API.
 */
export type RecentProduct = Pick<Product, 'id' | 'title' | 'price' | 'thumbnail' | 'category'>
