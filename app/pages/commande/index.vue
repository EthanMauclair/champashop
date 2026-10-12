<template>
  <main class="container checkout">
    <header class="page-header">
      <h1 class="page-header__title">Commande</h1>
      <p class="page-header__subtitle">
        Paiement fictif : aucune somme n'est débitée et aucune donnée bancaire n'est envoyée.
      </p>
    </header>

    <div v-if="status === 'pending'" class="state" aria-busy="true">
      <p>Chargement de votre panier…</p>
    </div>

    <div v-else-if="error" class="state state--error" role="alert">
      <p>Impossible de charger les produits de votre panier (erreur réseau).</p>
      <button type="button" class="btn btn--primary" @click="refresh()">Réessayer</button>
    </div>

    <div v-else-if="cart.entries.length === 0 && !ordered" class="state">
      <p>Votre panier est vide : ajoutez des produits avant de passer commande.</p>
      <NuxtLink to="/produits" class="btn btn--primary">Découvrir le catalogue</NuxtLink>
    </div>

    <div v-else-if="!ordered" class="checkout__layout">
      <div class="checkout__main">
        <!-- Progression : l'étape en cours est annoncée (aria-current). -->
        <ol class="steps" aria-label="Étapes de la commande">
          <li
            v-for="(item, index) in STEPS"
            :key="item.id"
            class="steps__item"
            :class="{ 'steps__item--done': index < stepIndex, 'steps__item--current': index === stepIndex }"
            :aria-current="index === stepIndex ? 'step' : undefined"
          >
            <span class="steps__number" aria-hidden="true">{{ index < stepIndex ? '✓' : index + 1 }}</span>
            {{ item.label }}
          </li>
        </ol>

        <ul v-if="cart.notices.length" class="notice checkout__notices" role="status">
          <li v-for="notice in cart.notices" :key="notice">{{ notice }}</li>
        </ul>

        <!-- Récapitulatif des erreurs : reçoit le focus à l'envoi, chaque lien mène au champ. -->
        <div
          v-if="errorList.length > 0"
          ref="errorSummaryRef"
          class="checkout__errors"
          role="alert"
          tabindex="-1"
          aria-labelledby="checkout-errors-title"
        >
          <p id="checkout-errors-title" class="checkout__errors-title">
            {{ errorList.length > 1 ? `${errorList.length} champs sont à corriger :` : 'Un champ est à corriger :' }}
          </p>
          <ul>
            <li v-for="item in errorList" :key="item.id">
              <a :href="`#${item.id}`" @click.prevent="focusField(item.id)">{{ item.message }}</a>
            </li>
          </ul>
        </div>

        <!-- Étape 1 : coordonnées et livraison -->
        <form
          v-if="step === 'contact'"
          class="checkout__step card"
          novalidate
          aria-labelledby="step-title"
          @submit.prevent="submitContact"
        >
          <h2 id="step-title" ref="stepTitleRef" class="checkout__step-title" tabindex="-1">Vos coordonnées</h2>
          <p v-if="!auth.user" class="checkout__hint">
            Vous avez un compte ?
            <NuxtLink :to="{ path: '/connexion', query: { redirect: '/commande' } }">Connectez-vous</NuxtLink>
            pour pré-remplir vos informations.
          </p>

          <fieldset class="checkout__fieldset">
            <legend class="checkout__legend">Contact</legend>
            <div class="checkout__grid">
              <CheckoutField
                id="checkout-firstName"
                v-model="contact.firstName"
                label="Prénom"
                autocomplete="given-name"
                :error="contactErrors.firstName"
              />
              <CheckoutField
                id="checkout-lastName"
                v-model="contact.lastName"
                label="Nom"
                autocomplete="family-name"
                :error="contactErrors.lastName"
              />
              <CheckoutField
                id="checkout-email"
                v-model="contact.email"
                label="E-mail"
                type="email"
                inputmode="email"
                autocomplete="email"
                hint="Pour recevoir la confirmation (fictive)."
                :error="contactErrors.email"
              />
              <CheckoutField
                id="checkout-phone"
                v-model="contact.phone"
                label="Téléphone"
                type="tel"
                inputmode="tel"
                autocomplete="tel"
                hint="Exemple : 06 12 34 56 78"
                :error="contactErrors.phone"
              />
            </div>
          </fieldset>

          <fieldset class="checkout__fieldset">
            <legend class="checkout__legend">Adresse de livraison (France)</legend>
            <div class="checkout__grid">
              <CheckoutField
                id="checkout-address"
                v-model="contact.address"
                class="checkout__wide"
                label="Adresse"
                autocomplete="address-line1"
                :error="contactErrors.address"
              />
              <CheckoutField
                id="checkout-addressComplement"
                v-model="contact.addressComplement"
                class="checkout__wide"
                label="Complément d'adresse"
                autocomplete="address-line2"
                hint="Bâtiment, étage, digicode…"
                :required="false"
              />
              <CheckoutField
                id="checkout-postalCode"
                v-model="contact.postalCode"
                label="Code postal"
                inputmode="numeric"
                autocomplete="postal-code"
                :maxlength="5"
                :error="contactErrors.postalCode"
              />
              <CheckoutField
                id="checkout-city"
                v-model="contact.city"
                label="Ville"
                autocomplete="address-level2"
                :error="contactErrors.city"
              />
            </div>
          </fieldset>

          <div class="checkout__actions">
            <NuxtLink to="/panier" class="btn btn--secondary">Retour au panier</NuxtLink>
            <button type="submit" class="btn btn--primary">Continuer vers le paiement</button>
          </div>
        </form>

        <!-- Étape 2 : moyen de paiement (fictif) -->
        <form
          v-else-if="step === 'payment'"
          class="checkout__step card"
          novalidate
          aria-labelledby="step-title"
          @submit.prevent="submitPayment"
        >
          <h2 id="step-title" ref="stepTitleRef" class="checkout__step-title" tabindex="-1">Paiement</h2>

          <fieldset class="checkout__fieldset">
            <legend class="checkout__legend">Moyen de paiement</legend>
            <div class="methods">
              <label class="methods__option" :class="{ 'methods__option--checked': paymentMethod === 'card' }">
                <input v-model="paymentMethod" type="radio" name="payment-method" value="card" >
                <span>
                  <strong>Carte bancaire</strong>
                  <span class="methods__detail">Visa, Mastercard, American Express</span>
                </span>
              </label>
              <label class="methods__option" :class="{ 'methods__option--checked': paymentMethod === 'paypal' }">
                <input v-model="paymentMethod" type="radio" name="payment-method" value="paypal" >
                <span>
                  <strong>PayPal</strong>
                  <span class="methods__detail">Connexion simulée, aucun compte requis</span>
                </span>
              </label>
            </div>
          </fieldset>

          <div v-if="paymentMethod === 'card'" class="checkout__fieldset">
            <p class="notice checkout__test-cards">
              Paiement fictif : n'utilisez pas une vraie carte. Carte acceptée : <code>{{ TEST_CARD_ACCEPTED }}</code
              >, carte refusée : <code>{{ TEST_CARD_DECLINED }}</code
              >, avec une date future et n'importe quel cryptogramme.
            </p>
            <!-- autocomplete="off" : on évite que le navigateur propose une vraie carte enregistrée. -->
            <div class="checkout__grid">
              <CheckoutField
                id="card-holder"
                v-model="card.holder"
                class="checkout__wide"
                label="Nom sur la carte"
                autocomplete="off"
                :error="cardErrors.holder"
              />
              <CheckoutField
                id="card-number"
                v-model="card.number"
                class="checkout__wide"
                label="Numéro de carte"
                inputmode="numeric"
                autocomplete="off"
                :maxlength="23"
                :format="formatCardNumber"
                :error="cardErrors.number"
              />
              <CheckoutField
                id="card-expiry"
                v-model="card.expiry"
                label="Date d'expiration"
                hint="Format MM/AA"
                inputmode="numeric"
                autocomplete="off"
                :maxlength="5"
                :format="formatExpiry"
                :error="cardErrors.expiry"
              />
              <CheckoutField
                id="card-cvc"
                v-model="card.cvc"
                label="Cryptogramme"
                hint="3 chiffres au dos (4 sur American Express)"
                inputmode="numeric"
                autocomplete="off"
                :maxlength="4"
                :format="digitsOnly"
                :error="cardErrors.cvc"
              />
            </div>
          </div>

          <div v-else class="checkout__fieldset">
            <p class="checkout__hint">
              Sur un vrai site, vous seriez redirigé vers PayPal. Ici, la connexion est simulée : indiquez simplement
              une adresse e-mail.
            </p>
            <CheckoutField
              id="paypal-email"
              v-model="paypalEmail"
              label="E-mail du compte PayPal"
              type="email"
              inputmode="email"
              autocomplete="email"
              :error="paypalError ?? undefined"
            />
          </div>

          <div class="checkout__actions">
            <button type="button" class="btn btn--secondary" @click="goTo('contact')">Retour aux coordonnées</button>
            <button type="submit" class="btn btn--primary">Vérifier ma commande</button>
          </div>
        </form>

        <!-- Étape 3 : vérification et paiement -->
        <form
          v-else
          class="checkout__step card"
          novalidate
          aria-labelledby="step-title"
          :aria-busy="paying"
          @submit.prevent="pay"
        >
          <h2 id="step-title" ref="stepTitleRef" class="checkout__step-title" tabindex="-1">Vérification</h2>

          <div class="review">
            <section class="review__block" aria-labelledby="review-delivery">
              <div class="review__header">
                <h3 id="review-delivery" class="review__title">Livraison</h3>
                <button type="button" class="btn btn--secondary btn--sm" :disabled="paying" @click="goTo('contact')">
                  Modifier<span class="visually-hidden"> la livraison</span>
                </button>
              </div>
              <address class="review__text">
                {{ contact.firstName }} {{ contact.lastName }}<br >
                {{ contact.address }}<br >
                <template v-if="contact.addressComplement">{{ contact.addressComplement }}<br ></template>
                {{ contact.postalCode }} {{ contact.city }}, France<br >
                {{ contact.email }} · {{ contact.phone }}
              </address>
            </section>

            <section class="review__block" aria-labelledby="review-payment">
              <div class="review__header">
                <h3 id="review-payment" class="review__title">Paiement</h3>
                <button type="button" class="btn btn--secondary btn--sm" :disabled="paying" @click="goTo('payment')">
                  Modifier<span class="visually-hidden"> le paiement</span>
                </button>
              </div>
              <p class="review__text">{{ paymentLabel }}</p>
            </section>
          </div>

          <label class="terms">
            <input
              id="checkout-terms"
              v-model="acceptTerms"
              type="checkbox"
              :aria-invalid="termsError ? 'true' : undefined"
              :aria-describedby="termsError ? 'checkout-terms-error' : undefined"
            >
            <span>J'accepte les conditions générales de vente (fictives).</span>
          </label>
          <p v-if="termsError" id="checkout-terms-error" class="checkout__field-error">{{ termsError }}</p>

          <p
            v-if="paymentError"
            ref="paymentErrorRef"
            class="state--error checkout__payment-error"
            role="alert"
            tabindex="-1"
          >
            {{ paymentError }}
          </p>

          <div class="checkout__actions">
            <button type="button" class="btn btn--secondary" :disabled="paying" @click="goTo('payment')">
              Retour au paiement
            </button>
            <button type="submit" class="btn btn--accent" :disabled="paying">
              {{ paying ? 'Paiement en cours…' : `Payer ${formatCents(cart.summary.totalCents)}` }}
            </button>
          </div>
          <p class="visually-hidden" role="status" aria-live="polite">
            {{ paying ? 'Paiement en cours, veuillez patienter.' : '' }}
          </p>
        </form>
      </div>

      <aside class="checkout__aside">
        <section class="card checkout__items" aria-labelledby="checkout-items-title">
          <h2 id="checkout-items-title" class="checkout__items-title">
            Votre panier ({{ cart.itemCount }} article{{ cart.itemCount > 1 ? 's' : '' }})
          </h2>
          <ul class="checkout__item-list">
            <li v-for="entry in cart.entries" :key="entry.product.id" class="checkout__item">
              <img :src="entry.product.thumbnail" alt="" width="48" height="48" class="checkout__thumb" >
              <span class="checkout__item-title">{{ entry.product.title }}</span>
              <span class="checkout__item-qty">× {{ entry.item.quantity }}</span>
            </li>
          </ul>
          <NuxtLink v-if="!paying" to="/panier" class="checkout__edit-cart">Modifier le panier</NuxtLink>
        </section>
        <CartSummaryPanel :summary="cart.summary" />
      </aside>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import type {
  CardDetails,
  CardField,
  CheckoutContact,
  CheckoutContactField,
  FieldErrors,
  Order,
  PaymentMethod,
} from '~/types/checkout'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'
import { useCheckoutStore } from '~/stores/checkout'
import {
  TEST_CARD_ACCEPTED,
  TEST_CARD_DECLINED,
  createOrderNumber,
  decideCardPayment,
  describeCardPayment,
  digitsOnly,
  formatCardNumber,
  formatExpiry,
  hasErrors,
  toOrderLines,
  validateCard,
  validateContact,
  validatePaypalEmail,
} from '~/utils/checkout'
import { formatCents } from '~/utils/money'

type Step = 'contact' | 'payment' | 'review'

const STEPS: { id: Step; label: string }[] = [
  { id: 'contact', label: 'Coordonnées' },
  { id: 'payment', label: 'Paiement' },
  { id: 'review', label: 'Vérification' },
]

/** Durée du paiement simulé (le temps d'un « aller-retour » avec la banque). */
const PAYMENT_DELAY_MS = 1500

const cart = useCartStore()
const auth = useAuthStore()
const checkout = useCheckoutStore()

// Même chargement que /panier : prix et stocks à jour dès le rendu serveur.
const { status, error, refresh } = await useAsyncData('cart-products', async () => {
  await cart.loadProducts()
  return true
})

useSeoMeta({
  title: 'Commande | ChampaShop',
  description: 'Coordonnées, livraison et paiement fictif de votre commande ChampaShop.',
  robots: 'noindex, nofollow',
})

const step = ref<Step>('contact')
const stepIndex = computed<number>(() => STEPS.findIndex((item) => item.id === step.value))

// ---- étape 1 : coordonnées (pré-remplies si l'utilisateur est connecté) ----
const contact = reactive<CheckoutContact>({ ...checkout.contact })
if (auth.user) {
  contact.firstName ||= auth.user.firstName
  contact.lastName ||= auth.user.lastName
  contact.email ||= auth.user.email
}
const contactErrors = ref<FieldErrors<CheckoutContactField>>({})

// ---- étape 2 : paiement (la carte reste dans ce composant, jamais stockée) ----
const paymentMethod = ref<PaymentMethod>(checkout.paymentMethod)
const card = reactive<CardDetails>({ holder: '', number: '', expiry: '', cvc: '' })
const cardErrors = ref<FieldErrors<CardField>>({})
const paypalEmail = ref<string>('')
const paypalError = ref<string | null>(null)

// ---- étape 3 : vérification et paiement simulé ----------------------------
const acceptTerms = ref<boolean>(false)
const termsError = ref<string | null>(null)
const paying = ref<boolean>(false)
const paymentError = ref<string | null>(null)
/** Commande validée : on n'affiche plus le formulaire (le panier vient d'être vidé). */
const ordered = ref<boolean>(false)

const stepTitleRef = ref<HTMLHeadingElement | null>(null)
const errorSummaryRef = ref<HTMLDivElement | null>(null)
const paymentErrorRef = ref<HTMLParagraphElement | null>(null)

const CONTACT_FIELD_ORDER: CheckoutContactField[] = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'address',
  'postalCode',
  'city',
]
const CARD_FIELD_ORDER: CardField[] = ['holder', 'number', 'expiry', 'cvc']

/** Erreurs de l'étape en cours, dans l'ordre des champs, avec l'id du champ. */
const errorList = computed<{ id: string; message: string }[]>(() => {
  if (step.value === 'contact') {
    return CONTACT_FIELD_ORDER.flatMap((field) => {
      const message = contactErrors.value[field]
      return message ? [{ id: `checkout-${field}`, message }] : []
    })
  }
  if (step.value === 'payment') {
    if (paymentMethod.value === 'paypal') {
      return paypalError.value ? [{ id: 'paypal-email', message: paypalError.value }] : []
    }
    return CARD_FIELD_ORDER.flatMap((field) => {
      const message = cardErrors.value[field]
      return message ? [{ id: `card-${field}`, message }] : []
    })
  }
  return termsError.value ? [{ id: 'checkout-terms', message: termsError.value }] : []
})

const paymentLabel = computed<string>(() =>
  paymentMethod.value === 'card' ? describeCardPayment(card.number) : `PayPal (${paypalEmail.value.trim()})`,
)

function focusField(id: string): void {
  document.getElementById(id)?.focus()
}

async function focusErrors(): Promise<void> {
  await nextTick()
  errorSummaryRef.value?.focus()
}

/** Change d'étape et place le focus sur son titre (annoncé par les lecteurs d'écran). */
async function goTo(next: Step): Promise<void> {
  step.value = next
  paymentError.value = null
  await nextTick()
  stepTitleRef.value?.focus()
}

async function submitContact(): Promise<void> {
  contactErrors.value = validateContact(contact)
  if (hasErrors(contactErrors.value)) {
    await focusErrors()
    return
  }
  checkout.saveContact(contact)
  paypalEmail.value ||= contact.email.trim()
  await goTo('payment')
}

async function submitPayment(): Promise<void> {
  if (paymentMethod.value === 'card') {
    cardErrors.value = validateCard(card, new Date())
    paypalError.value = null
  } else {
    paypalError.value = validatePaypalEmail(paypalEmail.value)
    cardErrors.value = {}
  }
  if (errorList.value.length > 0) {
    await focusErrors()
    return
  }
  checkout.setPaymentMethod(paymentMethod.value)
  await goTo('review')
}

async function pay(): Promise<void> {
  termsError.value = acceptTerms.value ? null : 'Acceptez les conditions générales de vente pour commander.'
  if (termsError.value) {
    await focusErrors()
    return
  }

  paying.value = true
  paymentError.value = null
  await new Promise((resolve) => setTimeout(resolve, PAYMENT_DELAY_MS))

  const outcome = paymentMethod.value === 'card' ? decideCardPayment(card.number) : { ok: true as const }
  if (!outcome.ok) {
    paying.value = false
    paymentError.value = outcome.message
    await nextTick()
    paymentErrorRef.value?.focus()
    return
  }

  const now = new Date()
  const order: Order = {
    number: createOrderNumber(now, Math.random()),
    createdAt: now.toISOString(),
    contact: { ...contact },
    lines: toOrderLines(cart.entries),
    summary: cart.summary,
    paymentLabel: paymentLabel.value,
  }
  checkout.confirmOrder(order)
  ordered.value = true
  // Les données de carte sont effacées dès que la commande est validée.
  Object.assign(card, { holder: '', number: '', expiry: '', cvc: '' })
  cart.clear()
  await navigateTo('/commande/confirmation')
}
</script>

<style scoped>
.checkout__layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: var(--space-6);
  align-items: start;
}

/* ---- progression ---- */
.steps {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-5);
  margin: 0 0 var(--space-5);
  padding: 0;
  list-style: none;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: 500;
}

.steps__item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.steps__number {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border-strong);
  border-radius: 50%;
  background: var(--color-surface);
  font-weight: 700;
}

.steps__item--current {
  color: var(--color-text);
  font-weight: 700;
}

.steps__item--current .steps__number {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: #fff;
}

.steps__item--done .steps__number {
  border-color: var(--color-success);
  background: var(--color-success-soft);
  color: var(--color-success);
}

/* ---- formulaire ---- */
.checkout__notices {
  margin: 0 0 var(--space-5);
  padding-left: var(--space-6);
}

.checkout__errors {
  margin-bottom: var(--space-5);
  padding: var(--space-4) var(--space-5);
  border: 2px solid var(--color-danger);
  border-radius: var(--radius-sm);
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.checkout__errors:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.checkout__errors-title {
  margin: 0 0 var(--space-2);
  font-weight: 700;
}

.checkout__errors ul {
  margin: 0;
  padding-left: var(--space-5);
}

.checkout__errors a {
  color: var(--color-danger);
}

.checkout__step {
  padding: var(--space-5);
}

.checkout__step-title {
  margin-bottom: var(--space-4);
  outline-offset: 4px;
}

.checkout__hint {
  margin: 0 0 var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.checkout__fieldset {
  margin: 0 0 var(--space-5);
  padding: 0;
  border: 0;
}

.checkout__legend {
  margin-bottom: var(--space-3);
  padding: 0;
  font-weight: 700;
}

.checkout__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.checkout__wide {
  grid-column: 1 / -1;
}

.checkout__test-cards {
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
}

.checkout__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-5);
}

.checkout__field-error {
  margin: var(--space-1) 0 0;
  color: var(--color-danger);
  font-size: var(--text-sm);
  font-weight: 500;
}

.checkout__payment-error {
  margin: var(--space-4) 0 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid #fecaca;
  border-radius: var(--radius-sm);
  color: var(--color-danger);
  font-weight: 600;
}

/* ---- moyens de paiement ---- */
.methods {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.methods__option {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  cursor: pointer;
}

.methods__option input {
  margin-top: 0.2rem;
  accent-color: var(--color-accent);
}

.methods__option--checked {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  box-shadow: 0 0 0 1px var(--color-accent);
}

.methods__option:has(input:focus-visible) {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.methods__detail {
  display: block;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

/* ---- vérification ---- */
.review {
  display: grid;
  gap: var(--space-4);
}

.review__block {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.review__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.review__title {
  margin: 0;
  font-size: var(--text-base);
}

.review__text {
  margin: 0;
  color: var(--color-text-muted);
  font-style: normal;
  line-height: 1.6;
}

.terms {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  margin-top: var(--space-5);
  cursor: pointer;
}

.terms input {
  width: 1.125rem;
  height: 1.125rem;
  margin-top: 0.15rem;
  accent-color: var(--color-accent);
}

/* ---- colonne de droite ---- */
.checkout__aside {
  display: grid;
  gap: var(--space-4);
  position: sticky;
  top: calc(var(--header-height) + var(--space-5));
}

.checkout__items {
  padding: var(--space-5);
}

.checkout__items-title {
  margin-bottom: var(--space-3);
  font-size: var(--text-lg);
}

.checkout__item-list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.checkout__item {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-sm);
}

.checkout__thumb {
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  object-fit: cover;
}

.checkout__item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.checkout__item-qty {
  color: var(--color-text-muted);
}

.checkout__edit-cart {
  display: inline-block;
  margin-top: var(--space-3);
  font-size: var(--text-sm);
}

@media (max-width: 900px) {
  .checkout__layout {
    grid-template-columns: 1fr;
  }

  .checkout__aside {
    position: static;
  }
}

@media (max-width: 560px) {
  .checkout__grid,
  .methods {
    grid-template-columns: 1fr;
  }

  .checkout__actions {
    flex-direction: column-reverse;
  }

  .checkout__actions .btn {
    width: 100%;
  }
}
</style>
