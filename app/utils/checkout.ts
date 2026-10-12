/**
 * Logique du tunnel de commande fictif (issue #32) en fonctions pures :
 * validation des coordonnées et du paiement, paiement simulé, numéro de
 * commande. Aucune dépendance à Vue ou Nuxt : testé dans
 * tests/unit/checkout.spec.ts.
 */
import type { CartEntry } from '../types/cart'
import type {
  CardBrand,
  CardDetails,
  CardField,
  CheckoutContact,
  CheckoutContactField,
  FieldErrors,
  OrderLine,
  PaymentOutcome,
} from '../types/checkout'
import { eurosToCents } from './money'

/** Carte de test acceptée, affichée sur la page de paiement. */
export const TEST_CARD_ACCEPTED = '4242 4242 4242 4242'
/** Carte de test refusée, pour tester le parcours d'échec. */
export const TEST_CARD_DECLINED = '4000 0000 0000 0002'

export const PAYMENT_DECLINED_MESSAGE =
  "Paiement refusé par la banque (carte de test refusée). Aucun montant n'a été débité : essayez une autre carte."

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Téléphone français : 0X XX XX XX XX ou +33 X XX XX XX XX. */
const PHONE_PATTERN = /^(?:\+33|0)[1-9]\d{8}$/
const POSTAL_CODE_PATTERN = /^\d{5}$/

/** Coordonnées vides (formulaire de départ). */
export function emptyContact(): CheckoutContact {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    addressComplement: '',
    postalCode: '',
    city: '',
  }
}

/** Garde uniquement les chiffres (espaces, tirets, points retirés). */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/** Vrai si l'objet d'erreurs ne contient aucun message. */
export function hasErrors<Field extends string>(errors: FieldErrors<Field>): boolean {
  return Object.values(errors).some((message) => Boolean(message))
}

/** Valide l'adresse e-mail (format simple, suffisant pour une démonstration). */
export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

/**
 * Valide les coordonnées de l'étape 1. Tous les champs sont obligatoires
 * sauf le complément d'adresse. Renvoie un message par champ invalide.
 */
export function validateContact(contact: CheckoutContact): FieldErrors<CheckoutContactField> {
  const errors: FieldErrors<CheckoutContactField> = {}
  const required: [CheckoutContactField, string][] = [
    ['firstName', 'Indiquez votre prénom.'],
    ['lastName', 'Indiquez votre nom.'],
    ['email', 'Indiquez votre adresse e-mail.'],
    ['phone', 'Indiquez votre numéro de téléphone.'],
    ['address', 'Indiquez votre adresse.'],
    ['postalCode', 'Indiquez votre code postal.'],
    ['city', 'Indiquez votre ville.'],
  ]
  for (const [field, message] of required) {
    if (contact[field].trim() === '') {
      errors[field] = message
    }
  }

  if (!errors.email && !isValidEmail(contact.email)) {
    errors.email = 'Adresse e-mail invalide (exemple : nom@domaine.fr).'
  }
  const phone = contact.phone.replace(/[\s.-]/g, '')
  if (!errors.phone && !PHONE_PATTERN.test(phone)) {
    errors.phone = 'Numéro invalide : 10 chiffres commençant par 0 (exemple : 06 12 34 56 78).'
  }
  if (!errors.postalCode && !POSTAL_CODE_PATTERN.test(contact.postalCode.trim())) {
    errors.postalCode = 'Code postal invalide : 5 chiffres (exemple : 10000).'
  }
  return errors
}

/** Algorithme de Luhn : détecte les fautes de frappe dans un numéro de carte. */
export function isLuhnValid(digits: string): boolean {
  if (!/^\d+$/.test(digits)) {
    return false
  }
  let sum = 0
  for (let index = 0; index < digits.length; index++) {
    let digit = Number(digits[digits.length - 1 - index])
    if (index % 2 === 1) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }
    sum += digit
  }
  return sum % 10 === 0
}

/** Réseau de la carte d'après ses premiers chiffres. */
export function detectCardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) {
    return 'visa'
  }
  if (/^(?:5[1-5]|2(?:22[1-9]|2[3-9]\d|[3-6]\d{2}|7[01]\d|720))/.test(digits)) {
    return 'mastercard'
  }
  if (/^3[47]/.test(digits)) {
    return 'amex'
  }
  return 'unknown'
}

const CARD_BRAND_LABELS: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  unknown: 'bancaire',
}

/** Nom lisible du réseau (« Visa », « Mastercard »…). */
export function cardBrandLabel(brand: CardBrand): string {
  return CARD_BRAND_LABELS[brand]
}

/** Formate le numéro par groupes de 4 pendant la saisie (19 chiffres maximum). */
export function formatCardNumber(value: string): string {
  return digitsOnly(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
}

/** Formate la date d'expiration en MM/AA pendant la saisie. */
export function formatExpiry(value: string): string {
  const digits = digitsOnly(value).slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

/** Lit une date MM/AA. Renvoie null si le format ou le mois est invalide. */
export function parseExpiry(value: string): { month: number; year: number } | null {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(value.trim())
  if (!match) {
    return null
  }
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  return month >= 1 && month <= 12 ? { month, year } : null
}

/** Une carte reste valable jusqu'au dernier jour de son mois d'expiration. */
export function isExpired(expiry: { month: number; year: number }, now: Date): boolean {
  const currentMonthIndex = now.getFullYear() * 12 + now.getMonth()
  const expiryMonthIndex = expiry.year * 12 + (expiry.month - 1)
  return expiryMonthIndex < currentMonthIndex
}

/**
 * Valide le formulaire de carte. `now` est passé en paramètre pour que
 * la fonction reste pure (et testable à une date fixe).
 */
export function validateCard(card: CardDetails, now: Date): FieldErrors<CardField> {
  const errors: FieldErrors<CardField> = {}
  const digits = digitsOnly(card.number)
  const brand = detectCardBrand(digits)

  if (card.holder.trim() === '') {
    errors.holder = 'Indiquez le nom inscrit sur la carte.'
  }

  if (digits === '') {
    errors.number = 'Indiquez le numéro de la carte.'
  } else if (digits.length < 13 || digits.length > 19 || !isLuhnValid(digits)) {
    errors.number = 'Numéro de carte invalide : vérifiez les chiffres saisis.'
  }

  const expiry = parseExpiry(card.expiry)
  if (card.expiry.trim() === '') {
    errors.expiry = "Indiquez la date d'expiration."
  } else if (!expiry) {
    errors.expiry = 'Date invalide : utilisez le format MM/AA (exemple : 08/29).'
  } else if (isExpired(expiry, now)) {
    errors.expiry = 'Cette carte est expirée.'
  }

  const cvcLength = brand === 'amex' ? 4 : 3
  if (card.cvc.trim() === '') {
    errors.cvc = 'Indiquez le cryptogramme.'
  } else if (!new RegExp(`^\\d{${cvcLength}}$`).test(card.cvc.trim())) {
    errors.cvc = `Le cryptogramme comporte ${cvcLength} chiffres.`
  }
  return errors
}

/** Valide l'adresse du compte PayPal fictif. */
export function validatePaypalEmail(email: string): string | null {
  if (email.trim() === '') {
    return "Indiquez l'adresse e-mail de votre compte PayPal."
  }
  return isValidEmail(email) ? null : 'Adresse e-mail invalide (exemple : nom@domaine.fr).'
}

/** « •••• 4242 » : seuls les 4 derniers chiffres sont affichés. */
export function maskCardNumber(number: string): string {
  return `•••• ${digitsOnly(number).slice(-4)}`
}

/** « Carte Visa •••• 4242 » : description sans donnée sensible. */
export function describeCardPayment(number: string): string {
  return `Carte ${cardBrandLabel(detectCardBrand(digitsOnly(number)))} ${maskCardNumber(number)}`
}

/**
 * Décision du paiement simulé : la carte de test « refusée » échoue,
 * tout le reste (carte valide, PayPal) est accepté.
 */
export function decideCardPayment(number: string): PaymentOutcome {
  return digitsOnly(number) === digitsOnly(TEST_CARD_DECLINED)
    ? { ok: false, message: PAYMENT_DECLINED_MESSAGE }
    : { ok: true }
}

/**
 * Numéro de commande lisible : CS-AAAAMMJJ-NNNN.
 * `random` (entre 0 et 1) est injecté pour garder la fonction pure.
 */
export function createOrderNumber(date: Date, random: number): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const suffix = 1000 + Math.floor(Math.min(Math.max(random, 0), 0.9999) * 9000)
  return `CS-${year}${month}${day}-${suffix}`
}

/** Fige les lignes du panier dans la commande (prix en centimes). */
export function toOrderLines(entries: CartEntry[]): OrderLine[] {
  return entries.map(({ item, product }) => ({
    productId: product.id,
    title: product.title,
    thumbnail: product.thumbnail,
    quantity: item.quantity,
    unitPriceCents: eurosToCents(product.price),
  }))
}
