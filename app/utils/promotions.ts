/**
 * Moteur de promotions (F4).
 *
 * Fonction pure TypeScript : aucune dépendance à Vue, Nuxt ou Pinia.
 * Elle est appelée par le store du panier et testée unitairement.
 *
 * ⚠️ DummyJSON ne gère pas les promotions : ce calcul est fait côté front
 * pour l'exercice. En production, il DOIT être refait côté serveur / API
 * (le client ne doit jamais être la source de vérité d'un prix).
 *
 * Règles, appliquées dans cet ordre :
 *  1. Remise beauté : >= 3 articles « beauty » -> -10 % par ligne beauty
 *     (arrondi au centime ligne par ligne, demi vers le haut).
 *  2. Code TROYES10 : -10,00 € si sous-total après remise beauté > 50,00 €.
 *  3. Plafond : total des remises <= 25 % du brut ; on réduit le code promo.
 *  4. Livraison : 4,90 €, offerte dès 80,00 € après remises, sauf meuble.
 */
import type { AppliedDiscount, CartLine, CartSummary } from '../types/promotions'
import { formatCents, percentOfCents } from './money'

export type { AppliedDiscount, CartLine, CartSummary, DiscountId } from '../types/promotions'

export const BEAUTY_CATEGORY = 'beauty'
export const BEAUTY_MIN_ITEMS = 3
export const BEAUTY_PERCENT = 10

export const PROMO_CODE = 'TROYES10'
export const PROMO_AMOUNT_CENTS = 1000
export const PROMO_MIN_SUBTOTAL_CENTS = 5000

export const DISCOUNT_CAP_PERCENT = 25

export const SHIPPING_CENTS = 490
export const FREE_SHIPPING_MIN_CENTS = 8000
export const NO_FREE_SHIPPING_CATEGORY = 'furniture'

/** Résultat intermédiaire d'une règle de code promo. */
interface PromoCodeResult {
  discount: AppliedDiscount | null
  message: string | null
}

function lineTotalCents(line: CartLine): number {
  return line.unitPriceCents * line.quantity
}

function hasCategory(line: CartLine, category: string): boolean {
  return line.category.toLowerCase() === category
}

/** Ne garde que les lignes exploitables (quantité entière strictement positive). */
function keepValidLines(lines: CartLine[]): CartLine[] {
  return lines.filter(line => Number.isInteger(line.quantity) && line.quantity > 0)
}

/** Normalise un code saisi : insensible à la casse et aux espaces autour. */
export function normalizePromoCode(promoCode?: string): string {
  return (promoCode ?? '').trim().toUpperCase()
}

/** Règle 1 : remise beauté. Renvoie null si elle ne s'applique pas. */
export function computeBeautyDiscount(lines: CartLine[]): AppliedDiscount | null {
  const beautyLines = lines.filter(line => hasCategory(line, BEAUTY_CATEGORY))
  const beautyQuantity = beautyLines.reduce((sum, line) => sum + line.quantity, 0)

  if (beautyQuantity < BEAUTY_MIN_ITEMS) {
    return null
  }

  // Arrondi ligne par ligne, puis somme des remises de chaque ligne.
  const amountCents = beautyLines.reduce(
    (sum, line) => sum + percentOfCents(lineTotalCents(line), BEAUTY_PERCENT),
    0,
  )

  return {
    id: 'BEAUTY_3',
    label: `Remise beauté −${BEAUTY_PERCENT} % (au moins ${BEAUTY_MIN_ITEMS} articles beauté)`,
    amountCents,
  }
}

/** Règle 2 : code promo, évalué sur le sous-total après remise beauté. */
export function computePromoCodeDiscount(
  subtotalAfterBeautyCents: number,
  promoCode?: string,
): PromoCodeResult {
  const code = normalizePromoCode(promoCode)

  if (code === '') {
    return { discount: null, message: null }
  }

  if (code !== PROMO_CODE) {
    return { discount: null, message: `Le code « ${promoCode?.trim()} » n'existe pas.` }
  }

  if (subtotalAfterBeautyCents <= PROMO_MIN_SUBTOTAL_CENTS) {
    return {
      discount: null,
      message:
        `Le code ${PROMO_CODE} est refusé : il faut un sous-total strictement supérieur à `
        + `${formatCents(PROMO_MIN_SUBTOTAL_CENTS)} après remise beauté `
        + `(actuellement ${formatCents(subtotalAfterBeautyCents)}).`,
    }
  }

  return {
    discount: {
      id: 'TROYES10',
      label: `Code ${PROMO_CODE} : −${formatCents(PROMO_AMOUNT_CENTS)} dès ${formatCents(PROMO_MIN_SUBTOTAL_CENTS)} d'achat`,
      amountCents: PROMO_AMOUNT_CENTS,
    },
    message: null,
  }
}

/** Règle 4 : frais de livraison. */
export function computeShippingCents(lines: CartLine[], amountAfterDiscountsCents: number): number {
  if (lines.length === 0) {
    return 0
  }
  const containsFurniture = lines.some(line => hasCategory(line, NO_FREE_SHIPPING_CATEGORY))
  if (!containsFurniture && amountAfterDiscountsCents >= FREE_SHIPPING_MIN_CENTS) {
    return 0
  }
  return SHIPPING_CENTS
}

export function computeCart(lines: CartLine[], promoCode?: string): CartSummary {
  const validLines = keepValidLines(lines)
  const messages: string[] = []

  const grossCents = validLines.reduce((sum, line) => sum + lineTotalCents(line), 0)

  // 1. Remise beauté
  const beautyDiscount = computeBeautyDiscount(validLines)
  const beautyCents = beautyDiscount?.amountCents ?? 0

  // 2. Code promo
  const promo = computePromoCodeDiscount(grossCents - beautyCents, promoCode)
  if (promo.message) {
    messages.push(promo.message)
  }

  // 3. Plafond : c'est le code promo qui est réduit en cas de dépassement.
  let promoDiscount = promo.discount
  const capCents = percentOfCents(grossCents, DISCOUNT_CAP_PERCENT)
  if (promoDiscount && beautyCents + promoDiscount.amountCents > capCents) {
    const reducedCents = Math.max(0, capCents - beautyCents)
    promoDiscount = {
      ...promoDiscount,
      label: `${promoDiscount.label} (réduit à ${formatCents(reducedCents)} : remises plafonnées à ${DISCOUNT_CAP_PERCENT} % du brut)`,
      amountCents: reducedCents,
    }
    messages.push(
      `Le code ${PROMO_CODE} a été réduit à ${formatCents(reducedCents)} : `
      + `le total des remises ne peut pas dépasser ${DISCOUNT_CAP_PERCENT} % du montant brut.`,
    )
  }

  const discounts = [beautyDiscount, promoDiscount].filter(
    (discount): discount is AppliedDiscount => discount !== null,
  )
  const discountsCents = discounts.reduce((sum, discount) => sum + discount.amountCents, 0)
  const afterDiscountsCents = grossCents - discountsCents

  // 4. Livraison
  const shippingCents = computeShippingCents(validLines, afterDiscountsCents)

  return {
    grossCents,
    discounts,
    shippingCents,
    totalCents: afterDiscountsCents + shippingCents,
    messages,
  }
}
