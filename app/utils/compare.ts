/**
 * Logique du comparateur de produits (F6) en fonctions pures.
 * Aucune dépendance à Vue ou Nuxt : testé dans tests/unit/compare.spec.ts.
 *
 * Un même format sert à l'URL et au cookie : identifiants séparés par des
 * virgules, dans l'ordre de sélection (`3,17,42`). Dans le cookie, la valeur
 * est encodée pour l'URL (`3%2C17%2C42`), la virgule n'étant pas un caractère
 * autorisé dans une valeur de cookie.
 */
import type {
  CompareCell,
  CompareLoadResult,
  CompareRow,
  CompareRowKey,
  CompareTableProduct,
  CompareToggleResult,
} from '../types/compare'
import { eurosToCents, formatCents } from './money'
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

/* ---- Page /comparer ------------------------------------------------------ */

/**
 * Vrai si les deux sélections contiennent les mêmes produits, quel que soit
 * l'ordre (le cookie `3,17` et l'URL `17,3` désignent la même sélection).
 */
export function isSameSelection(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id))
}

/**
 * Vrai si le paramètre d'URL `ids` est déjà sous sa forme normalisée.
 * Sinon, la page remplace l'URL (navigateTo(..., { replace: true })).
 * Sélection vide : la forme normalisée est l'absence du paramètre.
 */
export function isCanonicalCompareQuery(rawIds: unknown, ids: number[]): boolean {
  if (ids.length === 0) {
    return rawIds === undefined
  }
  return rawIds === formatCompareIds(ids)
}

/** Vrai si l'erreur est une réponse HTTP 404 de $fetch (produit inexistant). */
function isNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 404
}

/**
 * Trie les résultats des requêtes parallèles (Promise.allSettled), dans
 * l'ordre des identifiants demandés :
 * - succès → produit affiché (l'id demandé est forcé) ;
 * - 404 → produit inexistant, à retirer de l'URL ;
 * - autre échec (réseau…) → produit non affiché, mais gardé dans l'URL.
 * L'échec d'un produit n'empêche jamais l'affichage des autres.
 */
export function splitCompareResults(
  ids: number[],
  results: PromiseSettledResult<Omit<CompareTableProduct, 'id'>>[],
): CompareLoadResult {
  const loaded: CompareLoadResult = { products: [], notFoundIds: [], failedIds: [] }
  for (const [index, id] of ids.entries()) {
    const result = results[index]
    if (result?.status === 'fulfilled') {
      loaded.products.push({ ...result.value, id })
    } else if (result && isNotFoundError(result.reason)) {
      loaded.notFoundIds.push(id)
    } else {
      loaded.failedIds.push(id)
    }
  }
  return loaded
}

/** Sens de comparaison d'une ligne : la plus petite ou la plus grande valeur gagne. */
export type BestDirection = 'lowest' | 'highest'

/**
 * Indices des meilleures valeurs d'une ligne. Ex aequo : tous sont gardés.
 * Aucune meilleure valeur s'il y a moins de 2 produits ou si toutes les
 * valeurs sont égales (tout mettre en évidence n'aurait pas de sens).
 */
export function findBestIndexes(values: number[], direction: BestDirection): number[] {
  if (values.length < 2) {
    return []
  }
  const best = direction === 'lowest' ? Math.min(...values) : Math.max(...values)
  const indexes = values.flatMap((value, index) => (value === best ? [index] : []))
  return indexes.length === values.length ? [] : indexes
}

/** Traduction des valeurs `availabilityStatus` de DummyJSON. */
const AVAILABILITY_LABELS: Record<string, string> = {
  'In Stock': 'En stock',
  'Low Stock': 'Stock faible',
  'Out of Stock': 'Rupture de stock',
}

const decimalFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

/** Arrondi à 1 décimale : la note est comparée telle qu'elle est affichée. */
function roundRating(rating: number): number {
  return Math.round(rating * 10) / 10
}

/** Description d'une ligne : libellé, texte affiché et, si comparable, valeur numérique. */
interface RowDefinition {
  key: CompareRowKey
  label: string
  text: (product: CompareTableProduct) => string
  best?: { label: string; direction: BestDirection; value: (product: CompareTableProduct) => number }
}

/*
 * Ordre et contenu des lignes. L'image et le titre ne sont pas répétés ici :
 * ils forment les en-têtes de colonnes (<th scope="col">) du tableau.
 * DummyJSON ne précise pas les unités : poids en kg et dimensions en cm.
 */
const ROWS: RowDefinition[] = [
  {
    key: 'price',
    label: 'Prix',
    text: (product) => formatCents(eurosToCents(product.price)),
    best: { label: 'Meilleur prix', direction: 'lowest', value: (product) => eurosToCents(product.price) },
  },
  {
    key: 'discount',
    label: 'Remise',
    text: (product) => {
      const discount = Math.round(product.discountPercentage)
      return discount > 0 ? `−${discount} %` : 'Aucune'
    },
    best: {
      label: 'Meilleure remise',
      direction: 'highest',
      value: (product) => Math.round(product.discountPercentage),
    },
  },
  {
    key: 'rating',
    label: 'Note',
    text: (product) => `${decimalFormatter.format(roundRating(product.rating))} / 5`,
    best: { label: 'Meilleure note', direction: 'highest', value: (product) => roundRating(product.rating) },
  },
  {
    key: 'availability',
    label: 'Disponibilité',
    text: (product) => AVAILABILITY_LABELS[product.availabilityStatus] ?? product.availabilityStatus,
  },
  {
    key: 'stock',
    label: 'Stock',
    text: (product) => `${product.stock} unité${product.stock > 1 ? 's' : ''}`,
    best: { label: 'Plus grand stock', direction: 'highest', value: (product) => product.stock },
  },
  {
    key: 'brand',
    label: 'Marque',
    text: (product) => product.brand ?? 'Non renseignée',
  },
  {
    key: 'category',
    label: 'Catégorie',
    text: (product) => product.category,
  },
  {
    key: 'weight',
    label: 'Poids',
    text: (product) => `${decimalFormatter.format(product.weight)} kg`,
  },
  {
    key: 'dimensions',
    label: 'Dimensions (l × h × p)',
    text: ({ dimensions }) =>
      `${[dimensions.width, dimensions.height, dimensions.depth].map((value) => decimalFormatter.format(value)).join(' × ')} cm`,
  },
  {
    key: 'warranty',
    label: 'Garantie',
    text: (product) => product.warrantyInformation,
  },
  {
    key: 'shipping',
    label: 'Livraison',
    text: (product) => product.shippingInformation,
  },
]

/**
 * Construit les lignes du tableau comparatif : une cellule par produit,
 * la meilleure valeur mise en évidence (avec un libellé texte, pas
 * seulement une couleur) et un indicateur « valeurs identiques ».
 */
export function buildCompareRows(products: CompareTableProduct[]): CompareRow[] {
  return ROWS.map((row) => {
    const bestIndexes = row.best ? findBestIndexes(products.map(row.best.value), row.best.direction) : []
    const cells: CompareCell[] = products.map((product, index) => ({
      productId: product.id,
      text: row.text(product),
      best: bestIndexes.includes(index),
    }))
    return {
      key: row.key,
      label: row.label,
      cells,
      bestLabel: row.best?.label ?? null,
      identical: cells.every((cell) => cell.text === cells[0]?.text),
    }
  })
}

/** Option « Afficher uniquement les différences » : masque les lignes identiques. */
export function filterCompareRows(rows: CompareRow[], onlyDifferences: boolean): CompareRow[] {
  return onlyDifferences ? rows.filter((row) => !row.identical) : rows
}
