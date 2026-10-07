<template>
  <main class="container confirmation">
    <div v-if="!order" class="state">
      <p>Aucune commande récente à afficher.</p>
      <p class="confirmation__muted">
        La confirmation d'une commande fictive n'est pas conservée après un rechargement de la page.
      </p>
      <NuxtLink to="/produits" class="btn btn--primary">Découvrir le catalogue</NuxtLink>
    </div>

    <template v-else>
      <section class="confirmation__hero card" aria-labelledby="confirmation-title">
        <span class="confirmation__icon" aria-hidden="true">✓</span>
        <h1 id="confirmation-title" ref="titleRef" class="confirmation__title" tabindex="-1">
          Merci {{ order.contact.firstName }}, votre commande est confirmée
        </h1>
        <p class="confirmation__number">
          Commande n° <strong>{{ order.number }}</strong> du {{ orderDate }}
        </p>
        <p class="confirmation__muted">
          Un e-mail de confirmation serait envoyé à {{ order.contact.email }}. Commande fictive : rien n'a été débité et
          aucun colis ne sera expédié.
        </p>
      </section>

      <div class="confirmation__layout">
        <section class="card confirmation__block" aria-labelledby="confirmation-items">
          <h2 id="confirmation-items" class="confirmation__subtitle">Articles</h2>
          <ul class="confirmation__lines">
            <li v-for="line in order.lines" :key="line.productId" class="confirmation__line">
              <img :src="line.thumbnail" alt="" width="56" height="56" class="confirmation__thumb" >
              <span class="confirmation__line-title">{{ line.title }}</span>
              <span class="confirmation__line-qty">× {{ line.quantity }}</span>
              <span class="confirmation__line-price">{{ formatCents(line.unitPriceCents * line.quantity) }}</span>
            </li>
          </ul>
        </section>

        <div class="confirmation__aside">
          <section class="card confirmation__block" aria-labelledby="confirmation-delivery">
            <h2 id="confirmation-delivery" class="confirmation__subtitle">Livraison</h2>
            <address class="confirmation__address">
              {{ order.contact.firstName }} {{ order.contact.lastName }}<br >
              {{ order.contact.address }}<br >
              <template v-if="order.contact.addressComplement">{{ order.contact.addressComplement }}<br ></template>
              {{ order.contact.postalCode }} {{ order.contact.city }}, France
            </address>
            <h2 class="confirmation__subtitle confirmation__subtitle--spaced">Paiement</h2>
            <p class="confirmation__address">{{ order.paymentLabel }}</p>
          </section>
          <CartSummaryPanel :summary="order.summary" />
        </div>
      </div>

      <div class="confirmation__actions">
        <NuxtLink to="/produits" class="btn btn--primary">Continuer mes achats</NuxtLink>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Order } from '~/types/checkout'
import { useCheckoutStore } from '~/stores/checkout'
import { formatCents } from '~/utils/money'

const checkout = useCheckoutStore()
const order = computed<Order | null>(() => checkout.lastOrder)
const titleRef = ref<HTMLHeadingElement | null>(null)

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
const orderDate = computed<string>(() => (order.value ? dateFormatter.format(new Date(order.value.createdAt)) : ''))

useSeoMeta({
  title: 'Commande confirmée | ChampaShop',
  description: 'Confirmation de votre commande ChampaShop.',
  robots: 'noindex, nofollow',
})

// Arrivée depuis le paiement : le focus va sur le titre pour annoncer la confirmation.
onMounted(() => {
  titleRef.value?.focus()
})
</script>

<style scoped>
.confirmation__hero {
  margin-bottom: var(--space-5);
  padding: var(--space-6) var(--space-5);
  text-align: center;
}

.confirmation__icon {
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin-bottom: var(--space-3);
  border-radius: 50%;
  background: var(--color-success-soft);
  color: var(--color-success);
  font-size: var(--text-2xl);
  font-weight: 800;
}

.confirmation__title {
  margin-bottom: var(--space-3);
  font-size: var(--text-2xl);
  outline-offset: 4px;
}

.confirmation__number {
  margin: 0 0 var(--space-2);
  font-size: var(--text-lg);
}

.confirmation__muted {
  margin: 0 0 var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.confirmation__hero .confirmation__muted {
  margin: 0;
}

.confirmation__layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: var(--space-5);
  align-items: start;
}

.confirmation__aside {
  display: grid;
  gap: var(--space-4);
}

.confirmation__block {
  padding: var(--space-5);
}

.confirmation__subtitle {
  margin-bottom: var(--space-3);
  font-size: var(--text-lg);
}

.confirmation__subtitle--spaced {
  margin-top: var(--space-4);
}

.confirmation__lines {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.confirmation__line {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--space-3);
}

.confirmation__thumb {
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  object-fit: cover;
}

.confirmation__line-qty {
  color: var(--color-text-muted);
}

.confirmation__line-price {
  font-weight: 600;
  white-space: nowrap;
}

.confirmation__address {
  margin: 0;
  color: var(--color-text-muted);
  font-style: normal;
  line-height: 1.6;
}

.confirmation__actions {
  margin-top: var(--space-5);
  text-align: center;
}

@media (max-width: 900px) {
  .confirmation__layout {
    grid-template-columns: 1fr;
  }
}
</style>
