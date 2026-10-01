/**
 * Utilitaires monétaires purs (sans Vue ni Pinia).
 * Tous les montants manipulés sont des centimes entiers.
 */

/**
 * Division entière arrondie au plus proche, demi vers le haut
 * (arrondi commercial), en restant en arithmétique entière pour
 * éviter les erreurs de flottants (ex. 0.1 + 0.2).
 * Valable pour un numérateur >= 0 et un dénominateur > 0.
 */
export function roundHalfUpDivide(numerator: number, denominator: number): number {
  return Math.floor((2 * numerator + denominator) / (2 * denominator))
}

/** Calcule `percent` % d'un montant en centimes, arrondi demi vers le haut. */
export function percentOfCents(amountCents: number, percent: number): number {
  return roundHalfUpDivide(amountCents * percent, 100)
}

/** Convertit un prix DummyJSON (euros, flottant) en centimes entiers. */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100)
}

const euroFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

/** Formate des centimes en chaîne lisible, ex. 1050 -> « 10,50 € ». */
export function formatCents(cents: number): string {
  return euroFormatter.format(cents / 100)
}
