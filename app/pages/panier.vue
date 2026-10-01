<template>
  <main class="container">
    <h1>Mon panier</h1>

    <!-- Ajustements automatiques (stock baissé, produit supprimé…) -->
    <ul v-if="cart.notices.length" class="notices" role="status">
      <li v-for="notice in cart.notices" :key="notice">{{ notice }}</li>
    </ul>

    <div v-if="status === 'pending'" class="state" aria-busy="true">
      <p>Chargement de votre panier…</p>
    </div>

    <div v-else-if="error" class="state state--error" role="alert">
      <p>Impossible de charger les produits de votre panier (erreur réseau).</p>
      <button type="button" class="button" @click="refresh()">Réessayer</button>
    </div>

    <div v-else-if="cart.entries.length === 0" class="state">
      <p>Votre panier est vide.</p>
      <NuxtLink to="/produits" class="button">Voir le catalogue</NuxtLink>
    </div>

    <div v-else class="cart-layout">
      <section aria-labelledby="cart-lines-title">
        <h2 id="cart-lines-title" class="visually-hidden">Articles</h2>
        <ul class="cart-lines">
          <CartLineItem
            v-for="entry in cart.entries"
            :key="entry.product.id"
            :item="entry.item"
            :product="entry.product"
            :message="lineMessages[entry.product.id]"
            @update-quantity="(quantity: number) => onUpdateQuantity(entry.product.id, quantity)"
            @remove="onRemove(entry.product.id)"
          />
        </ul>
        <button type="button" class="link-button" @click="onClear">Vider le panier</button>
      </section>

      <aside>
        <CartSummaryPanel :summary="cart.summary" />
        <PromoCodeForm
          :applied-code="cart.promoCode"
          @apply="cart.applyPromoCode"
          @remove="cart.removePromoCode"
        />
      </aside>
    </div>

    <!-- Annonce des actions pour les lecteurs d'écran -->
    <p class="visually-hidden" role="status" aria-live="polite">{{ announcement }}</p>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCartStore } from '~/stores/cart'

const cart = useCartStore()

/*
 * Le cookie ne contient que (id, quantité) : on recharge les infos produits
 * (titre, prix, catégorie, stock) côté serveur pour que la page soit
 * complète dès le rendu SSR, avec les prix et stocks à jour.
 */
const { status, error, refresh } = await useAsyncData('cart-products', async () => {
  await cart.loadProducts()
  return true
})

useSeoMeta({
  title: 'Mon panier | ChampaShop',
  description: 'Récapitulatif de votre panier ChampaShop : articles, remises appliquées, livraison et total.',
  robots: 'noindex, follow',
})

/** Messages par ligne (ex. « Impossible de dépasser le stock »). */
const lineMessages = ref<Record<number, string | null>>({})
const announcement = ref<string>('')

function onUpdateQuantity(productId: number, quantity: number): void {
  const result = cart.setQuantity(productId, quantity)
  lineMessages.value = { ...lineMessages.value, [productId]: result.ok ? null : result.message }
  if (result.ok && result.message) {
    announcement.value = result.message
  }
}

function onRemove(productId: number): void {
  const title = cart.products[productId]?.title ?? 'Le produit'
  cart.remove(productId)
  announcement.value = `« ${title} » a été retiré du panier.`
}

function onClear(): void {
  cart.clear()
  lineMessages.value = {}
  announcement.value = 'Le panier a été vidé.'
}
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
h1 { margin-bottom: 1.5rem; }
.cart-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 2rem;
  align-items: start;
}
.cart-lines { list-style: none; margin: 0; padding: 0; }
.state {
  text-align: center;
  padding: 3rem;
  border-radius: 8px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
}
.state--error { background: #fff3f3; border-color: #ffcdd2; }
.notices {
  margin: 0 0 1.5rem;
  padding: 0.75rem 1rem 0.75rem 2rem;
  border-radius: 4px;
  background: #fff4e5;
  color: #7a4100;
}
.button {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: #2c3e50;
  color: #fff;
  text-decoration: none;
  cursor: pointer;
}
.link-button {
  margin-top: 1rem;
  padding: 0;
  border: none;
  background: none;
  color: #b42318;
  text-decoration: underline;
  cursor: pointer;
}
.button:focus-visible,
.link-button:focus-visible {
  outline: 3px solid #f39c12;
  outline-offset: 2px;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
@media (max-width: 860px) {
  .cart-layout { grid-template-columns: 1fr; }
}
</style>
