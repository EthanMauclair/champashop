/**
 * Store Pinia du comparateur de produits (F6).
 *
 * - Les règles (maximum de 3, bascule, lecture d'une valeur corrompue) sont
 *   dans des fonctions pures : utils/compare.ts.
 * - Le cookie `compare` (identifiants uniquement) est lu par `useCookie` côté
 *   serveur : la sélection est présente dès le rendu SSR, et l'état Pinia est
 *   transmis au client par le payload Nuxt (pas de flash de la barre).
 */
import { defineStore } from 'pinia'
import { useCookie } from '#app'
import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { CompareProduct, CompareToggleResult } from '../types/compare'
import { COMPARE_MAX, parseCompareIds, serializeCompareCookie, toggleCompare } from '../utils/compare'

const COMPARE_COOKIE = 'compare'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 jours

const DUMMYJSON_PRODUCTS_URL = 'https://dummyjson.com/products'
/** On ne demande à l'API que les champs affichés dans la barre. */
const COMPARE_PRODUCT_FIELDS = 'title,thumbnail'

/** Type de retour explicite du store (exigé par les consignes). */
export interface CompareStore {
  // état
  /** Identifiants sélectionnés, dans l'ordre de sélection (3 maximum). */
  ids: Ref<number[]>
  /** Informations des produits déjà connus, par identifiant. */
  products: Ref<Record<number, CompareProduct>>
  // valeurs calculées
  count: ComputedRef<number>
  isFull: ComputedRef<boolean>
  // actions
  has: (id: number) => boolean
  toggle: (product: CompareProduct) => CompareToggleResult
  remove: (id: number) => void
  replace: (ids: number[], knownProducts?: CompareProduct[]) => void
  loadProducts: () => Promise<void>
}

/** Vrai si l'erreur est une réponse HTTP 404 de $fetch (produit supprimé). */
function isNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 404
}

export const useCompareStore = defineStore('compare', (): CompareStore => {
  /*
   * encode / decode identité : on lit la valeur brute pour la valider
   * nous-mêmes avec parseCompareIds (le décodage par défaut de Nuxt
   * accepterait n'importe quoi).
   */
  const cookie = useCookie<string | null>(COMPARE_COOKIE, {
    default: () => null,
    maxAge: COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
    path: '/',
    encode: (value: string | null): string => value ?? '',
    decode: (value: string): string => value,
  })

  // ---- état -------------------------------------------------------------
  const ids = ref<number[]>(parseCompareIds(cookie.value))
  const products = ref<Record<number, CompareProduct>>({})

  // ---- valeurs calculées ------------------------------------------------
  const count = computed<number>(() => ids.value.length)
  const isFull = computed<boolean>(() => ids.value.length >= COMPARE_MAX)

  // ---- persistance ------------------------------------------------------
  /** Écrit le cookie seulement s'il change (évite un Set-Cookie inutile). */
  function persist(nextIds: number[]): void {
    ids.value = nextIds
    const nextValue = nextIds.length > 0 ? serializeCompareCookie(nextIds) : null
    if ((cookie.value ?? null) !== nextValue) {
      // null supprime le cookie
      cookie.value = nextValue
    }
  }

  /*
   * Cookie modifié à la main (valeurs non numériques, doublons, plus de 3
   * identifiants…) : il est réécrit avec la version propre (ou supprimé).
   */
  if (cookie.value) {
    persist(ids.value)
  }

  function rememberProduct(product: CompareProduct): void {
    products.value = {
      ...products.value,
      [product.id]: { id: product.id, title: product.title, thumbnail: product.thumbnail },
    }
  }

  // ---- actions ----------------------------------------------------------
  function has(id: number): boolean {
    return ids.value.includes(id)
  }

  /**
   * Bouton « Comparer » : ajoute ou retire le produit. Le résultat indique
   * si l'ajout a été refusé (comparateur plein) pour que le composant
   * annonce le message aux lecteurs d'écran.
   */
  function toggle(product: CompareProduct): CompareToggleResult {
    const result = toggleCompare(ids.value, product.id)
    if (!result.rejected) {
      rememberProduct(product)
      persist(result.ids)
    }
    return result
  }

  function remove(id: number): void {
    persist(ids.value.filter((existing) => existing !== id))
  }

  /**
   * Remplace toute la sélection (bouton « Remplacer ma sélection par
   * celle-ci » de la page /comparer). Les identifiants repassent par
   * parseCompareIds : on n'écrit jamais une valeur invalide dans le cookie.
   */
  function replace(nextIds: number[], knownProducts: CompareProduct[] = []): void {
    for (const product of knownProducts) {
      rememberProduct(product)
    }
    persist(parseCompareIds(nextIds))
  }

  /**
   * Charge la miniature et le titre des produits sélectionnés qu'on ne
   * connaît pas encore (cas d'un rechargement : le cookie ne contient que
   * les identifiants). 3 requêtes au maximum, en parallèle, avec `select`.
   * - Produit supprimé (404) : retiré de la sélection.
   * - Autre erreur (réseau…) : le produit reste sélectionné, la barre
   *   affiche son numéro à la place de la miniature.
   */
  async function loadProducts(): Promise<void> {
    const missingIds = ids.value.filter((id) => !products.value[id])
    if (missingIds.length === 0) {
      return
    }

    const results = await Promise.allSettled(
      missingIds.map((id) =>
        $fetch<Omit<CompareProduct, 'id'>>(`${DUMMYJSON_PRODUCTS_URL}/${id}`, {
          query: { select: COMPARE_PRODUCT_FIELDS },
        }),
      ),
    )

    const deletedIds: number[] = []
    for (const [index, result] of results.entries()) {
      const id = missingIds[index]
      if (id === undefined) {
        continue
      }
      if (result.status === 'fulfilled') {
        // On force l'id demandé : on ne dépend pas de sa présence dans `select`.
        rememberProduct({ ...result.value, id })
      } else if (isNotFoundError(result.reason)) {
        deletedIds.push(id)
      }
    }

    if (deletedIds.length > 0) {
      persist(ids.value.filter((id) => !deletedIds.includes(id)))
    }
  }

  return { ids, products, count, isFull, has, toggle, remove, replace, loadProducts }
})
