<template>
  <NuxtLayout>
    <main class="error-page">
      <p class="error-page__code">{{ error.statusCode }}</p>
      <h1 class="error-page__title">{{ title }}</h1>
      <p class="error-page__text">{{ message }}</p>
      <button type="button" class="error-page__button" @click="backToCatalogue">
        Retour au catalogue
      </button>
    </main>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NuxtError } from '#app'

/**
 * Page d'erreur globale (404, 503…). Elle reçoit l'erreur levée par
 * createError, par exemple sur une fiche produit inexistante.
 */
const props = defineProps<{
  error: NuxtError
}>()

const isNotFound = computed<boolean>(() => props.error.statusCode === 404)

const title = computed<string>(() => (isNotFound.value ? 'Page introuvable' : 'Une erreur est survenue'))

const message = computed<string>(() =>
  isNotFound.value
    ? (props.error.statusMessage || 'La page ou le produit demandé n\'existe pas.')
    : 'Le service est momentanément indisponible. Merci de réessayer dans quelques instants.',
)

useSeoMeta({
  title: () => `${title.value} – ChampaShop`,
  robots: 'noindex',
})

function backToCatalogue(): void {
  clearError({ redirect: '/produits' })
}
</script>

<style scoped>
.error-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 5rem 2rem;
  text-align: center;
}
.error-page__code {
  margin: 0;
  font-size: 4rem;
  font-weight: 800;
  color: #4f46e5;
}
.error-page__title {
  margin: 0.5rem 0 1rem;
}
.error-page__text {
  margin: 0 0 2rem;
  color: #4b5563;
}
.error-page__button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 999px;
  background: #111827;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
}
.error-page__button:focus-visible {
  outline: 3px solid #4f46e5;
  outline-offset: 2px;
}
</style>
