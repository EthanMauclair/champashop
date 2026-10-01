<template>
  <article class="product-card">
    <!-- La carte est cliquable vers la fiche produit. Le bouton « Ajouter au
         panier » reste EN DEHORS du lien : un bouton dans un <a> est du HTML
         invalide et déclencherait la navigation. -->
    <NuxtLink :to="`/produits/${product.id}`" class="product-card__link">
      <div class="product-card__media">
        <img
          :src="product.thumbnail"
          :alt="product.title"
          class="product-card__image"
          width="300"
          height="300"
          loading="lazy"
        >
        <span v-if="discount > 0" class="product-card__badge">−{{ discount }} %</span>
      </div>

      <div class="product-card__body">
        <p class="product-card__category">{{ product.category }}</p>
        <h2 class="product-card__title">{{ product.title }}</h2>
        <p v-if="product.rating !== undefined" class="product-card__rating">
          <span class="product-card__star" aria-hidden="true">★</span>
          {{ product.rating.toFixed(1) }}
          <span class="visually-hidden">sur 5</span>
        </p>
        <p class="product-card__price">{{ formatCents(eurosToCents(product.price)) }}</p>
      </div>
    </NuxtLink>

    <div class="product-card__actions">
      <AddToCartButton :product="product" compact />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ProductPreview } from '~/types/dummyjson'
import { eurosToCents, formatCents } from '~/utils/money'

const props = defineProps<{
  product: ProductPreview
}>()

/** Badge « −X % » : discountPercentage sert uniquement à l'affichage. */
const discount = computed<number>(() => Math.round(props.product.discountPercentage ?? 0))
</script>

<style scoped>
.product-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: box-shadow var(--transition), transform var(--transition), border-color var(--transition);
}

.product-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.product-card__link {
  display: flex;
  flex: 1;
  flex-direction: column;
  color: inherit;
  text-decoration: none;
}

.product-card__link:hover {
  color: inherit;
}

.product-card__link:focus-visible {
  outline-offset: -3px;
}

.product-card__media {
  position: relative;
  aspect-ratio: 1;
  background: var(--color-surface-muted);
}

.product-card__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: var(--space-4);
  transition: transform 300ms ease;
}

.product-card:hover .product-card__image {
  transform: scale(1.04);
}

.product-card__badge {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-sale);
  color: #fff;
  font-size: var(--text-xs);
  font-weight: 700;
}

.product-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4) var(--space-4) 0;
}

.product-card__category {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.product-card__title {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  font-size: var(--text-base);
  font-weight: 600;
  letter-spacing: -0.01em;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.product-card__rating {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.product-card__star {
  color: var(--color-star);
}

.product-card__price {
  margin: auto 0 0;
  padding-top: var(--space-2);
  font-size: var(--text-lg);
  font-weight: 700;
}

.product-card__actions {
  padding: var(--space-3) var(--space-4) var(--space-4);
}
</style>
