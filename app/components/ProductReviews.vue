<template>
  <section class="reviews" aria-labelledby="reviews-title">
    <h2 id="reviews-title">Avis clients ({{ reviews.length }})</h2>
    <p v-if="reviews.length === 0">Aucun avis pour le moment.</p>
    <ul v-else class="reviews__list">
      <li v-for="review in reviews" :key="`${review.reviewerName}-${review.date}`" class="reviews__item">
        <p class="reviews__header">
          <strong>{{ review.reviewerName }}</strong>
          <span class="reviews__rating">
            <span aria-hidden="true">{{ stars(review.rating) }}</span>
            <span class="visually-hidden">Note : {{ review.rating }} sur 5</span>
          </span>
        </p>
        <p class="reviews__comment">{{ review.comment }}</p>
        <p class="reviews__date">
          <time :datetime="review.date">{{ formatDate(review.date) }}</time>
        </p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { Review } from '~/types/dummyjson'

defineProps<{
  reviews: Review[]
}>()

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' }) // même rendu serveur et client

/** « ★★★★☆ » ; la note est bornée entre 0 et 5 (repeat() refuse un nombre négatif). */
function stars(rating: number): string {
  const full = Math.round(Math.min(5, Math.max(0, rating)))
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date)
}
</script>

<style scoped>
.reviews h2 {
  font-size: 1.25rem;
  margin: 0 0 1rem;
}
.reviews__list {
  display: grid;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.reviews__item {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}
.reviews__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 0 0.5rem;
}
.reviews__rating {
  color: #b45309;
  letter-spacing: 0.1em;
}
.reviews__comment {
  margin: 0 0 0.25rem;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.reviews__date {
  margin: 0;
  color: #4b5563;
  font-size: 0.875rem;
}
</style>
