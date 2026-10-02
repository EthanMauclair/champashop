<template>
  <main>
    <!-- Bandeau d'accueil -->
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero__inner">
        <p class="hero__eyebrow">La boutique en ligne troyenne</p>
        <h1 id="hero-title" class="hero__title">Tout ce qu'il vous faut, <span>en quelques clics.</span></h1>
        <p class="hero__text">
          Beauté, maison, high-tech, épicerie : plus de 190 produits sélectionnés,
          livrés chez vous et offerts dès 80 € d'achat.
        </p>
        <div class="hero__actions">
          <NuxtLink to="/produits" class="btn btn--primary">Voir le catalogue</NuxtLink>
          <NuxtLink :to="{ path: '/produits', query: { category: 'beauty' } }" class="btn btn--secondary">
            Offre beauté
          </NuxtLink>
        </div>
      </div>
    </section>

    <div class="container">
      <!-- Avantages (règles du moteur de promotions) -->
      <ul class="perks">
        <li class="perk card">
          <p class="perk__title">Livraison offerte</p>
          <p class="perk__text">Dès 80 € d'achat (hors mobilier).</p>
        </li>
        <li class="perk card">
          <p class="perk__title">−10 % beauté</p>
          <p class="perk__text">Dès 3 produits beauté dans votre panier.</p>
        </li>
        <li class="perk card">
          <p class="perk__title">Code TROYES10</p>
          <p class="perk__text">10 € offerts dès 50 € d'achat.</p>
        </li>
      </ul>

      <!-- Produits vus récemment (F7) : absent si l'historique est vide -->
      <RecentlyViewed />

      <!-- Catégories -->
      <section class="section" aria-labelledby="categories-title">
        <div class="section__header">
          <h2 id="categories-title">Parcourir par catégorie</h2>
        </div>
        <ul class="categories">
          <li v-for="category in categories ?? []" :key="category.slug">
            <NuxtLink :to="{ path: '/produits', query: { category: category.slug } }" class="category-chip">
              {{ category.name }}
            </NuxtLink>
          </li>
        </ul>
      </section>

      <!-- Produits les mieux notés -->
      <section class="section" aria-labelledby="top-title">
        <div class="section__header">
          <h2 id="top-title">Les mieux notés</h2>
          <NuxtLink :to="{ path: '/produits', query: { sortBy: 'rating', order: 'desc' } }" class="section__link">
            Tout voir →
          </NuxtLink>
        </div>

        <div v-if="topError" class="state state--error" role="alert">
          <p>Impossible de charger les produits pour le moment.</p>
          <button type="button" class="btn btn--primary" @click="refreshTop()">Réessayer</button>
        </div>
        <ul v-else class="product-grid">
          <li v-for="product in topRated?.products ?? []" :key="product.id">
            <ProductCard :product="product" />
          </li>
        </ul>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import type { CatalogProduct } from '~/types/catalog'
import type { Category, ProductsResponse } from '~/types/dummyjson'
import { CATALOG_FIELDS } from '~/utils/catalog'

const API_URL = 'https://dummyjson.com/products'
const TOP_RATED_COUNT = 8

const { data: categories } = await useFetch<Category[]>(`${API_URL}/categories`, {
  key: 'catalog-categories',
})

const { data: topRated, error: topError, refresh: refreshTop } = await useFetch<ProductsResponse<CatalogProduct>>(API_URL, {
  key: 'home-top-rated',
  query: { sortBy: 'rating', order: 'desc', limit: TOP_RATED_COUNT, select: CATALOG_FIELDS },
})

useSeoMeta({
  title: 'ChampaShop – La boutique en ligne troyenne',
  description: 'Beauté, maison, high-tech et épicerie : plus de 190 produits, livraison offerte dès 80 €, −10 % dès 3 produits beauté.',
  ogTitle: 'ChampaShop – La boutique en ligne troyenne',
  ogDescription: 'Plus de 190 produits, livraison offerte dès 80 € et code TROYES10.',
  ogType: 'website',
})
</script>

<style scoped>
.hero {
  background:
    radial-gradient(60rem 30rem at 85% -10%, var(--color-accent-soft), transparent 60%),
    var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.hero__inner {
  max-width: var(--container-width);
  margin: 0 auto;
  padding: var(--space-8) var(--space-5);
}

.hero__eyebrow {
  display: inline-block;
  margin-bottom: var(--space-4);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  background: var(--color-accent-soft);
  color: var(--color-accent-hover);
  font-size: var(--text-sm);
  font-weight: 600;
}

.hero__title {
  max-width: 14ch;
  margin-bottom: var(--space-4);
  font-size: var(--text-4xl);
  font-weight: 800;
  letter-spacing: -0.04em;
}

.hero__title span {
  color: var(--color-text-muted);
}

.hero__text {
  max-width: 52ch;
  margin-bottom: var(--space-6);
  color: var(--color-text-muted);
  font-size: var(--text-lg);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.perks {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
  margin: 0 0 var(--space-7);
  padding: 0;
  list-style: none;
}

.perk {
  padding: var(--space-4) var(--space-5);
}

.perk__title {
  margin-bottom: var(--space-1);
  font-weight: 700;
}

.perk__text {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.section {
  margin-bottom: var(--space-7);
}

.section__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.section__header h2 {
  margin: 0;
  font-size: var(--text-2xl);
}

.section__link {
  font-weight: 600;
  text-decoration: none;
}

.categories {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text);
  font-weight: 500;
  text-decoration: none;
  transition: border-color var(--transition), background-color var(--transition);
}

.category-chip:hover {
  border-color: var(--color-text);
  color: var(--color-text);
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-5);
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
