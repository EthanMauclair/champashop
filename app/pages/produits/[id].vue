<template>
  <main class="product-page">
    <!-- Bouton de retour -->
    <NuxtLink to="/produits" class="back-link">
      &larr; Retour au catalogue
    </NuxtLink>

    <!-- États de chargement -->
    <div v-if="pending" class="loading">Chargement du produit...</div>
    <div v-else-if="error" class="error">Erreur lors du chargement du produit.</div>
    
    <!-- Fiche produit -->
    <div v-else-if="product" class="product-container">
      
      <!-- Colonne Image -->
      <div class="product-image-container">
        <img :src="product.thumbnail" :alt="product.title" />
      </div>

      <!-- Colonne Informations -->
      <div class="product-info">
        <span class="category">{{ product.category }}</span>
        <h1 class="title">{{ product.title }}</h1>
        <p class="description">{{ product.description }}</p>
        
        <div class="price">{{ product.price }} €</div>

        <!-- Bouton d'action -->
        <button class="add-button">Ajouter au panier</button>
      </div>

    </div>
  </main>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

interface Product {
  id: number
  title: string
  description: string
  price: number
  thumbnail: string
  category: string
}

const route = useRoute()
const productId = route.params.id

const { data: product, pending, error } = await useFetch<Product>(`https://dummyjson.com/products/${productId}`)
</script>

<style scoped>
.product-page {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
  font-family: system-ui, -apple-system, sans-serif;
}

.back-link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
  margin-bottom: 2rem;
  display: inline-block;
}

.back-link:hover {
  text-decoration: underline;
}

.product-container {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  background-color: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #f3f4f6;
}

@media (min-width: 768px) {
  .product-container {
    flex-direction: row;
  }
}

.product-image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9fafb;
  border-radius: 8px;
  padding: 2rem;
}

.product-image-container img {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.product-image-container img:hover {
  transform: scale(1.05);
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.category {
  color: #2563eb;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.title {
  font-size: 2.25rem;
  font-weight: 800;
  color: #111827;
  margin: 0 0 1rem 0;
  line-height: 1.2;
}

.description {
  color: #4b5563;
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.price {
  font-size: 3rem;
  font-weight: 800;
  color: #111827;
  margin-bottom: 2rem;
}

.add-button {
  width: 100%;
  background-color: #2563eb;
  color: white;
  font-weight: 700;
  font-size: 1.125rem;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-button:hover {
  background-color: #1d4ed8;
}

.loading, .error {
  text-align: center;
  padding: 3rem;
  font-size: 1.2rem;
  color: #6b7280;
}

.error {
  color: #ef4444;
  background-color: #fef2f2;
  border-radius: 8px;
}
</style>