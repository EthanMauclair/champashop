<template>
  <main class="container">
    <h1>Catalogue ChampaShop</h1>
    
    <p v-if="pending">Chargement des produits en cours...</p>

    <!-- Utilisation du composant avec une grille CSS -->
    <div v-else class="product-grid">
      <ProductCard 
        v-for="product in data?.products" 
        :key="product.id" 
        :product="product" 
      />
    </div>
  </main>
</template>

<script setup lang="ts">
// 1. On définit la structure d'un produit
interface Product {
  id: number;
  title: string;
  price: number;
  thumbnail: string;
}

// 2. On définit la structure de la réponse globale de l'API DummyJSON
interface DummyJsonResponse {
  products: Product[];
}

// 3. On indique à useFetch le type de données attendu via <DummyJsonResponse>
const { data, pending } = await useFetch<DummyJsonResponse>('https://dummyjson.com/products')
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
h1 {
  text-align: center;
  margin-bottom: 2rem;
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 2rem;
}
</style>