import { describe, expect, it } from 'vitest'
import {
  PAYMENT_DECLINED_MESSAGE,
  TEST_CARD_ACCEPTED,
  TEST_CARD_DECLINED,
  createOrderNumber,
  decideCardPayment,
  describeCardPayment,
  detectCardBrand,
  digitsOnly,
  emptyContact,
  formatCardNumber,
  formatExpiry,
  hasErrors,
  isExpired,
  isLuhnValid,
  maskCardNumber,
  parseExpiry,
  toOrderLines,
  validateCard,
  validateContact,
  validatePaypalEmail,
} from '../../app/utils/checkout'
import type { CardDetails, CheckoutContact } from '../../app/types/checkout'

function contact(overrides: Partial<CheckoutContact> = {}): CheckoutContact {
  return {
    firstName: 'Emily',
    lastName: 'Johnson',
    email: 'emily@exemple.fr',
    phone: '06 12 34 56 78',
    address: '12 rue de la Cité',
    addressComplement: '',
    postalCode: '10000',
    city: 'Troyes',
    ...overrides,
  }
}

function card(overrides: Partial<CardDetails> = {}): CardDetails {
  return {
    holder: 'Emily Johnson',
    number: TEST_CARD_ACCEPTED,
    expiry: '08/29',
    cvc: '123',
    ...overrides,
  }
}

/** Date fixe : 7 octobre 2026. */
const NOW = new Date(2026, 9, 7)

describe('validateContact', () => {
  it('coordonnées complètes → aucune erreur (complément facultatif)', () => {
    expect(validateContact(contact())).toEqual({})
    expect(hasErrors(validateContact(contact()))).toBe(false)
  })

  it('formulaire vide → un message par champ obligatoire', () => {
    const errors = validateContact(emptyContact())
    expect(Object.keys(errors).sort()).toEqual(
      ['address', 'city', 'email', 'firstName', 'lastName', 'phone', 'postalCode'].sort(),
    )
    expect(errors.addressComplement).toBeUndefined()
    expect(hasErrors(errors)).toBe(true)
  })

  it('espaces seuls → considérés comme vides', () => {
    expect(validateContact(contact({ city: '   ' })).city).toBe('Indiquez votre ville.')
  })

  it('e-mail mal formé → refusé', () => {
    expect(validateContact(contact({ email: 'emily@' })).email).toMatch(/invalide/)
    expect(validateContact(contact({ email: 'emily exemple.fr' })).email).toMatch(/invalide/)
  })

  it('téléphone : formats français acceptés, avec espaces, points ou tirets', () => {
    expect(validateContact(contact({ phone: '0612345678' })).phone).toBeUndefined()
    expect(validateContact(contact({ phone: '06.12.34.56.78' })).phone).toBeUndefined()
    expect(validateContact(contact({ phone: '+33 6 12 34 56 78' })).phone).toBeUndefined()
  })

  it('téléphone invalide → refusé', () => {
    expect(validateContact(contact({ phone: '12345' })).phone).toMatch(/invalide/)
    expect(validateContact(contact({ phone: '0012345678' })).phone).toMatch(/invalide/)
    expect(validateContact(contact({ phone: 'abcdefghij' })).phone).toMatch(/invalide/)
  })

  it('code postal : exactement 5 chiffres', () => {
    expect(validateContact(contact({ postalCode: '1000' })).postalCode).toMatch(/invalide/)
    expect(validateContact(contact({ postalCode: '10 000' })).postalCode).toMatch(/invalide/)
    expect(validateContact(contact({ postalCode: ' 10000 ' })).postalCode).toBeUndefined()
  })
})

describe('numéro de carte', () => {
  it('digitsOnly retire espaces et tirets', () => {
    expect(digitsOnly('4242 4242-4242.4242')).toBe('4242424242424242')
  })

  it('Luhn : cartes de test valides, faute de frappe détectée', () => {
    expect(isLuhnValid('4242424242424242')).toBe(true)
    expect(isLuhnValid('4000000000000002')).toBe(true)
    expect(isLuhnValid('5555555555554444')).toBe(true)
    expect(isLuhnValid('378282246310005')).toBe(true)
    expect(isLuhnValid('4242424242424241')).toBe(false)
    expect(isLuhnValid('')).toBe(false)
    expect(isLuhnValid('4242abcd')).toBe(false)
  })

  it('réseau détecté d’après les premiers chiffres', () => {
    expect(detectCardBrand('4242424242424242')).toBe('visa')
    expect(detectCardBrand('5555555555554444')).toBe('mastercard')
    expect(detectCardBrand('2221000000000009')).toBe('mastercard')
    expect(detectCardBrand('2220000000000000')).toBe('unknown')
    expect(detectCardBrand('378282246310005')).toBe('amex')
    expect(detectCardBrand('6011111111111117')).toBe('unknown')
  })

  it('formatCardNumber groupe par 4 et limite à 19 chiffres', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242')
    expect(formatCardNumber('4242 42')).toBe('4242 42')
    expect(formatCardNumber('4242')).toBe('4242')
    expect(digitsOnly(formatCardNumber('1'.repeat(25)))).toHaveLength(19)
  })

  it('maskCardNumber et describeCardPayment n’affichent que les 4 derniers chiffres', () => {
    expect(maskCardNumber(TEST_CARD_ACCEPTED)).toBe('•••• 4242')
    expect(describeCardPayment(TEST_CARD_ACCEPTED)).toBe('Carte Visa •••• 4242')
    expect(describeCardPayment('5555 5555 5555 4444')).toBe('Carte Mastercard •••• 4444')
    expect(describeCardPayment('6011 1111 1111 1117')).toBe('Carte bancaire •••• 1117')
  })
})

describe('date d’expiration', () => {
  it('formatExpiry ajoute la barre oblique pendant la saisie', () => {
    expect(formatExpiry('0829')).toBe('08/29')
    expect(formatExpiry('08')).toBe('08')
    expect(formatExpiry('08/2')).toBe('08/2')
    expect(formatExpiry('082999')).toBe('08/29')
  })

  it('parseExpiry lit MM/AA et refuse un mois impossible', () => {
    expect(parseExpiry('08/29')).toEqual({ month: 8, year: 2029 })
    expect(parseExpiry(' 08 / 29 ')).toEqual({ month: 8, year: 2029 })
    expect(parseExpiry('13/29')).toBeNull()
    expect(parseExpiry('00/29')).toBeNull()
    expect(parseExpiry('8/29')).toBeNull()
    expect(parseExpiry('')).toBeNull()
  })

  it('une carte reste valable jusqu’à la fin de son mois', () => {
    expect(isExpired({ month: 10, year: 2026 }, NOW)).toBe(false)
    expect(isExpired({ month: 9, year: 2026 }, NOW)).toBe(true)
    expect(isExpired({ month: 1, year: 2027 }, NOW)).toBe(false)
  })
})

describe('validateCard', () => {
  it('carte de test valide → aucune erreur', () => {
    expect(validateCard(card(), NOW)).toEqual({})
  })

  it('formulaire vide → un message par champ', () => {
    const errors = validateCard({ holder: '', number: '', expiry: '', cvc: '' }, NOW)
    expect(errors).toEqual({
      holder: 'Indiquez le nom inscrit sur la carte.',
      number: 'Indiquez le numéro de la carte.',
      expiry: "Indiquez la date d'expiration.",
      cvc: 'Indiquez le cryptogramme.',
    })
  })

  it('numéro trop court ou faute de frappe → refusé', () => {
    expect(validateCard(card({ number: '4242' }), NOW).number).toMatch(/invalide/)
    expect(validateCard(card({ number: '4242 4242 4242 4241' }), NOW).number).toMatch(/invalide/)
  })

  it('date mal écrite ou carte expirée → refusée', () => {
    expect(validateCard(card({ expiry: '2029-08' }), NOW).expiry).toMatch(/MM\/AA/)
    expect(validateCard(card({ expiry: '09/26' }), NOW).expiry).toBe('Cette carte est expirée.')
    expect(validateCard(card({ expiry: '10/26' }), NOW).expiry).toBeUndefined()
  })

  it('cryptogramme : 3 chiffres, 4 pour American Express', () => {
    expect(validateCard(card({ cvc: '12' }), NOW).cvc).toBe('Le cryptogramme comporte 3 chiffres.')
    expect(validateCard(card({ cvc: '12a' }), NOW).cvc).toBe('Le cryptogramme comporte 3 chiffres.')
    expect(validateCard(card({ number: '3782 822463 10005', cvc: '123' }), NOW).cvc).toBe(
      'Le cryptogramme comporte 4 chiffres.',
    )
    expect(validateCard(card({ number: '3782 822463 10005', cvc: '1234' }), NOW)).toEqual({})
  })
})

describe('PayPal fictif', () => {
  it('adresse obligatoire et bien formée', () => {
    expect(validatePaypalEmail('')).toMatch(/Indiquez/)
    expect(validatePaypalEmail('emily@')).toMatch(/invalide/)
    expect(validatePaypalEmail('emily@exemple.fr')).toBeNull()
  })
})

describe('paiement simulé', () => {
  it('la carte de test « refusée » échoue avec un message explicite', () => {
    expect(decideCardPayment(TEST_CARD_DECLINED)).toEqual({ ok: false, message: PAYMENT_DECLINED_MESSAGE })
    expect(decideCardPayment('4000000000000002')).toEqual({ ok: false, message: PAYMENT_DECLINED_MESSAGE })
  })

  it('toute autre carte valide est acceptée', () => {
    expect(decideCardPayment(TEST_CARD_ACCEPTED)).toEqual({ ok: true })
  })
})

describe('commande', () => {
  it('numéro CS-AAAAMMJJ-NNNN sur 4 chiffres', () => {
    expect(createOrderNumber(NOW, 0)).toBe('CS-20261007-1000')
    expect(createOrderNumber(NOW, 0.5)).toBe('CS-20261007-5500')
    expect(createOrderNumber(NOW, 1)).toBe('CS-20261007-9999')
    expect(createOrderNumber(new Date(2026, 0, 3), -1)).toBe('CS-20260103-1000')
  })

  it('toOrderLines fige titre, quantité et prix en centimes', () => {
    const lines = toOrderLines([
      {
        item: { productId: 1, quantity: 2 },
        product: { id: 1, title: 'Mascara', price: 9.99, category: 'beauty', stock: 5, thumbnail: 'x.webp' },
      },
    ])
    expect(lines).toEqual([{ productId: 1, title: 'Mascara', thumbnail: 'x.webp', quantity: 2, unitPriceCents: 999 }])
  })
})
