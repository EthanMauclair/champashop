import { describe, expect, it } from 'vitest'
import type { CompareRow, CompareTableProduct } from '../../app/types/compare'
import { formatCents } from '../../app/utils/money'
import {
  COMPARE_MAX,
  buildCompareRows,
  filterCompareRows,
  findBestIndexes,
  formatCompareIds,
  isCanonicalCompareQuery,
  isSameSelection,
  parseCompareIds,
  serializeCompareCookie,
  splitCompareResults,
  toComparePath,
  toggleCompare,
} from '../../app/utils/compare'

function makeProduct(overrides: Partial<CompareTableProduct> & Pick<CompareTableProduct, 'id'>): CompareTableProduct {
  return {
    title: `Produit ${overrides.id}`,
    thumbnail: `https://cdn.example/${overrides.id}.webp`,
    price: 10,
    discountPercentage: 10,
    rating: 4,
    availabilityStatus: 'In Stock',
    stock: 10,
    brand: 'Essence',
    category: 'beauty',
    weight: 2,
    dimensions: { width: 10, height: 20, depth: 30 },
    warrantyInformation: '1 year warranty',
    shippingInformation: 'Ships in 1 week',
    ...overrides,
  }
}

function rowByKey(rows: CompareRow[], key: CompareRow['key']): CompareRow {
  const row = rows.find((candidate) => candidate.key === key)
  if (!row) {
    throw new Error(`Ligne ${key} absente`)
  }
  return row
}

describe('parseCompareIds', () => {
  it("lit les identifiants de l'URL dans l'ordre", () => {
    expect(parseCompareIds('3,17,42')).toEqual([3, 17, 42])
    expect(parseCompareIds('42,3')).toEqual([42, 3])
  })

  it('lit la valeur encodée du cookie', () => {
    expect(parseCompareIds('3%2C17%2C42')).toEqual([3, 17, 42])
  })

  it('tolère les espaces autour des identifiants', () => {
    expect(parseCompareIds(' 3 , 17 ')).toEqual([3, 17])
  })

  it('doublons retirés, la première occurrence est gardée', () => {
    expect(parseCompareIds('5,5,5')).toEqual([5])
    expect(parseCompareIds('3,17,3')).toEqual([3, 17])
  })

  it('au-delà de 3 identifiants, les suivants sont ignorés', () => {
    expect(COMPARE_MAX).toBe(3)
    expect(parseCompareIds('1,2,3,4,5')).toEqual([1, 2, 3])
  })

  it('les doublons et valeurs invalides ne comptent pas dans le maximum', () => {
    expect(parseCompareIds('1,1,abc,2,0,3,4')).toEqual([1, 2, 3])
  })

  it('respecte un maximum personnalisé', () => {
    expect(parseCompareIds('1,2,3', 2)).toEqual([1, 2])
    expect(parseCompareIds('1,2,3', 0)).toEqual([])
  })

  it('entrées non numériques → ignorées', () => {
    expect(parseCompareIds('abc')).toEqual([])
    expect(parseCompareIds('1,,2')).toEqual([1, 2])
    expect(parseCompareIds('1,abc,2')).toEqual([1, 2])
    expect(parseCompareIds(',,')).toEqual([])
  })

  it('nombres mal écrits ou non entiers → ignorés', () => {
    for (const raw of ['1.5', '1e3', '-2', '0', '+4', '0x10', 'Infinity', '9007199254740993']) {
      expect(parseCompareIds(raw)).toEqual([])
    }
  })

  it('valeurs vides ou absentes → liste vide', () => {
    expect(parseCompareIds(null)).toEqual([])
    expect(parseCompareIds(undefined)).toEqual([])
    expect(parseCompareIds('')).toEqual([])
    expect(parseCompareIds([])).toEqual([])
  })

  it('tableau (paramètre répété ?ids=1&ids=2) → chaque valeur est lue', () => {
    expect(parseCompareIds(['1', '2'])).toEqual([1, 2])
    expect(parseCompareIds(['1,2', '3', '4'])).toEqual([1, 2, 3])
    expect(parseCompareIds([3, 17, 3])).toEqual([3, 17])
    expect(parseCompareIds(['abc', null, {}, '7'])).toEqual([7])
  })

  it('nombre seul → gardé s’il est valide', () => {
    expect(parseCompareIds(12)).toEqual([12])
    expect(parseCompareIds(-1)).toEqual([])
    expect(parseCompareIds(2.5)).toEqual([])
  })

  it('autres types inattendus → liste vide', () => {
    expect(parseCompareIds({ ids: '1,2' })).toEqual([])
    expect(parseCompareIds(true)).toEqual([])
  })

  it('séquence encodée invalide → ne lève jamais d’erreur', () => {
    expect(parseCompareIds('%E0%A4%A')).toEqual([])
    expect(parseCompareIds('3,%E0')).toEqual([3])
  })
})

describe('toggleCompare', () => {
  it('ajoute un produit à une sélection vide', () => {
    expect(toggleCompare([], 5)).toEqual({ ids: [5], rejected: false })
  })

  it("ajoute à la fin pour garder l'ordre de sélection", () => {
    expect(toggleCompare([3, 17], 42)).toEqual({ ids: [3, 17, 42], rejected: false })
  })

  it('bascule : un produit déjà sélectionné est retiré', () => {
    expect(toggleCompare([3, 17, 42], 17)).toEqual({ ids: [3, 42], rejected: false })
  })

  it('au 4ᵉ produit, rien n’est ajouté et l’ajout est refusé', () => {
    expect(toggleCompare([3, 17, 42], 8)).toEqual({ ids: [3, 17, 42], rejected: true })
  })

  it('comparateur plein : retirer un produit reste possible', () => {
    expect(toggleCompare([3, 17, 42], 3)).toEqual({ ids: [17, 42], rejected: false })
  })

  it('respecte un maximum personnalisé', () => {
    expect(toggleCompare([1], 2, 1)).toEqual({ ids: [1], rejected: true })
    expect(toggleCompare([1], 2, 2)).toEqual({ ids: [1, 2], rejected: false })
  })

  it('un identifiant invalide ne modifie pas la sélection et n’est pas un « comparateur plein »', () => {
    for (const id of [0, -1, 2.5, Number.NaN]) {
      expect(toggleCompare([3, 17], id)).toEqual({ ids: [3, 17], rejected: false })
    }
  })

  it('ne modifie pas le tableau reçu (fonction pure)', () => {
    const ids = [3, 17]
    toggleCompare(ids, 42)
    toggleCompare(ids, 3)
    expect(ids).toEqual([3, 17])
    expect(toggleCompare(ids, 0).ids).not.toBe(ids)
  })
})

describe('formats URL et cookie', () => {
  it("formatCompareIds produit la valeur du paramètre d'URL", () => {
    expect(formatCompareIds([3, 17, 42])).toBe('3,17,42')
    expect(formatCompareIds([])).toBe('')
  })

  it('serializeCompareCookie produit une valeur de cookie sûre (sans virgule brute)', () => {
    expect(serializeCompareCookie([3, 17, 42])).toBe('3%2C17%2C42')
  })

  it("aller-retour : ce qui est écrit dans le cookie est relu à l'identique", () => {
    const ids = [42, 3, 17]
    expect(parseCompareIds(serializeCompareCookie(ids))).toEqual(ids)
  })

  it('toComparePath construit le lien partageable', () => {
    expect(toComparePath([3, 17, 42])).toBe('/comparer?ids=3,17,42')
    expect(toComparePath([])).toBe('/comparer')
  })
})

describe('isSameSelection', () => {
  it("compare les produits, pas l'ordre", () => {
    expect(isSameSelection([3, 17], [17, 3])).toBe(true)
    expect(isSameSelection([], [])).toBe(true)
  })

  it('sélections différentes', () => {
    expect(isSameSelection([3, 17], [3, 42])).toBe(false)
    expect(isSameSelection([3], [3, 17])).toBe(false)
    expect(isSameSelection([], [3])).toBe(false)
  })
})

describe('isCanonicalCompareQuery', () => {
  it('URL déjà normalisée', () => {
    expect(isCanonicalCompareQuery('3,17,42', [3, 17, 42])).toBe(true)
    expect(isCanonicalCompareQuery(undefined, [])).toBe(true)
  })

  it('URL à normaliser (invalide, doublon, plus de 3, paramètre vide ou répété)', () => {
    expect(isCanonicalCompareQuery('3,abc,17', [3, 17])).toBe(false)
    expect(isCanonicalCompareQuery('5,5,5', [5])).toBe(false)
    expect(isCanonicalCompareQuery('1,2,3,4', [1, 2, 3])).toBe(false)
    expect(isCanonicalCompareQuery(' 3,17', [3, 17])).toBe(false)
    expect(isCanonicalCompareQuery('', [])).toBe(false)
    expect(isCanonicalCompareQuery(['3', '17'], [3, 17])).toBe(false)
    expect(isCanonicalCompareQuery(null, [])).toBe(false)
  })

  it('produit inexistant retiré après chargement → URL à normaliser', () => {
    expect(isCanonicalCompareQuery('3,99999', [3])).toBe(false)
    expect(isCanonicalCompareQuery('99999', [])).toBe(false)
  })
})

describe('splitCompareResults', () => {
  const { id: _id, ...loaded } = makeProduct({ id: 1 })

  it("garde l'ordre des identifiants et force l'id demandé", () => {
    const result = splitCompareResults(
      [42, 3],
      [
        { status: 'fulfilled', value: { ...loaded, title: 'A' } },
        { status: 'fulfilled', value: { ...loaded, title: 'B' } },
      ],
    )
    expect(result.products.map((product) => [product.id, product.title])).toEqual([
      [42, 'A'],
      [3, 'B'],
    ])
    expect(result.notFoundIds).toEqual([])
    expect(result.failedIds).toEqual([])
  })

  it("404 → inexistant ; autre échec → gardé mais non affiché ; les autres s'affichent", () => {
    const result = splitCompareResults(
      [3, 99999, 17],
      [
        { status: 'fulfilled', value: loaded },
        { status: 'rejected', reason: { statusCode: 404 } },
        { status: 'rejected', reason: new TypeError('fetch failed') },
      ],
    )
    expect(result.products.map((product) => product.id)).toEqual([3])
    expect(result.notFoundIds).toEqual([99999])
    expect(result.failedIds).toEqual([17])
  })

  it('erreur sans code HTTP ou résultat manquant → échec, pas inexistant', () => {
    const result = splitCompareResults(
      [1, 2, 3],
      [
        { status: 'rejected', reason: null },
        { status: 'rejected', reason: { statusCode: 500 } },
      ],
    )
    expect(result.failedIds).toEqual([1, 2, 3])
    expect(result.notFoundIds).toEqual([])
  })
})

describe('findBestIndexes', () => {
  it('valeur la plus basse / la plus haute', () => {
    expect(findBestIndexes([30, 10, 20], 'lowest')).toEqual([1])
    expect(findBestIndexes([30, 10, 20], 'highest')).toEqual([0])
  })

  it('ex aequo : toutes les meilleures valeurs sont gardées', () => {
    expect(findBestIndexes([10, 30, 10], 'lowest')).toEqual([0, 2])
  })

  it('valeurs toutes égales ou moins de 2 produits → aucune mise en évidence', () => {
    expect(findBestIndexes([5, 5, 5], 'highest')).toEqual([])
    expect(findBestIndexes([5], 'highest')).toEqual([])
    expect(findBestIndexes([], 'lowest')).toEqual([])
  })
})

describe('buildCompareRows', () => {
  const products = [
    makeProduct({ id: 3, price: 19.99, rating: 4.94, stock: 5, discountPercentage: 12.4 }),
    makeProduct({ id: 17, price: 9.99, rating: 3.5, stock: 99, discountPercentage: 0.4, brand: undefined }),
    makeProduct({ id: 42, price: 9.99, rating: 4.2, stock: 1, discountPercentage: 7, availabilityStatus: 'Low Stock' }),
  ]
  const rows = buildCompareRows(products)

  it("contient toutes les caractéristiques demandées, dans l'ordre", () => {
    expect(rows.map((row) => row.label)).toEqual([
      'Prix',
      'Remise',
      'Note',
      'Disponibilité',
      'Stock',
      'Marque',
      'Catégorie',
      'Poids',
      'Dimensions (l × h × p)',
      'Garantie',
      'Livraison',
    ])
  })

  it('une cellule par produit, dans l’ordre des colonnes', () => {
    for (const row of rows) {
      expect(row.cells.map((cell) => cell.productId)).toEqual([3, 17, 42])
    }
  })

  it('meilleur prix (le plus bas), ex aequo compris, avec un libellé texte', () => {
    const price = rowByKey(rows, 'price')
    expect(price.bestLabel).toBe('Meilleur prix')
    expect(price.cells.map((cell) => cell.best)).toEqual([false, true, true])
    expect(price.cells[1]?.text).toBe(formatCents(999))
  })

  it('meilleure note (la plus haute) et plus grand stock', () => {
    const rating = rowByKey(rows, 'rating')
    expect(rating.bestLabel).toBe('Meilleure note')
    expect(rating.cells.map((cell) => cell.best)).toEqual([true, false, false])
    expect(rating.cells.map((cell) => cell.text)).toEqual(['4,9 / 5', '3,5 / 5', '4,2 / 5'])

    const stock = rowByKey(rows, 'stock')
    expect(stock.bestLabel).toBe('Plus grand stock')
    expect(stock.cells.map((cell) => cell.best)).toEqual([false, true, false])
    expect(stock.cells.map((cell) => cell.text)).toEqual(['5 unités', '99 unités', '1 unité'])
  })

  it('remise : arrondie, « Aucune » sous 1 %, meilleure remise la plus haute', () => {
    const discount = rowByKey(rows, 'discount')
    expect(discount.cells.map((cell) => cell.text)).toEqual(['−12 %', 'Aucune', '−7 %'])
    expect(discount.cells.map((cell) => cell.best)).toEqual([true, false, false])
  })

  it('les lignes non comparables n’ont pas de meilleure valeur', () => {
    for (const key of ['availability', 'brand', 'category', 'weight', 'dimensions', 'warranty', 'shipping'] as const) {
      const row = rowByKey(rows, key)
      expect(row.bestLabel).toBeNull()
      expect(row.cells.every((cell) => !cell.best)).toBe(true)
    }
  })

  it('disponibilité traduite, marque absente, poids et dimensions formatés', () => {
    expect(rowByKey(rows, 'availability').cells.map((cell) => cell.text)).toEqual([
      'En stock',
      'En stock',
      'Stock faible',
    ])
    expect(rowByKey(rows, 'brand').cells[1]?.text).toBe('Non renseignée')
    expect(rowByKey(rows, 'weight').cells[0]?.text).toBe('2 kg')
    expect(rowByKey(rows, 'dimensions').cells[0]?.text).toBe('10 × 20 × 30 cm')

    const single = buildCompareRows([
      makeProduct({
        id: 1,
        availabilityStatus: 'Out of Stock',
        weight: 1.5,
        dimensions: { width: 1.25, height: 2, depth: 3 },
      }),
    ])
    expect(rowByKey(single, 'availability').cells[0]?.text).toBe('Rupture de stock')
    expect(rowByKey(single, 'weight').cells[0]?.text).toBe('1,5 kg')
    expect(rowByKey(single, 'dimensions').cells[0]?.text).toBe('1,25 × 2 × 3 cm')
  })

  it('statut de disponibilité inconnu → affiché tel quel', () => {
    const unknown = buildCompareRows([makeProduct({ id: 1, availabilityStatus: 'Preorder' })])
    expect(rowByKey(unknown, 'availability').cells[0]?.text).toBe('Preorder')
  })

  it('indique les lignes identiques pour tous les produits', () => {
    expect(rowByKey(rows, 'category').identical).toBe(true)
    expect(rowByKey(rows, 'warranty').identical).toBe(true)
    expect(rowByKey(rows, 'price').identical).toBe(false)
    expect(rowByKey(rows, 'brand').identical).toBe(false)
  })

  it('un seul produit : aucune meilleure valeur, tout est identique', () => {
    const single = buildCompareRows([makeProduct({ id: 1 })])
    expect(single.every((row) => row.identical && row.cells.every((cell) => !cell.best))).toBe(true)
  })

  it('aucun produit : lignes sans cellule', () => {
    expect(buildCompareRows([]).every((row) => row.cells.length === 0)).toBe(true)
  })
})

describe('filterCompareRows', () => {
  const rows = buildCompareRows([makeProduct({ id: 1, price: 5 }), makeProduct({ id: 2, price: 8 })])

  it('« Afficher uniquement les différences » masque les lignes identiques', () => {
    expect(filterCompareRows(rows, true).map((row) => row.key)).toEqual(['price'])
  })

  it('option désactivée : toutes les lignes', () => {
    expect(filterCompareRows(rows, false)).toHaveLength(rows.length)
  })
})
