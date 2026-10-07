<template>
  <main class="container compare-page">
    <header class="page-header">
      <!-- tabindex="-1" : reçoit le focus quand le bouton « Remplacer » disparaît -->
      <h1 ref="titleRef" class="page-header__title compare-page__title" tabindex="-1">Comparateur</h1>
      <p class="page-header__subtitle">Comparez jusqu'à {{ COMPARE_MAX }} produits côte à côte.</p>
    </header>

    <!-- Lien reçu d'un tiers : on affiche l'URL, mais la sélection du
         visiteur n'est jamais écrasée sans son accord. -->
    <div v-if="showReplaceNotice" class="notice compare-page__notice">
      <p class="compare-page__notice-text">
        Cette comparaison vient d'un lien et ne correspond pas à votre sélection
        <template v-if="compare.count > 0">({{ compare.count }} produit{{ compare.count > 1 ? 's' : '' }})</template>.
        Votre sélection n'a pas été modifiée.
      </p>
      <div class="compare-page__notice-actions">
        <button type="button" class="btn btn--primary btn--sm" @click="replaceSelection">
          Remplacer ma sélection par celle-ci
        </button>
        <NuxtLink v-if="compare.count > 0" :to="toComparePath(compare.ids)" class="btn btn--secondary btn--sm">
          Voir ma sélection
        </NuxtLink>
      </div>
    </div>
    <p class="compare-page__status" role="status">{{ statusMessage }}</p>

    <!-- Échec d'un produit (réseau…) : les autres restent affichés. -->
    <div v-if="result.failedIds.length > 0" class="state state--error compare-page__error" role="alert">
      <p>{{ failedMessage }}</p>
      <button type="button" class="btn btn--primary" :disabled="status === 'pending'" @click="retry">Réessayer</button>
    </div>

    <div v-if="result.products.length === 0 && result.failedIds.length === 0" class="state">
      <p>Aucun produit à comparer</p>
      <div class="compare-page__empty-actions">
        <NuxtLink to="/produits" class="btn btn--primary">Parcourir le catalogue</NuxtLink>
        <NuxtLink v-if="compare.count > 0" :to="toComparePath(compare.ids)" class="btn btn--secondary">
          Voir ma sélection ({{ compare.count }})
        </NuxtLink>
      </div>
    </div>

    <template v-else-if="result.products.length > 0">
      <div class="compare-page__toolbar">
        <label class="compare-page__toggle">
          <input v-model="onlyDifferences" type="checkbox" class="compare-page__checkbox">
          Afficher uniquement les différences
        </label>
        <CopyLinkButton :url="shareUrl" />
      </div>

      <CompareTable :products="result.products" :only-differences="onlyDifferences" />
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { CompareLoadResult, CompareProduct, CompareTableProduct } from '~/types/compare'
import { useCompareStore } from '~/stores/compare'
import {
  COMPARE_MAX,
  formatCompareIds,
  isCanonicalCompareQuery,
  isSameSelection,
  parseCompareIds,
  splitCompareResults,
  toComparePath,
} from '~/utils/compare'

/*
 * L'URL est la source de vérité : la page est recréée à chaque changement
 * d'URL (lien de la barre, normalisation…), donc toujours lue depuis l'URL.
 */
definePageMeta({
  key: (route) => route.fullPath,
})

const API_URL = 'https://dummyjson.com/products'
/** On ne demande à l'API que les champs affichés dans le tableau. */
const COMPARE_TABLE_FIELDS = [
  'title',
  'thumbnail',
  'price',
  'discountPercentage',
  'rating',
  'availabilityStatus',
  'stock',
  'brand',
  'category',
  'weight',
  'dimensions',
  'warrantyInformation',
  'shippingInformation',
].join(',')

const route = useRoute()
const compare = useCompareStore()
const titleRef = ref<HTMLHeadingElement | null>(null)
const onlyDifferences = ref<boolean>(false)
const statusMessage = ref<string>('')

/** Identifiants valides de l'URL (non numériques, doublons, au-delà de 3 : ignorés). */
const requestedIds = parseCompareIds(route.query.ids)

/**
 * Produits chargés en parallèle (DummyJSON ne sait pas renvoyer plusieurs
 * produits par identifiants). Promise.allSettled : l'échec d'un produit
 * n'empêche pas l'affichage des autres, et la page ne lève jamais d'erreur.
 */
async function loadProducts(): Promise<CompareLoadResult> {
  const results = await Promise.allSettled(
    requestedIds.map((id) =>
      $fetch<Omit<CompareTableProduct, 'id'>>(`${API_URL}/${id}`, { query: { select: COMPARE_TABLE_FIELDS } }),
    ),
  )
  return splitCompareResults(requestedIds, results)
}

const { data, refresh, status } = await useAsyncData<CompareLoadResult>(
  `compare-page-${formatCompareIds(requestedIds)}`,
  loadProducts,
  { default: (): CompareLoadResult => ({ products: [], notFoundIds: [], failedIds: [] }) },
)

const result = computed<CompareLoadResult>(() => data.value)

/** Identifiants gardés dans l'URL : ceux de l'URL, sans les produits inexistants. */
const validIds = computed<number[]>(() => requestedIds.filter((id) => !result.value.notFoundIds.includes(id)))

/**
 * URL invalide (non numérique, doublon, plus de 3, produit inexistant) :
 * elle est remplacée par sa forme normalisée, sans nouvelle entrée dans
 * l'historique. Côté serveur, c'est une redirection : jamais d'erreur 500.
 */
async function normalizeUrl(): Promise<void> {
  if (!isCanonicalCompareQuery(route.query.ids, validIds.value)) {
    await navigateTo(toComparePath(validIds.value), { replace: true })
  }
}

await normalizeUrl()

const failedMessage = computed<string>(() => {
  const ids = result.value.failedIds
  const list = ids.map((id) => `n° ${id}`).join(', ')
  return ids.length > 1
    ? `Ces produits n’ont pas pu être chargés pour le moment (${list}).`
    : `Ce produit n’a pas pu être chargé pour le moment (${list}).`
})

async function retry(): Promise<void> {
  await refresh()
  await normalizeUrl()
}

/** Lien absolu à partager (même hôte que la page en cours). */
const requestUrl = useRequestURL()
const shareUrl = computed<string>(() => `${requestUrl.origin}${toComparePath(validIds.value)}`)

const showReplaceNotice = computed<boolean>(
  () => validIds.value.length > 0 && !isSameSelection(validIds.value, compare.ids),
)

/** Bouton « Remplacer ma sélection par celle-ci » : seule façon d'écraser la sélection. */
async function replaceSelection(): Promise<void> {
  const knownProducts: CompareProduct[] = result.value.products.map(({ id, title, thumbnail }) => ({
    id,
    title,
    thumbnail,
  }))
  compare.replace(validIds.value, knownProducts)
  statusMessage.value = 'Votre sélection a été remplacée par celle de ce lien.'
  // Le bouton disparaît : le focus est replacé sur le titre de la page.
  await nextTick()
  titleRef.value?.focus()
}

useSeoMeta({
  title: () =>
    result.value.products.length > 0
      ? `Comparer ${result.value.products.map((product) => product.title).join(', ')}`
      : 'Comparateur',
  description: 'Comparez jusqu’à 3 produits ChampaShop : prix, remise, note, stock, dimensions, garantie et livraison.',
  ogTitle: 'Comparateur – ChampaShop',
  ogDescription: 'Comparez jusqu’à 3 produits côte à côte.',
  ogType: 'website',
})
</script>

<style scoped>
.compare-page__title {
  outline-offset: 4px;
}

.compare-page__notice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.compare-page__notice-text {
  flex: 1 1 22rem;
  margin: 0;
}

.compare-page__notice-actions,
.compare-page__empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
}

.compare-page__status {
  margin: 0 0 var(--space-4);
  color: var(--color-success);
  font-weight: 600;
}

.compare-page__status:empty {
  margin: 0;
}

.compare-page__error {
  margin-bottom: var(--space-5);
  padding: var(--space-5);
}

.compare-page__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3) var(--space-5);
  margin-bottom: var(--space-4);
}

.compare-page__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 36px;
  font-weight: 500;
  cursor: pointer;
}

.compare-page__checkbox {
  width: 1.125rem;
  height: 1.125rem;
  accent-color: var(--color-accent);
}
</style>
