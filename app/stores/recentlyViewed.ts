/**
 * Store Pinia des produits vus récemment (F7).
 *
 * - Les règles (ordre, doublons, maximum, cookie corrompu) sont dans des
 *   fonctions pures : utils/recentlyViewed.ts.
 * - Le cookie `recently_viewed` (identifiants uniquement, 30 jours,
 *   sameSite lax) est lu par `useCookie` côté serveur : la liste est présente
 *   dès le HTML serveur, et l'état Pinia est transmis au client par le
 *   payload Nuxt (pas de flash, pas d'erreur d'hydratation).
 */
import { defineStore } from 'pinia'
import { useCookie } from '#app'
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { RecentProduct } from '../types/recentlyViewed'
import { parseRecentlyViewedCookie, pushRecentlyViewed, serializeRecentlyViewed } from '../utils/recentlyViewed'

const RECENTLY_VIEWED_COOKIE = 'recently_viewed'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 jours

const DUMMYJSON_PRODUCTS_URL = 'https://dummyjson.com/products'
/** On ne demande à l'API que les champs affichés dans la liste. */
const RECENT_PRODUCT_FIELDS = 'title,price,thumbnail,category'

/** Type de retour explicite du store (exigé par les consignes). */
export interface RecentlyViewedStore {
  // état
  /** Identifiants, du plus récent au plus ancien (10 maximum). */
  ids: Ref<number[]>
  /** Informations des produits déjà connus, par identifiant. */
  products: Ref<Record<number, RecentProduct>>
  // actions
  track: (product: RecentProduct) => void
  clear: () => void
  loadProducts: () => Promise<void>
}

/** Vrai si l'erreur est une réponse HTTP 404 de $fetch (produit supprimé). */
function isNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 404
}

export const useRecentlyViewedStore = defineStore('recentlyViewed', (): RecentlyViewedStore => {
  /*
   * encode / decode identité : on lit la valeur brute pour la valider
   * nous-mêmes (le décodage par défaut de Nuxt accepterait n'importe quoi).
   */
  const cookie = useCookie<string | null>(RECENTLY_VIEWED_COOKIE, {
    default: () => null,
    maxAge: COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
    path: '/',
    encode: (value: string | null): string => value ?? '',
    decode: (value: string): string => value,
  })

  // ---- état -------------------------------------------------------------
  const ids = ref<number[]>(parseRecentlyViewedCookie(cookie.value))
  const products = ref<Record<number, RecentProduct>>({})

  // ---- persistance ------------------------------------------------------
  /** Écrit le cookie seulement s'il change (évite un Set-Cookie inutile). */
  function persist(nextIds: number[]): void {
    ids.value = nextIds
    const nextValue = nextIds.length > 0 ? serializeRecentlyViewed(nextIds) : null
    if ((cookie.value ?? null) !== nextValue) {
      // null supprime le cookie
      cookie.value = nextValue
    }
  }

  /*
   * Cookie corrompu ou modifié à la main (JSON invalide, valeurs non
   * numériques, doublons…) : il est ignoré et réinitialisé avec la version
   * propre (ou supprimé s'il ne reste rien).
   */
  if (cookie.value) {
    persist(ids.value)
  }

  function rememberProduct(product: RecentProduct): void {
    products.value = {
      ...products.value,
      [product.id]: {
        id: product.id,
        title: product.title,
        price: product.price,
        thumbnail: product.thumbnail,
        category: product.category,
      },
    }
  }

  // ---- actions ----------------------------------------------------------
  /**
   * À appeler sur une fiche produit EXISTANTE (après les vérifications de
   * 404) : le produit passe en tête de liste et ses infos sont gardées, ce
   * qui évite de le recharger depuis l'API.
   */
  function track(product: RecentProduct): void {
    rememberProduct(product)
    persist(pushRecentlyViewed(ids.value, product.id))
  }

  function clear(): void {
    products.value = {}
    persist([])
  }

  /**
   * Charge les produits de l'historique dont on n'a pas encore les infos.
   * DummyJSON ne sait pas renvoyer plusieurs produits par identifiants :
   * 1 requête par produit manquant (10 au maximum), en parallèle, avec
   * `select` pour ne recevoir que 4 champs. Promise.allSettled : l'échec d'un
   * produit n'empêche pas l'affichage des autres.
   * - Produit supprimé (404) : retiré de l'historique.
   * - Autre erreur (réseau…) : produit simplement non affiché cette fois-ci.
   */
  async function loadProducts(): Promise<void> {
    const missingIds = ids.value.filter((id) => !products.value[id])
    if (missingIds.length === 0) {
      return
    }

    const results = await Promise.allSettled(
      missingIds.map((id) =>
        $fetch<Omit<RecentProduct, 'id'>>(`${DUMMYJSON_PRODUCTS_URL}/${id}`, {
          query: { select: RECENT_PRODUCT_FIELDS },
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

  return { ids, products, track, clear, loadProducts }
})
