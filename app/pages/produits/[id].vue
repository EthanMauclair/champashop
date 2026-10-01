<template>
  <main class="product-page">
    <NuxtLink to="/produits" class="back-link">
      &larr; Retour au catalogue
    </NuxtLink>

    <div v-if="pending" class="loading">Chargement du produit...</div>
    <div v-else-if="error" class="error">Erreur lors du chargement du produit.</div>
    
    <div v-else-if="product" class="product-container">
      
      <!-- Colonne Image -->
      <div class="product-image-container">
        <img :src="product.thumbnail" :alt="product.title" >
      </div>

      <!-- Colonne Informations -->
      <div class="product-info">
        
        <!-- Catégorie et Marque -->
        <div class="meta-info">
          <span class="category">{{ product.category }}</span>
          <span v-if="product.brand" class="brand">| {{ product.brand }}</span>
        </div>
        
        <h1 class="title">{{ product.title }}</h1>
        
        <!-- Note (Rating) -->
        <div class="rating">
          ⭐ {{ product.rating }} / 5
        </div>

        <p class="description">{{ product.description }}</p>
        
        <!-- Informations de garantie et livraison -->
        <div class="extra-details">
          <p>🛡️ <strong>Garantie :</strong> {{ product.warrantyInformation }}</p>
          <p>📦 <strong>Livraison :</strong> {{ product.shippingInformation }}</p>
        </div>
        
        <div class="price">{{ product.price }} €</div>

        <!-- Informations de Stock dynamique -->
        <div class="stock-info">
          <p v-if="product.stock === 0" class="stock-empty">Rupture de stock</p>
          <p v-else-if="product.stock < 5" class="stock-warning">Plus que {{ product.stock }} en stock</p>
          <p v-else class="stock-ok">En stock ({{ product.stock }})</p>
        </div>

        <!-- Bouton d'action avec blocage si rupture -->
        <button 
          class="add-button" 
          :disabled="product.stock === 0"
        >
          {{ product.stock === 0 ? 'Indisponible' : 'Ajouter au panier' }}
        </button>
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
  brand?: string
  rating: number
  stock: number
  warrantyInformation: string
  shippingInformation: string
}

const route = useRoute()
const productId = route.params.id

const { data: product, pending, error } = await useFetch<Product>(`https://dummyjson.com/products/${productId}`)

if (error.value) {
  throw createError({ 
    statusCode: 404, 
    statusMessage: 'Produit introuvable', 
    fatal: true 
  })
}

if (product.value) {
  useSeoMeta({
    title: `${product.value.title} - ChampaShop`,
    description: product.value.description
  })
}
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

.meta-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.category {
  color: #2563eb;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.brand {
  color: #6b7280;
  font-size: 0.9rem;
  font-weight: 500;
}

.title {
  font-size: 2.25rem;
  font-weight: 800;
  color: #111827;
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
}

.rating {
  color: #f59e0b;
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.description {
  color: #4b5563;
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.extra-details {
  background-color: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 1px solid #e5e7eb;
}

.extra-details p {
  margin: 0.25rem 0;
  color: #374151;
  font-size: 0.95rem;
}

.price {
  font-size: 3rem;
  font-weight: 800;
  color: #111827;
  margin-bottom: 1rem;
}

.stock-info {
  margin-bottom: 1.5rem;
  font-weight: 700;
  font-size: 1.05rem;
}

.stock-empty { color: #ef4444; }
.stock-warning { color: #f97316; }
.stock-ok { color: #10b981; }

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
  transition: background-color 0.2s, opacity 0.2s;
}

.add-button:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.add-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
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