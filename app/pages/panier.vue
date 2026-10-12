<template>
  <main class="container">
    <header class="page-header">
      <h1 class="page-header__title">Mon panier</h1>
      <p v-if="cart.itemCount > 0" class="page-header__subtitle">
        {{ cart.itemCount }} article{{ cart.itemCount > 1 ? 's' : '' }}
      </p>
    </header>

    <!-- Ajustements automatiques (stock baissé, produit supprimé…) -->
    <ul v-if="cart.notices.length" class="notice notices" role="status">
      <li v-for="notice in cart.notices" :key="notice">{{ notice }}</li>
    </ul>

    <div v-if="status === 'pending'" class="state" aria-busy="true">
      <p>Chargement de votre panier…</p>
    </div>

    <div v-else-if="error" class="state state--error" role="alert">
      <p>Impossible de charger les produits de votre panier (erreur réseau).</p>
      <button type="button" class="btn btn--primary" @click="refresh()">Réessayer</button>
    </div>

    <div v-else-if="cart.entries.length === 0" class="state">
      <p>Votre panier est vide.</p>
      <NuxtLink to="/produits" class="btn btn--primary">Découvrir le catalogue</NuxtLink>
    </div>

    <div v-else class="cart-layout">
      <section class="cart-lines-card card" aria-labelledby="cart-lines-title">
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
        <button type="button" class="btn btn--danger-ghost btn--sm cart-clear" @click="onClear">Vider le panier</button>
      </section>

      <aside class="cart-aside">
        <CartSummaryPanel :summary="cart.summary" />
        <PromoCodeForm
          :applied-code="cart.promoCode"
          @apply="cart.applyPromoCode"
          @remove="cart.removePromoCode"
        />
        <NuxtLink to="/commande" class="btn btn--accent btn--block cart-checkout">Passer commande</NuxtLink>
        <NuxtLink to="/produits" class="btn btn--secondary btn--block cart-continue">Continuer mes achats</NuxtLink>
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
.cart-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
  gap: var(--space-6);
  align-items: start;
}

.cart-lines-card {
  padding: var(--space-2) var(--space-5) var(--space-4);
}

.cart-lines {
  margin: 0;
  padding: 0;
  list-style: none;
}

.cart-clear {
  margin-top: var(--space-2);
  padding-left: 0;
}

.cart-aside {
  position: sticky;
  top: calc(var(--header-height) + var(--space-5));
}

.cart-checkout {
  margin-top: var(--space-4);
}

.cart-continue {
  margin-top: var(--space-3);
}

.notices {
  margin: 0 0 var(--space-5);
  padding-left: var(--space-6);
}

@media (max-width: 900px) {
  .cart-layout {
    grid-template-columns: 1fr;
  }

  .cart-aside {
    position: static;
  }
}
</style>
