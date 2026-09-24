<template>
  <article class="skeleton-card">
    <div class="skeleton-image"></div>
    <div class="skeleton-title"></div>
    <div class="skeleton-rating"></div>
    <div class="skeleton-price"></div>
  </article>
</template>

<style scoped>
/* Animation de clignotement doux (pulse) */
@keyframes pulse {
  0% { background-color: #f0f0f0; }
  50% { background-color: #e0e0e0; }
  100% { background-color: #f0f0f0; }
}

.skeleton-card {
  border: 1px solid #eaeaea;
  border-radius: 8px;
  padding: 1rem;
  background: white;
}

.skeleton-image, .skeleton-title, .skeleton-rating, .skeleton-price {
  animation: pulse 1.5s infinite ease-in-out;
  border-radius: 4px;
}

.skeleton-image {
  width: 100%;
  height: 150px;
  margin-bottom: 1rem;
}

.skeleton-title {
  height: 1.5rem;
  width: 80%;
  margin: 0 auto 0.5rem auto;
}

.skeleton-rating {
  height: 1rem;
  width: 50%;
  margin: 0 auto 0.5rem auto;
}

.skeleton-price {
  height: 1.5rem;
  width: 40%;
  margin: 0 auto;
}
</style>