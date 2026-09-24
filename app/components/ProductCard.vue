<template>
  <article class="product-card">
    <img :src="product.thumbnail" :alt="product.title" class="product-image" />
    <h2 class="product-title">{{ product.title }}</h2>
    <p class="product-price">{{ product.price }} €</p>
  </article>
</template>

<script setup lang="ts">
// On indique au composant qu'il va recevoir un objet "product" depuis la page parente
defineProps({
  product: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.product-card {
  border: 1px solid #eaeaea;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  transition: transform 0.2s;
}
.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.product-image {
  max-width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
}
.product-title {
  font-size: 1.1rem;
  margin: 0.5rem 0;
}
.product-price {
  font-weight: bold;
  color: #2c3e50;
  font-size: 1.2rem;
}
</style>