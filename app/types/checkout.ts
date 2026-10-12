import type { CartSummary } from './promotions'

/**
 * Types du tunnel de commande fictif (issue #32).
 * Aucun paiement réel : les données de carte ne quittent jamais le
 * navigateur et ne sont jamais stockées (ni store, ni cookie).
 */

/** Coordonnées et adresse de livraison saisies à l'étape 1. */
export interface CheckoutContact {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  addressComplement: string
  postalCode: string
  city: string
}

export type CheckoutContactField = keyof CheckoutContact

/** Messages d'erreur par champ : un champ absent est valide. */
export type FieldErrors<Field extends string> = Partial<Record<Field, string>>

/** Moyens de paiement proposés (tous fictifs). */
export type PaymentMethod = 'card' | 'paypal'

/** Champs du formulaire de carte bancaire (jamais persistés). */
export interface CardDetails {
  holder: string
  number: string
  /** Format MM/AA. */
  expiry: string
  cvc: string
}

export type CardField = keyof CardDetails

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'unknown'

/** Résultat du paiement simulé. */
export type PaymentOutcome = { ok: true } | { ok: false; message: string }

/** Une ligne de la commande, figée au moment du paiement. */
export interface OrderLine {
  productId: number
  title: string
  thumbnail: string
  quantity: number
  unitPriceCents: number
}

/** Commande confirmée, affichée sur la page de confirmation. */
export interface Order {
  number: string
  /** Date ISO de la commande. */
  createdAt: string
  contact: CheckoutContact
  lines: OrderLine[]
  summary: CartSummary
  /** Description lisible du paiement (ex. « Carte Visa •••• 4242 »), sans donnée sensible. */
  paymentLabel: string
}
