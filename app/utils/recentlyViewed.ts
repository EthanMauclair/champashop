/**
 * Logique des « produits vus récemment » (F7) en fonctions pures.
 * Aucune dépendance à Vue ou Nuxt : testé dans tests/unit/recentlyViewed.spec.ts.
 *
 * Format du cookie `recently_viewed` : un tableau JSON d'identifiants, du plus
 * récent au plus ancien, encodé pour l'URL (ex. `%5B17%2C3%5D` pour `[17,3]`).
 * Un cookie peut être modifié à la main : tout ce qui n'est pas un tableau JSON
 * d'entiers positifs est ignoré, jamais une cause d'erreur.
 */

/** Nombre maximum de produits gardés dans l'historique. */
export const RECENTLY_VIEWED_MAX = 10

/** Un identifiant DummyJSON valide : entier strictement positif. */
export function isValidProductId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

/**
 * Ajoute `id` en tête de liste. Sans doublon : un produit déjà présent remonte
 * en tête. Au-delà de `max`, les plus anciens sortent.
 * Ne modifie pas le tableau reçu. Un `id` invalide laisse la liste inchangée.
 */
export function pushRecentlyViewed(ids: number[], id: number, max = RECENTLY_VIEWED_MAX): number[] {
  const limit = Math.max(0, Math.floor(max))
  if (!isValidProductId(id)) {
    return ids.slice(0, limit)
  }
  return [id, ...ids.filter((existing) => existing !== id)].slice(0, limit)
}

/** decodeURIComponent lève une erreur sur une séquence invalide (`%E0`). */
function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** JSON.parse sans exception : `undefined` si le texte n'est pas du JSON. */
function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

/**
 * Lit la valeur brute du cookie (chaîne encodée ou non, ou valeur déjà
 * décodée) et renvoie une liste propre :
 * - autre chose qu'un tableau JSON (JSON invalide, nombre, objet, null…) → [] ;
 * - les valeurs qui ne sont pas des entiers positifs sont ignorées ;
 * - doublons retirés (la première occurrence, la plus récente, est gardée) ;
 * - au plus RECENTLY_VIEWED_MAX identifiants.
 */
export function parseRecentlyViewedCookie(raw: unknown): number[] {
  const value = typeof raw === 'string' ? safeJsonParse(safeDecodeURIComponent(raw.trim())) : raw
  if (!Array.isArray(value)) {
    return []
  }

  const ids: number[] = []
  for (const entry of value) {
    if (isValidProductId(entry) && !ids.includes(entry)) {
      ids.push(entry)
    }
    if (ids.length === RECENTLY_VIEWED_MAX) {
      break
    }
  }
  return ids
}

/** Valeur à écrire dans le cookie (sûre pour un en-tête Set-Cookie). */
export function serializeRecentlyViewed(ids: number[]): string {
  return encodeURIComponent(JSON.stringify(ids))
}
