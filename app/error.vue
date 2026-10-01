<template>
  <NuxtLayout>
    <main class="error-page">
      <p class="error-page__code">{{ error.statusCode }}</p>
      <h1 class="error-page__title">{{ title }}</h1>
      <p class="error-page__text">{{ message }}</p>
      <button type="button" class="btn btn--primary" @click="backToCatalogue">
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
  padding: var(--space-8) var(--space-5);
  text-align: center;
}

.error-page__code {
  margin: 0;
  font-size: clamp(4rem, 12vw, 7rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.05em;
  color: var(--color-accent);
}

.error-page__title {
  margin: var(--space-4) 0 var(--space-3);
}

.error-page__text {
  margin-bottom: var(--space-6);
  color: var(--color-text-muted);
}
</style>
