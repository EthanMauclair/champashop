<template>
  <div class="gallery">
    <div class="gallery__main">
      <img
        :src="currentImage"
        :alt="`${title} – image ${selectedIndex + 1} sur ${images.length}`"
        class="gallery__image"
        width="600"
        height="600"
      >
    </div>

    <!-- Miniatures : de vrais boutons, utilisables au clavier -->
    <ul v-if="images.length > 1" class="gallery__thumbs">
      <li v-for="(image, index) in images" :key="`${index}-${image}`">
        <button
          type="button"
          class="gallery__thumb"
          :class="{ 'gallery__thumb--active': index === selectedIndex }"
          :aria-label="`Afficher l'image ${index + 1} sur ${images.length}`"
          :aria-pressed="index === selectedIndex"
          @click="selectedIndex = index"
        >
          <img :src="image" alt="" width="72" height="72" loading="lazy">
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  /** Toutes les images du produit (champ `images` de DummyJSON). */
  images: string[]
  /** Titre du produit, utilisé pour le texte alternatif. */
  title: string
}>()

const selectedIndex = ref<number>(0)

const currentImage = computed<string>(() => props.images[selectedIndex.value] ?? props.images[0] ?? '')
</script>

<style scoped>
.gallery {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.gallery__main {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.gallery__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: var(--space-6);
}

.gallery__thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.gallery__thumb {
  padding: 0;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  overflow: hidden;
  transition: border-color var(--transition);
}

.gallery__thumb:hover {
  border-color: var(--color-border-strong);
}

.gallery__thumb img {
  display: block;
  width: 72px;
  height: 72px;
  object-fit: contain;
  padding: var(--space-1);
}

.gallery__thumb--active,
.gallery__thumb--active:hover {
  border-color: var(--color-text);
}
</style>
