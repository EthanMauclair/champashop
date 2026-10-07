/**
 * Logique du comparateur de produits (F6) en fonctions pures.
 * Aucune dépendance à Vue ou Nuxt : testé dans tests/unit/compare.spec.ts.
 *
 * Un même format sert à l'URL et au cookie : identifiants séparés par des
 * virgules, dans l'ordre de sélection (`3,17,42`). Dans le cookie, la valeur
 * est encodée pour l'URL (`3%2C17%2C42`), la virgule n'étant pas un caractère
 * autorisé dans une valeur de cookie.
 */
import type { CompareToggleResult } from '../types/compare'
import { isValidProductId } from './recentlyViewed'

/** Nombre maximum de produits comparés. */
export const COMPARE_MAX = 3

/** Message annoncé quand on tente d'ajouter un 4ᵉ produit. */
export const COMPARE_FULL_MESSAGE = 'Comparateur plein : retirez un produit pour en ajouter un autre'

/** Chemin de la page du comparateur. */
export const COMPARE_PATH = '/comparer'

/** decodeURIComponent lève une erreur sur une séquence invalide (`%E0`). */
function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Transforme une valeur brute en identifiants candidats (pas encore filtrés) :
 * - chaîne : découpée sur les virgules, chaque morceau doit être un entier
 *   écrit en chiffres uniquement (`abc`, `1.5`, `1e3`, `-2` sont rejetés) ;
 * - nombre : gardé tel quel (validé ensuite) ;
 * - tableau (ex. `?ids=1&ids=2` donne `['1', '2']`) : chaque élément est lu
 *   comme ci-dessus ;
 * - tout le reste (null, objet…) : rien.
 */
function toCandidates(raw: unknown): number[] {
  if (typeof raw === 'number') {
    return [raw]
  }
  if (typeof raw === 'string') {
    return safeDecodeURIComponent(raw)
      .split(',')
      .map((part) => part.trim())
      .filter((part) => /^\d+$/.test(part))
      .map(Number)
  }
  if (Array.isArray(raw)) {
    return raw.flatMap((entry: unknown) => (typeof entry === 'string' || typeof entry === 'number' ? toCandidates(entry) : []))
  }
  return []
}

/**
 * Lit des identifiants depuis l'URL (`?ids=3,17,42`) ou le cookie `compare`
 * et renvoie une liste propre, sans jamais lever d'erreur :
 * - les valeurs qui ne sont pas des entiers strictement positifs sont ignorées ;
 * - les doublons sont retirés (la première occurrence est gardée) ;
 * - au-delà de `max`, les identifiants suivants sont ignorés ;
 * - l'ordre est conservé (c'est l'ordre des colonnes du tableau).
 */
export function parseCompareIds(raw: unknown, max = COMPARE_MAX): number[] {
  const limit = Math.max(0, Math.floor(max))
  const ids: number[] = []
  for (const candidate of toCandidates(raw)) {
    if (ids.length >= limit) {
      break
    }
    if (isValidProductId(candidate) && !ids.includes(candidate)) {
      ids.push(candidate)
    }
  }
  return ids
}

/**
 * Bouton bascule « Comparer » :
 * - produit déjà sélectionné → retiré ;
 * - sinon, ajouté à la fin (ordre de sélection) s'il reste de la place ;
 * - comparateur plein → rien n'est ajouté et `rejected` vaut `true`.
 * `rejected` ne vaut `true` que dans ce dernier cas : c'est lui qui déclenche
 * le message « Comparateur plein ». Un identifiant invalide laisse la liste
 * inchangée. Ne modifie pas le tableau reçu.
 */
export function toggleCompare(ids: number[], id: number, max = COMPARE_MAX): CompareToggleResult {
  if (ids.includes(id)) {
    return { ids: ids.filter((existing) => existing !== id), rejected: false }
  }
  if (!isValidProductId(id)) {
    return { ids: [...ids], rejected: false }
  }
  if (ids.length >= max) {
    return { ids: [...ids], rejected: true }
  }
  return { ids: [...ids, id], rejected: false }
}

/** Valeur du paramètre d'URL `ids` (`3,17,42`). */
export function formatCompareIds(ids: number[]): string {
  return ids.join(',')
}

/** Valeur à écrire dans le cookie `compare` (sûre pour un en-tête Set-Cookie). */
export function serializeCompareCookie(ids: number[]): string {
  return encodeURIComponent(formatCompareIds(ids))
}

/**
 * Lien vers la page de comparaison. La virgule est laissée telle quelle
 * pour garder une URL lisible et partageable (`/comparer?ids=3,17,42`).
 */
export function toComparePath(ids: number[]): string {
  return ids.length > 0 ? `${COMPARE_PATH}?ids=${formatCompareIds(ids)}` : COMPARE_PATH
}
