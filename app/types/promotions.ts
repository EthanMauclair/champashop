/**
 * Types du moteur de promotions (F4).
 * Tous les montants sont en centimes (entiers).
 */

/** Une ligne de panier telle que la voit le moteur de promotions. */
export interface CartLine {
  productId: number
  category: string
  unitPriceCents: number
  quantity: number
}

/** Identifiants des remises connues du moteur. */
export type DiscountId = 'BEAUTY_3' | 'TROYES10'

/** Une remise appliquée, avec un libellé lisible qui explique sa raison. */
export interface AppliedDiscount {
  id: DiscountId
  label: string
  amountCents: number
}

/** Résultat complet du calcul d'un panier. */
export interface CartSummary {
  grossCents: number
  discounts: AppliedDiscount[]
  shippingCents: number
  totalCents: number
  /** Messages pour l'utilisateur (ex. : pourquoi un code est refusé). */
  messages: string[]
}
