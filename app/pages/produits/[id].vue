<template>
  <main v-if="product" class="container product-page">
    <nav aria-label="Fil d'Ariane" class="breadcrumb">
      <NuxtLink to="/produits">Catalogue</NuxtLink>
      <span aria-hidden="true">/</span>
      <NuxtLink :to="{ path: '/produits', query: { category: product.category } }">{{ product.category }}</NuxtLink>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{{ product.title }}</span>
    </nav>

    <article class="product">
      <ProductGallery :images="galleryImages" :title="product.title" />

      <div class="product__info">
        <p class="product__meta">
          <span class="product__category">{{ product.category }}</span>
          <span v-if="product.brand" class="product__brand">{{ product.brand }}</span>
        </p>

        <h1 class="product__title">{{ product.title }}</h1>

        <p class="product__rating">
          <span class="product__star" aria-hidden="true">★</span> {{ product.rating.toFixed(1) }} / 5
          <span class="product__reviews-count">({{ product.reviews.length }} avis)</span>
        </p>

        <p class="product__price">
          {{ formatCents(eurosToCents(product.price)) }}
          <span v-if="product.discountPercentage >= 1" class="product__badge">
            −{{ Math.round(product.discountPercentage) }} %
          </span>
        </p>

        <p class="product__stock" :class="`product__stock--${stock.level}`">
          <span class="product__stock-dot" aria-hidden="true" />
          {{ stock.label }}
        </p>

        <!-- Désactivé et « Rupture de stock » à 0 : géré par le composant -->
        <AddToCartButton :product="product" />
        <CompareButton :product="product" class="product__compare" />

        <p class="product__description">{{ product.description }}</p>

        <dl class="product__details card">
          <div>
            <dt>Garantie</dt>
            <dd>{{ product.warrantyInformation }}</dd>
          </div>
          <div>
            <dt>Livraison</dt>
            <dd>{{ product.shippingInformation }}</dd>
          </div>
          <div>
            <dt>Retours</dt>
            <dd>{{ product.returnPolicy }}</dd>
          </div>
        </dl>
      </div>
    </article>

    <ProductReviews :reviews="product.reviews" class="product-page__reviews" />

    <!-- Historique sans le produit en cours (F7) -->
    <RecentlyViewed :exclude-id="product.id" class="product-page__recent" />
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '~/types/dummyjson'
import { eurosToCents, formatCents } from '~/utils/money'
import type { StockStatus } from '~/types/stock'
import { getStockStatus } from '~/utils/stock'
import { useRecentlyViewedStore } from '~/stores/recentlyViewed'

const API_URL = 'https://dummyjson.com/products'
const DESCRIPTION_MAX_LENGTH = 160

const route = useRoute()
const productId = Number(route.params.id)

// Un identifiant non numérique ne peut pas exister : vraie 404 sans appel réseau.
if (!Number.isInteger(productId) || productId <= 0) {
  throw createError({ statusCode: 404, statusMessage: 'Produit introuvable', fatal: true })
}

const { data: product, error } = await useFetch<Product>(`${API_URL}/${productId}`, {
  key: `product-${productId}`,
})

/*
 * DummyJSON répond 404 pour un identifiant inexistant : on renvoie une vraie
 * 404 (createError), pas une page vide. Une autre erreur (réseau, serveur)
 * n'est pas une 404 : on renvoie une 503 avec un message différent.
 */
if (error.value) {
  const notFound = error.value.statusCode === 404
  throw createError({
    statusCode: notFound ? 404 : 503,
    statusMessage: notFound ? 'Produit introuvable' : 'Le produit est momentanément indisponible',
    fatal: true,
  })
}
if (!product.value) {
  throw createError({ statusCode: 404, statusMessage: 'Produit introuvable', fatal: true })
}

/*
 * F7 : on arrive ici seulement si le produit existe (les 404 / 503 ont levé
 * une erreur plus haut). Appelé pendant le rendu serveur : le cookie
 * recently_viewed est mis à jour dès la réponse HTML.
 */
useRecentlyViewedStore().track(product.value)

const stock = computed<StockStatus>(() => getStockStatus(product.value?.stock ?? 0))

const galleryImages = computed<string[]>(() => {
  const images = product.value?.images ?? []
  return images.length > 0 ? images : [product.value?.thumbnail ?? '']
})

// ---- SEO : titre, description et Open Graph avec image -------------------

function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}…`
}

useSeoMeta({
  title: () => `${product.value?.title ?? 'Produit'} – ChampaShop`,
  description: () => truncate(product.value?.description ?? '', DESCRIPTION_MAX_LENGTH),
  ogTitle: () => product.value?.title ?? 'ChampaShop',
  ogDescription: () => truncate(product.value?.description ?? '', DESCRIPTION_MAX_LENGTH),
  ogImage: () => product.value?.images[0] ?? product.value?.thumbnail,
  ogImageAlt: () => product.value?.title,
  ogType: 'website',
  twitterCard: 'summary_large_image',
})
</script>

<style scoped>
.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.breadcrumb a {
  color: var(--color-text-muted);
  text-transform: capitalize;
}

.breadcrumb a:hover {
  color: var(--color-text);
}

.breadcrumb [aria-current='page'] {
  color: var(--color-text);
  font-weight: 500;
}

.product {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-7);
  margin-bottom: var(--space-7);
}

@media (min-width: 860px) {
  .product {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }

  .product__info {
    position: sticky;
    top: calc(var(--header-height) + var(--space-5));
  }
}

.product__meta {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
}

.product__category {
  color: var(--color-accent);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.product__brand {
  color: var(--color-text-muted);
}

.product__title {
  margin-bottom: var(--space-3);
  font-size: var(--text-4xl);
  letter-spacing: -0.03em;
}

.product__rating {
  color: var(--color-text);
  font-weight: 600;
}

.product__star {
  color: var(--color-star);
}

.product__reviews-count {
  color: var(--color-text-muted);
  font-weight: 400;
}

.product__price {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
  font-size: var(--text-3xl);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.product__badge {
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-sale);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: 0;
}

.product__stock {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
  font-weight: 600;
  font-size: var(--text-sm);
}

.product__stock-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.product__stock--out { color: var(--color-danger); }
.product__stock--low { color: var(--color-warning); }
.product__stock--available { color: var(--color-success); }

.product__compare {
  margin-top: var(--space-3);
}

.product__description {
  margin: var(--space-6) 0;
  color: var(--color-text-muted);
  font-size: var(--text-lg);
  line-height: 1.7;
}

.product__details {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: var(--space-4) var(--space-5);
}

.product__details div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
}

.product__details div + div {
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.product__details dt {
  font-weight: 600;
}

.product__details dd {
  margin: 0;
  text-align: right;
  color: var(--color-text-muted);
}

.product-page__reviews {
  max-width: 760px;
}

.product-page__recent {
  margin-top: var(--space-7);
}
</style>
