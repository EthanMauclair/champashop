/**
 * Logique métier du panier (F3) en fonctions pures : aucune dépendance à
 * Vue, Nuxt ou Pinia. Le store `stores/cart.ts` ne fait qu'appeler ces
 * fonctions et persister le résultat ; elles sont testées unitairement.
 *
 * Toutes les fonctions renvoient un NOUVEAU tableau (pas de mutation).
 */
import type { CartItem, CartProduct, CartUpdate } from '../types/cart'
import type { CartLine } from '../types/promotions'
import { eurosToCents } from './money'

/** Nombre maximum de produits différents (garde-fou pour la taille du cookie). */
export const MAX_CART_LINES = 50

const ITEM_SEPARATOR = '_'
const FIELD_SEPARATOR = '-'

type StockInfo = Pick<CartProduct, 'id' | 'title' | 'stock'>

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

function findQuantity(items: CartItem[], productId: number): number {
  return items.find(item => item.productId === productId)?.quantity ?? 0
}

/** Remplace (ou ajoute en fin de liste) la quantité d'un produit. */
function withQuantity(items: CartItem[], productId: number, quantity: number): CartItem[] {
  const exists = items.some(item => item.productId === productId)
  if (!exists) {
    return [...items, { productId, quantity }]
  }
  return items.map(item => (item.productId === productId ? { productId, quantity } : item))
}

/* ------------------------------------------------------------------ */
/* Persistance compacte : « 12-3_45-1 » = produit 12 ×3, produit 45 ×1 */
/* ------------------------------------------------------------------ */

/**
 * Sérialise le panier pour le cookie. Format volontairement compact et
 * composé uniquement de caractères autorisés dans un cookie (chiffres,
 * « - » et « _ ») : ~8 octets par ligne, soit < 500 octets pour 50 lignes,
 * loin de la limite de 4 Ko. On ne stocke ni titre, ni prix, ni image.
 */
export function encodeCartCookie(items: CartItem[]): string {
  return items
    .map(item => `${item.productId}${FIELD_SEPARATOR}${item.quantity}`)
    .join(ITEM_SEPARATOR)
}

/**
 * Relit le cookie. La valeur vient du navigateur : elle peut être absente,
 * modifiée à la main ou corrompue, d'où le type `unknown` et la validation.
 * Les entrées invalides sont ignorées ; les doublons sont fusionnés.
 */
export function decodeCartCookie(raw: unknown): CartItem[] {
  if (typeof raw !== 'string' || raw === '') {
    return []
  }

  let items: CartItem[] = []
  for (const chunk of raw.split(ITEM_SEPARATOR)) {
    const [idPart, quantityPart] = chunk.split(FIELD_SEPARATOR)
    const productId = Number(idPart)
    const quantity = Number(quantityPart)
    if (!isPositiveInteger(productId) || !isPositiveInteger(quantity)) {
      continue
    }
    items = withQuantity(items, productId, findQuantity(items, productId) + quantity)
  }
  return items.slice(0, MAX_CART_LINES)
}

/* ------------------------------------------------------------------ */
/* Opérations                                                         */
/* ------------------------------------------------------------------ */

/**
 * Ajoute `quantity` exemplaires d'un produit. Le stock n'est jamais dépassé :
 * la quantité est plafonnée et un message explique pourquoi.
 */
export function addCartItem(items: CartItem[], product: StockInfo, quantity = 1): CartUpdate {
  if (!isPositiveInteger(quantity)) {
    return { items, ok: false, message: 'La quantité doit être un nombre entier supérieur à 0.' }
  }

  if (product.stock <= 0) {
    return { items, ok: false, message: `« ${product.title} » est en rupture de stock.` }
  }

  const current = findQuantity(items, product.id)
  if (current === 0 && items.length >= MAX_CART_LINES) {
    return {
      items,
      ok: false,
      message: `Le panier est limité à ${MAX_CART_LINES} produits différents.`,
    }
  }

  if (current >= product.stock) {
    return {
      items,
      ok: false,
      message: `Vous avez déjà tout le stock disponible de « ${product.title} » (${product.stock}) dans votre panier.`,
    }
  }

  const wanted = current + quantity
  if (wanted > product.stock) {
    return {
      items: withQuantity(items, product.id, product.stock),
      ok: true,
      message: `Il ne reste que ${product.stock} exemplaire(s) de « ${product.title} » : quantité limitée à ${product.stock}.`,
    }
  }

  return {
    items: withQuantity(items, product.id, wanted),
    ok: true,
    message: `« ${product.title} » a été ajouté au panier.`,
  }
}

/** Retire complètement un produit du panier. */
export function removeCartItem(items: CartItem[], productId: number): CartItem[] {
  return items.filter(item => item.productId !== productId)
}

/**
 * Fixe la quantité d'un produit déjà dans le panier.
 * 0 ou moins : la ligne est supprimée. Au-delà du stock : plafonnée + message.
 */
export function setCartItemQuantity(items: CartItem[], product: StockInfo, quantity: number): CartUpdate {
  if (!Number.isInteger(quantity)) {
    return { items, ok: false, message: 'La quantité doit être un nombre entier.' }
  }

  if (quantity <= 0) {
    return {
      items: removeCartItem(items, product.id),
      ok: true,
      message: `« ${product.title} » a été retiré du panier.`,
    }
  }

  if (quantity > product.stock) {
    return {
      items: withQuantity(items, product.id, product.stock),
      ok: false,
      message: `Impossible de dépasser le stock : seulement ${product.stock} exemplaire(s) disponible(s) pour « ${product.title} ».`,
    }
  }

  return { items: withQuantity(items, product.id, quantity), ok: true, message: null }
}

/* ------------------------------------------------------------------ */
/* Lecture                                                            */
/* ------------------------------------------------------------------ */

/** Nombre total d'articles (quantités cumulées). */
export function countCartItems(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

/**
 * Convertit le panier en lignes pour le moteur de promotions (F4).
 * Le prix unitaire est le champ `price` de DummyJSON, converti en centimes ;
 * `discountPercentage` n'est volontairement pas utilisé.
 * Les produits dont on ne connaît pas encore les infos sont ignorés.
 */
export function toCartLines(items: CartItem[], products: Record<number, CartProduct>): CartLine[] {
  const lines: CartLine[] = []
  for (const item of items) {
    const product = products[item.productId]
    if (product) {
      lines.push({
        productId: item.productId,
        category: product.category,
        unitPriceCents: eurosToCents(product.price),
        quantity: item.quantity,
      })
    }
  }
  return lines
}
