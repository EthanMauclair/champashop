<template>
  <main v-if="product" class="product-page">
    <NuxtLink to="/produits" class="back-link">← Retour au catalogue</NuxtLink>

    <article class="product">
      <ProductGallery :images="galleryImages" :title="product.title" />

      <div class="product__info">
        <p class="product__meta">
          <span class="product__category">{{ product.category }}</span>
          <span v-if="product.brand" class="product__brand">{{ product.brand }}</span>
        </p>

        <h1 class="product__title">{{ product.title }}</h1>

        <p class="product__rating">
          <span aria-hidden="true">★</span> {{ product.rating.toFixed(1) }} / 5
          <span class="product__reviews-count">({{ product.reviews.length }} avis)</span>
        </p>

        <p class="product__price">
          {{ formatCents(eurosToCents(product.price)) }}
          <span v-if="product.discountPercentage >= 1" class="product__badge">
            −{{ Math.round(product.discountPercentage) }} %
          </span>
        </p>

        <p class="product__stock" :class="`product__stock--${stock.level}`">
          {{ stock.label }}
        </p>

        <!-- Désactivé et « Rupture de stock » à 0 : géré par le composant -->
        <AddToCartButton :product="product" />

        <p class="product__description">{{ product.description }}</p>

        <dl class="product__details">
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

    <ProductReviews :reviews="product.reviews" />
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '~/types/dummyjson'
import { eurosToCents, formatCents } from '~/utils/money'
import type { StockStatus } from '~/types/stock'
import { getStockStatus } from '~/utils/stock'

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
.product-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
}
.back-link {
  display: inline-block;
  margin-bottom: 1.5rem;
  color: #4338ca;
  font-weight: 500;
}
.product {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2.5rem;
  margin-bottom: 3rem;
}
@media (min-width: 860px) {
  .product {
    grid-template-columns: 1fr 1fr;
  }
}
.product__meta {
  display: flex;
  gap: 0.75rem;
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
}
.product__category {
  color: #4338ca;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.product__brand {
  color: #4b5563;
}
.product__title {
  margin: 0 0 0.5rem;
  font-size: 2rem;
  line-height: 1.2;
}
.product__rating {
  margin: 0 0 1rem;
  color: #92400e;
  font-weight: 600;
}
.product__reviews-count {
  color: #4b5563;
  font-weight: 400;
}
.product__price {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 0.5rem;
  font-size: 2rem;
  font-weight: 700;
}
.product__badge {
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  background: #b91c1c;
  color: #fff;
  font-size: 0.875rem;
}
.product__stock {
  margin: 0 0 1rem;
  font-weight: 600;
}
.product__stock--out { color: #b91c1c; }
.product__stock--low { color: #b45309; }
.product__stock--available { color: #047857; }
.product__description {
  margin: 1.5rem 0;
  line-height: 1.6;
  color: #374151;
}
.product__details {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}
.product__details div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
.product__details dt {
  font-weight: 600;
}
.product__details dd {
  margin: 0;
  text-align: right;
  color: #374151;
}
</style>
