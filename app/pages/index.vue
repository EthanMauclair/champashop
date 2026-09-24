<template>
  <main>
    <h1>Catalogue ChampaShop</h1>
    
    <!-- Message affiché pendant que Nuxt va chercher les données -->
    <p v-if="pending">Chargement des produits en cours...</p>

    <!-- Affichage de la liste une fois les données reçues -->
    <ul v-else>
      <!-- On boucle sur le tableau "products" renvoyé par l'API -->
      <li v-for="product in data.products" :key="product.id">
        <strong>{{ product.title }}</strong> - {{ product.price }} €
      </li>
    </ul>
  </main>
</template>

<script setup lang="ts">
// useFetch appelle l'API DummyJSON. 
// "data" contiendra la réponse, et "pending" sera vrai pendant le chargement.
const { data, pending } = await useFetch('https://dummyjson.com/products')
</script>

<style scoped>
/* Un peu de style basique pour aérer la liste */
ul {
  list-style-type: none;
  padding: 0;
}
li {
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}
</style>