<template>
  <article class="product-card">
    <div class="image-container">
      <!-- Badge de réduction -->
      <span v-if="product.discountPercentage" class="discount-badge">
        -{{ Math.round(product.discountPercentage) }} %
      </span>
      <img :src="product.thumbnail" :alt="product.title" class="product-image" />
    </div>
    
    <h2 class="product-title">{{ product.title }}</h2>
    
    <!-- Note sur 5 -->
    <div class="product-rating" v-if="product.rating">
      ⭐ {{ product.rating }} / 5
    </div>
    
    <p class="product-price">{{ product.price }} €</p>
  </article>
</template>

<script setup lang="ts">
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
  position: relative;
  background: white;
}
.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.image-container {
  position: relative;
  display: inline-block;
  width: 100%;
}
.product-image {
  max-width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
}
.discount-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: #e74c3c;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: bold;
}
.product-title {
  font-size: 1.1rem;
  margin: 0.5rem 0;
  height: 2.5rem;
  overflow: hidden;
}
.product-rating {
  color: #f39c12;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}
.product-price {
  font-weight: bold;
  color: #2c3e50;
  font-size: 1.2rem;
}
</style>