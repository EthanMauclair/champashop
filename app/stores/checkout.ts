/**
 * Store Pinia du tunnel de commande fictif (issue #32).
 *
 * - Garde les coordonnées entre les étapes (retour au panier compris)
 *   et la dernière commande pour la page de confirmation.
 * - Volontairement NON persisté (ni cookie, ni localStorage) : des
 *   coordonnées n'ont rien à faire dans un cookie, et les données de carte
 *   ne passent jamais par ce store (elles restent dans le formulaire).
 * - Les règles (validation, paiement simulé) sont dans utils/checkout.ts.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { CheckoutContact, Order, PaymentMethod } from '../types/checkout'
import { emptyContact } from '../utils/checkout'

/** Type de retour explicite du store (exigé par les consignes). */
export interface CheckoutStore {
  // état
  contact: Ref<CheckoutContact>
  paymentMethod: Ref<PaymentMethod>
  lastOrder: Ref<Order | null>
  // actions
  saveContact: (nextContact: CheckoutContact) => void
  setPaymentMethod: (method: PaymentMethod) => void
  confirmOrder: (order: Order) => void
}

export const useCheckoutStore = defineStore('checkout', (): CheckoutStore => {
  const contact = ref<CheckoutContact>(emptyContact())
  const paymentMethod = ref<PaymentMethod>('card')
  const lastOrder = ref<Order | null>(null)

  function saveContact(nextContact: CheckoutContact): void {
    contact.value = { ...nextContact }
  }

  function setPaymentMethod(method: PaymentMethod): void {
    paymentMethod.value = method
  }

  /** Commande payée : on la garde pour la confirmation et on repart de zéro. */
  function confirmOrder(order: Order): void {
    lastOrder.value = order
    paymentMethod.value = 'card'
  }

  return { contact, paymentMethod, lastOrder, saveContact, setPaymentMethod, confirmOrder }
})
