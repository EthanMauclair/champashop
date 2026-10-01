import type { Product } from './dummyjson'

/**
 * Ce qui est persisté dans le cookie : le strict nécessaire
 * (identifiant + quantité), pour rester loin de la limite de 4 Ko.
 */
export interface CartItem {
  productId: number
  quantity: number
}

/**
 * Informations produit utiles au panier. Elles ne sont PAS stockées dans
 * le cookie : elles viennent du catalogue ou sont rechargées depuis l'API.
 */
export type CartProduct = Pick<Product, 'id' | 'title' | 'price' | 'category' | 'stock' | 'thumbnail'>

/** Une ligne du panier prête à être affichée. */
export interface CartEntry {
  item: CartItem
  product: CartProduct
}

/** Résultat d'une opération sur le panier, avec un message explicatif. */
export interface CartUpdate {
  items: CartItem[]
  ok: boolean
  message: string | null
}
