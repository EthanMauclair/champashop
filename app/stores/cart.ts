/**
 * Store Pinia du panier (F3).
 *
 * Rôle du store : garder l'état réactif, le persister dans des cookies et
 * relier l'interface à la logique métier. Les règles (stock, promotions…)
 * vivent dans des fonctions pures de `utils/` (cart.ts, promotions.ts).
 *
 * Persistance : `useCookie` est lu côté serveur, donc le panier est présent
 * dès le rendu SSR (pas de « flash » de panier vide).
 */
import { defineStore } from 'pinia'
import { useCookie } from '#app'
import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { CartEntry, CartItem, CartProduct, CartUpdate } from '../types/cart'
import type { CartLine, CartSummary } from '../types/promotions'
import {
  addCartItem,
  countCartItems,
  decodeCartCookie,
  encodeCartCookie,
  removeCartItem,
  setCartItemQuantity,
  toCartLines,
} from '../utils/cart'
import { computeCart } from '../utils/promotions'

const CART_COOKIE = 'champashop_cart'
const PROMO_COOKIE = 'champashop_promo'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 jours
const PROMO_CODE_MAX_LENGTH = 30

const DUMMYJSON_PRODUCTS_URL = 'https://dummyjson.com/products'
/** On ne demande à l'API que les champs utiles au panier. */
const CART_PRODUCT_FIELDS = 'title,price,category,stock,thumbnail'

/** Type de retour explicite du store (exigé par les consignes). */
export interface CartStore {
  // état
  items: Ref<CartItem[]>
  products: Ref<Record<number, CartProduct>>
  promoCode: Ref<string>
  notices: Ref<string[]>
  // valeurs calculées
  itemCount: ComputedRef<number>
  entries: ComputedRef<CartEntry[]>
  lines: ComputedRef<CartLine[]>
  summary: ComputedRef<CartSummary>
  // actions
  add: (product: CartProduct, quantity?: number) => CartUpdate
  setQuantity: (productId: number, quantity: number) => CartUpdate
  remove: (productId: number) => void
  clear: () => void
  applyPromoCode: (code: string) => void
  removePromoCode: () => void
  loadProducts: () => Promise<void>
}

/** Vrai si l'erreur est une réponse HTTP 404 de $fetch (produit supprimé). */
function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object'
    && error !== null
    && 'statusCode' in error
    && error.statusCode === 404
  )
}

export const useCartStore = defineStore('cart', (): CartStore => {
  const cartCookie = useCookie<string>(CART_COOKIE, {
    default: () => '',
    maxAge: COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
    path: '/',
    // Le format de encodeCartCookie est déjà sûr pour un cookie :
    // pas besoin du JSON + encodage URL par défaut (qui triple la taille).
    encode: (value: string): string => value,
    decode: (value: string): string => value,
  })
  const promoCookie = useCookie<string>(PROMO_COOKIE, {
    default: () => '',
    maxAge: COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
    path: '/',
  })

  // ---- état -------------------------------------------------------------
  const items = ref<CartItem[]>(decodeCartCookie(cartCookie.value))
  const products = ref<Record<number, CartProduct>>({})
  const promoCode = ref<string>(String(promoCookie.value ?? '').slice(0, PROMO_CODE_MAX_LENGTH))
  /** Ajustements faits automatiquement (stock baissé, produit supprimé…). */
  const notices = ref<string[]>([])

  // ---- valeurs calculées ------------------------------------------------
  const itemCount = computed<number>(() => countCartItems(items.value))

  const entries = computed<CartEntry[]>(() =>
    items.value.flatMap((item) => {
      const product = products.value[item.productId]
      return product ? [{ item, product }] : []
    }),
  )

  const lines = computed<CartLine[]>(() => toCartLines(items.value, products.value))

  const summary = computed<CartSummary>(() => computeCart(lines.value, promoCode.value))

  // ---- persistance ------------------------------------------------------
  function persist(nextItems: CartItem[]): void {
    items.value = nextItems
    cartCookie.value = encodeCartCookie(nextItems)
  }

  function rememberProduct(product: CartProduct): void {
    products.value = {
      ...products.value,
      [product.id]: {
        id: product.id,
        title: product.title,
        price: product.price,
        category: product.category,
        stock: product.stock,
        thumbnail: product.thumbnail,
      },
    }
  }

  // ---- actions ----------------------------------------------------------
  function add(product: CartProduct, quantity = 1): CartUpdate {
    rememberProduct(product)
    const result = addCartItem(items.value, product, quantity)
    persist(result.items)
    return result
  }

  function setQuantity(productId: number, quantity: number): CartUpdate {
    const product = products.value[productId]
    if (!product) {
      return { items: items.value, ok: false, message: 'Produit introuvable dans le panier.' }
    }
    const result = setCartItemQuantity(items.value, product, quantity)
    persist(result.items)
    return result
  }

  function remove(productId: number): void {
    persist(removeCartItem(items.value, productId))
  }

  function clear(): void {
    persist([])
    removePromoCode()
  }

  function applyPromoCode(code: string): void {
    promoCode.value = code.trim().slice(0, PROMO_CODE_MAX_LENGTH)
    promoCookie.value = promoCode.value
  }

  function removePromoCode(): void {
    promoCode.value = ''
    promoCookie.value = ''
  }

  /**
   * Charge depuis DummyJSON les produits du panier dont on n'a pas les infos
   * (cas d'un rechargement de page : le cookie ne contient que id + quantité).
   * - Produit supprimé (404) : retiré du panier, avec une explication.
   * - Stock devenu insuffisant : quantité ramenée au stock, avec une explication.
   * - Autre erreur (réseau…) : l'erreur est relancée pour que la page
   *   affiche un état d'erreur avec « Réessayer ».
   */
  async function loadProducts(): Promise<void> {
    const missingIds = items.value
      .map(item => item.productId)
      .filter(id => !products.value[id])

    const results = await Promise.allSettled(
      missingIds.map(id =>
        $fetch<CartProduct>(`${DUMMYJSON_PRODUCTS_URL}/${id}`, {
          query: { select: CART_PRODUCT_FIELDS },
        }),
      ),
    )

    let nextItems = items.value
    const nextNotices: string[] = []
    const failures: unknown[] = []

    for (const [index, result] of results.entries()) {
      const id = missingIds[index]
      if (id === undefined) {
        continue
      }
      if (result.status === 'fulfilled') {
        // On force l'id demandé : on ne dépend pas de sa présence dans `select`.
        rememberProduct({ ...result.value, id })
      }
      else if (isNotFoundError(result.reason)) {
        nextItems = removeCartItem(nextItems, id)
        nextNotices.push(`Un produit (n° ${id}) n'existe plus et a été retiré de votre panier.`)
      }
      else {
        failures.push(result.reason)
      }
    }

    // Le stock a pu baisser depuis l'ajout : on ne dépasse jamais le stock.
    for (const item of nextItems) {
      const product = products.value[item.productId]
      if (product && item.quantity > product.stock) {
        const update = setCartItemQuantity(nextItems, product, product.stock)
        nextItems = update.items
        nextNotices.push(
          product.stock > 0
            ? `Le stock de « ${product.title} » a baissé : quantité ramenée à ${product.stock}.`
            : `« ${product.title} » est en rupture de stock et a été retiré de votre panier.`,
        )
      }
    }

    notices.value = nextNotices
    persist(nextItems)

    if (failures.length > 0) {
      throw failures[0]
    }
  }

  return {
    items,
    products,
    promoCode,
    notices,
    itemCount,
    entries,
    lines,
    summary,
    add,
    setQuantity,
    remove,
    clear,
    applyPromoCode,
    removePromoCode,
    loadProducts,
  }
})
