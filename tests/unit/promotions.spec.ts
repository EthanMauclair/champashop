import { describe, expect, it } from 'vitest'
import {
  computeBeautyDiscount,
  computeCart,
  computePromoCodeDiscount,
  computeShippingCents,
  normalizePromoCode,
  type CartLine,
} from '../../app/utils/promotions'
import { eurosToCents, formatCents, percentOfCents, roundHalfUpDivide } from '../../app/utils/money'

let nextId = 1

/** Fabrique une ligne de panier à partir d'un prix en centimes. */
function line(quantity: number, category: string, unitPriceCents: number): CartLine {
  return { productId: nextId++, category, unitPriceCents, quantity }
}

function discountOf(lines: CartLine[], code: string | undefined, id: 'BEAUTY_3' | 'TROYES10'): number | undefined {
  return computeCart(lines, code).discounts.find(discount => discount.id === id)?.amountCents
}

describe('computeCart — scénarios d\'acceptation du sujet', () => {
  // # | Panier | Code | Brut | Beauté | Code | Livr. | Total
  const scenarios: Array<{
    n: number
    lines: CartLine[]
    code?: string
    gross: number
    beauty?: number
    promo?: number
    shipping: number
    total: number
    refused?: boolean
  }> = [
    { n: 1, lines: [line(3, 'beauty', 999)], gross: 2997, beauty: 300, shipping: 490, total: 3187 },
    { n: 2, lines: [line(3, 'beauty', 1999)], code: 'TROYES10', gross: 5997, beauty: 600, promo: 899, shipping: 490, total: 4988 },
    { n: 3, lines: [line(1, 'beauty', 3900), line(1, 'groceries', 1500)], code: 'TROYES10', gross: 5400, promo: 1000, shipping: 490, total: 4890 },
    { n: 4, lines: [line(1, 'furniture', 8999)], code: 'TROYES10', gross: 8999, promo: 1000, shipping: 490, total: 8489 },
    { n: 5, lines: [line(2, 'laptops', 4500)], code: 'TROYES10', gross: 9000, promo: 1000, shipping: 0, total: 8000 },
    { n: 6, lines: [line(4, 'beauty', 1250)], code: 'TROYES10', gross: 5000, beauty: 500, shipping: 490, total: 4990, refused: true },
    { n: 7, lines: [line(2, 'groceries', 3000)], code: ' troyes10 ', gross: 6000, promo: 1000, shipping: 490, total: 5490 },
    { n: 8, lines: [line(1, 'groceries', 7999)], gross: 7999, shipping: 490, total: 8489 },
  ]

  it.each(scenarios)('scénario $n', ({ lines, code, gross, beauty, promo, shipping, total, refused }) => {
    const summary = computeCart(lines, code)

    expect(summary.grossCents).toBe(gross)
    expect(discountOf(lines, code, 'BEAUTY_3')).toBe(beauty)
    expect(discountOf(lines, code, 'TROYES10')).toBe(promo)
    expect(summary.shippingCents).toBe(shipping)
    expect(summary.totalCents).toBe(total)

    if (refused) {
      expect(summary.messages.some(message => message.includes('refusé'))).toBe(true)
    }
  })
})

describe('computeCart — cas limites', () => {
  it('panier vide : tout est à zéro, pas de livraison', () => {
    expect(computeCart([])).toEqual({
      grossCents: 0,
      discounts: [],
      shippingCents: 0,
      totalCents: 0,
      messages: [],
    })
  })

  it('panier vide avec code : le code est refusé avec une explication', () => {
    const summary = computeCart([], 'TROYES10')
    expect(summary.discounts).toEqual([])
    expect(summary.totalCents).toBe(0)
    expect(summary.messages).toHaveLength(1)
    expect(summary.messages[0]).toContain('refusé')
  })

  it('code inconnu : aucune remise et message explicatif', () => {
    const summary = computeCart([line(2, 'groceries', 3000)], '  SOLDES  ')
    expect(summary.discounts).toEqual([])
    expect(summary.totalCents).toBe(6490)
    expect(summary.messages).toEqual(['Le code « SOLDES » n\'existe pas.'])
  })

  it('code vide ou uniquement des espaces : ignoré sans message', () => {
    expect(computeCart([line(1, 'groceries', 1000)], '   ').messages).toEqual([])
    expect(computeCart([line(1, 'groceries', 1000)], '').messages).toEqual([])
  })

  it('lignes à quantité 0, négative ou non entière : ignorées', () => {
    const summary = computeCart([
      line(0, 'beauty', 1000),
      line(-2, 'beauty', 1000),
      line(1.5, 'beauty', 1000),
      line(1, 'groceries', 1000),
    ])
    expect(summary.grossCents).toBe(1000)
    expect(summary.discounts).toEqual([])
    expect(summary.totalCents).toBe(1490)
  })

  it('panier ne contenant que des lignes à 0 : traité comme vide', () => {
    expect(computeCart([line(0, 'groceries', 1000)]).shippingCents).toBe(0)
  })

  it('remise beauté : 2 articles beauté ne suffisent pas', () => {
    expect(discountOf([line(2, 'beauty', 1000)], undefined, 'BEAUTY_3')).toBeUndefined()
  })

  it('remise beauté : quantités cumulées sur plusieurs lignes et arrondi ligne par ligne', () => {
    // 3 lignes à 0,05 € : 10 % = 0,5 centime par ligne, arrondi à 1 centime -> 3 centimes.
    // Un arrondi global aurait donné round(1,5 centime) = 2 centimes.
    const lines = [line(1, 'beauty', 5), line(1, 'beauty', 5), line(1, 'beauty', 5)]
    expect(discountOf(lines, undefined, 'BEAUTY_3')).toBe(3)
  })

  it('remise beauté : ne touche pas les lignes hors beauté et ignore la casse', () => {
    const lines = [line(3, 'Beauty', 1000), line(1, 'groceries', 1000)]
    expect(discountOf(lines, undefined, 'BEAUTY_3')).toBe(300)
  })

  it('code TROYES10 : refusé à exactement 50,00 € (strictement supérieur exigé)', () => {
    const summary = computeCart([line(1, 'groceries', 5000)], 'TROYES10')
    expect(summary.discounts).toEqual([])
    expect(summary.messages[0]).toContain('refusé')
  })

  it('code TROYES10 : accepté à 50,01 €', () => {
    expect(discountOf([line(1, 'groceries', 5001)], 'troyes10', 'TROYES10')).toBe(1000)
  })

  it('plafond : explique la réduction du code dans messages et dans le libellé', () => {
    const summary = computeCart([line(3, 'beauty', 1999)], 'TROYES10')
    const promo = summary.discounts.find(discount => discount.id === 'TROYES10')
    expect(promo?.label).toContain('réduit')
    expect(summary.messages.some(message => message.includes('25 %'))).toBe(true)
  })

  it('plafond : jamais dépassé, remises <= 25 % du brut', () => {
    // brut 57,00 ; beauté 5,70 ; sous-total 51,30 -> code accepté ; plafond 14,25
    // 5,70 + 10,00 = 15,70 > 14,25 -> le code est réduit à 8,55
    const lines = [line(3, 'beauty', 1900)]
    const summary = computeCart(lines, 'TROYES10')
    const totalDiscounts = summary.discounts.reduce((sum, discount) => sum + discount.amountCents, 0)
    expect(totalDiscounts).toBe(percentOfCents(summary.grossCents, 25))
    expect(discountOf(lines, 'TROYES10', 'TROYES10')).toBe(855)
    expect(summary.totalCents).toBe(5700 - 1425 + 490)
  })

  it('livraison : offerte à exactement 80,00 € après remises', () => {
    expect(computeCart([line(1, 'groceries', 8000)]).shippingCents).toBe(0)
  })

  it('livraison : payante à 79,99 € après remises', () => {
    expect(computeCart([line(1, 'groceries', 7999)]).shippingCents).toBe(490)
  })

  it('livraison : jamais offerte avec un meuble, même au-delà de 80,00 €', () => {
    const summary = computeCart([line(1, 'furniture', 20000), line(1, 'groceries', 1000)])
    expect(summary.shippingCents).toBe(490)
  })

  it('ne modifie pas les lignes reçues (fonction pure)', () => {
    const lines = [line(3, 'beauty', 1999)]
    const copy = structuredClone(lines)
    computeCart(lines, 'TROYES10')
    expect(lines).toEqual(copy)
  })
})

describe('règles isolées', () => {
  it('normalizePromoCode : trim + majuscules, undefined -> chaîne vide', () => {
    expect(normalizePromoCode('  troyes10 ')).toBe('TROYES10')
    expect(normalizePromoCode(undefined)).toBe('')
  })

  it('computeBeautyDiscount : null sans article beauté', () => {
    expect(computeBeautyDiscount([line(5, 'groceries', 100)])).toBeNull()
  })

  it('computePromoCodeDiscount : pas de code -> ni remise ni message', () => {
    expect(computePromoCodeDiscount(10000)).toEqual({ discount: null, message: null })
  })

  it('computeShippingCents : panier vide -> 0', () => {
    expect(computeShippingCents([], 0)).toBe(0)
  })
})

describe('utils/money', () => {
  it('roundHalfUpDivide arrondit demi vers le haut', () => {
    expect(roundHalfUpDivide(5, 10)).toBe(1) // 0,5 -> 1
    expect(roundHalfUpDivide(4, 10)).toBe(0) // 0,4 -> 0
    expect(roundHalfUpDivide(2997, 10)).toBe(300) // 299,7 -> 300
    expect(roundHalfUpDivide(5997 * 25, 100)).toBe(1499) // 1499,25 -> 1499
  })

  it('eurosToCents évite les erreurs de flottants', () => {
    expect(eurosToCents(19.99)).toBe(1999)
    expect(eurosToCents(0.1 + 0.2)).toBe(30)
  })

  it('formatCents formate en euros (fr-FR)', () => {
    expect(formatCents(1050).replace(/\s/g, ' ')).toBe('10,50 €')
  })
})
