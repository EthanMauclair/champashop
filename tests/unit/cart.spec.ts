import { describe, expect, it } from 'vitest'
import {
  MAX_CART_LINES,
  addCartItem,
  countCartItems,
  decodeCartCookie,
  encodeCartCookie,
  removeCartItem,
  setCartItemQuantity,
  toCartLines,
} from '../../app/utils/cart'
import type { CartItem, CartProduct } from '../../app/types/cart'

function product(overrides: Partial<CartProduct> = {}): CartProduct {
  return {
    id: 1,
    title: 'Mascara',
    price: 9.99,
    category: 'beauty',
    stock: 5,
    thumbnail: 'https://cdn.dummyjson.com/x.webp',
    ...overrides,
  }
}

describe('cookie du panier', () => {
  it('encode au format compact id-quantité séparé par _', () => {
    expect(encodeCartCookie([{ productId: 12, quantity: 3 }, { productId: 45, quantity: 1 }])).toBe('12-3_45-1')
    expect(encodeCartCookie([])).toBe('')
  })

  it('aller-retour encode -> decode sans perte', () => {
    const items: CartItem[] = [{ productId: 7, quantity: 2 }, { productId: 194, quantity: 10 }]
    expect(decodeCartCookie(encodeCartCookie(items))).toEqual(items)
  })

  it('reste très en dessous de 4 Ko même avec le nombre maximum de lignes', () => {
    const items = Array.from({ length: MAX_CART_LINES }, (_, i) => ({ productId: 1000 + i, quantity: 99 }))
    expect(encodeCartCookie(items).length).toBeLessThan(1000)
  })

  it('valeur absente, vide ou d\'un autre type : panier vide', () => {
    expect(decodeCartCookie(undefined)).toEqual([])
    expect(decodeCartCookie(null)).toEqual([])
    expect(decodeCartCookie('')).toEqual([])
    expect(decodeCartCookie(42)).toEqual([])
    expect(decodeCartCookie({ productId: 1 })).toEqual([])
  })

  it('ignore les entrées corrompues et fusionne les doublons', () => {
    expect(decodeCartCookie('1-2_abc_3-0_4--1_5-1.5_-1-2_1-3_6-1')).toEqual([
      { productId: 1, quantity: 5 },
      { productId: 6, quantity: 1 },
    ])
  })

  it('tronque au nombre maximum de lignes', () => {
    const raw = Array.from({ length: MAX_CART_LINES + 5 }, (_, i) => `${i + 1}-1`).join('_')
    expect(decodeCartCookie(raw)).toHaveLength(MAX_CART_LINES)
  })
})

describe('addCartItem', () => {
  it('ajoute un nouveau produit', () => {
    const result = addCartItem([], product())
    expect(result.ok).toBe(true)
    expect(result.items).toEqual([{ productId: 1, quantity: 1 }])
    expect(result.message).toContain('ajouté')
  })

  it('incrémente un produit déjà présent sans muter le tableau d\'origine', () => {
    const items: CartItem[] = [{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }]
    const result = addCartItem(items, product(), 2)
    expect(result.items).toEqual([{ productId: 1, quantity: 4 }, { productId: 2, quantity: 1 }])
    expect(items[0]).toEqual({ productId: 1, quantity: 2 })
  })

  it('plafonne au stock et explique pourquoi', () => {
    const result = addCartItem([{ productId: 1, quantity: 4 }], product({ stock: 5 }), 3)
    expect(result.ok).toBe(true)
    expect(result.items).toEqual([{ productId: 1, quantity: 5 }])
    expect(result.message).toContain('Il ne reste que 5')
  })

  it('refuse quand tout le stock est déjà dans le panier', () => {
    const items: CartItem[] = [{ productId: 1, quantity: 5 }]
    const result = addCartItem(items, product({ stock: 5 }))
    expect(result.ok).toBe(false)
    expect(result.items).toBe(items)
    expect(result.message).toContain('déjà tout le stock')
  })

  it('refuse un produit en rupture de stock', () => {
    const result = addCartItem([], product({ stock: 0 }))
    expect(result.ok).toBe(false)
    expect(result.items).toEqual([])
    expect(result.message).toContain('rupture de stock')
  })

  it('refuse une quantité nulle, négative ou non entière', () => {
    expect(addCartItem([], product(), 0).ok).toBe(false)
    expect(addCartItem([], product(), -1).ok).toBe(false)
    expect(addCartItem([], product(), 1.5).ok).toBe(false)
  })

  it('refuse un nouveau produit quand le nombre maximum de lignes est atteint', () => {
    const full = Array.from({ length: MAX_CART_LINES }, (_, i) => ({ productId: 100 + i, quantity: 1 }))
    const result = addCartItem(full, product({ id: 1 }))
    expect(result.ok).toBe(false)
    expect(result.message).toContain(`${MAX_CART_LINES}`)
    // mais on peut toujours augmenter un produit déjà présent
    expect(addCartItem(full, product({ id: 100 })).ok).toBe(true)
  })
})

describe('setCartItemQuantity', () => {
  const items: CartItem[] = [{ productId: 1, quantity: 2 }]

  it('modifie la quantité', () => {
    const result = setCartItemQuantity(items, product(), 4)
    expect(result).toEqual({ items: [{ productId: 1, quantity: 4 }], ok: true, message: null })
  })

  it('0 ou moins : supprime la ligne', () => {
    expect(setCartItemQuantity(items, product(), 0).items).toEqual([])
    expect(setCartItemQuantity(items, product(), -3).items).toEqual([])
  })

  it('au-delà du stock : plafonne et explique', () => {
    const result = setCartItemQuantity(items, product({ stock: 3 }), 10)
    expect(result.ok).toBe(false)
    expect(result.items).toEqual([{ productId: 1, quantity: 3 }])
    expect(result.message).toContain('Impossible de dépasser le stock')
  })

  it('valeur non entière (saisie invalide) : rien ne change', () => {
    const result = setCartItemQuantity(items, product(), Number.NaN)
    expect(result.ok).toBe(false)
    expect(result.items).toBe(items)
  })
})

describe('lecture du panier', () => {
  it('removeCartItem retire uniquement le produit visé', () => {
    expect(removeCartItem([{ productId: 1, quantity: 1 }, { productId: 2, quantity: 1 }], 1))
      .toEqual([{ productId: 2, quantity: 1 }])
  })

  it('countCartItems cumule les quantités', () => {
    expect(countCartItems([{ productId: 1, quantity: 2 }, { productId: 2, quantity: 3 }])).toBe(5)
    expect(countCartItems([])).toBe(0)
  })

  it('toCartLines convertit le prix en centimes et ignore les produits inconnus', () => {
    const lines = toCartLines(
      [{ productId: 1, quantity: 3 }, { productId: 99, quantity: 1 }],
      { 1: product({ price: 19.99 }) },
    )
    expect(lines).toEqual([{ productId: 1, category: 'beauty', unitPriceCents: 1999, quantity: 3 }])
  })
})
