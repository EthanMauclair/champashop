import { describe, expect, it } from 'vitest'
import {
  CATALOG_PAGE_SIZE,
  DEFAULT_CATALOG_FILTERS,
  filterProducts,
  getCatalogPage,
  matchesSearch,
  normalizeText,
  paginateItems,
  parseCatalogQuery,
  patchCatalogFilters,
  sortProducts,
  toCatalogQuery,
} from '../../app/utils/catalog'
import type { CatalogFilters, CatalogProduct } from '../../app/types/catalog'

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: 1,
    title: 'Mascara Essence',
    description: 'Un mascara volumisant.',
    category: 'beauty',
    price: 9.99,
    discountPercentage: 5,
    rating: 4.2,
    stock: 10,
    tags: ['beauty', 'mascara'],
    brand: 'Essence',
    thumbnail: 'https://cdn.dummyjson.com/x.webp',
    ...overrides,
  }
}

const filters = (overrides: Partial<CatalogFilters> = {}): CatalogFilters => ({ ...DEFAULT_CATALOG_FILTERS, ...overrides })

describe('parseCatalogQuery', () => {
  it('URL vide : filtres par défaut', () => {
    expect(parseCatalogQuery({})).toEqual(DEFAULT_CATALOG_FILTERS)
  })

  it('lit tous les paramètres', () => {
    expect(parseCatalogQuery({
      page: '3',
      q: '  parfum ',
      category: 'fragrances',
      sortBy: 'price',
      order: 'desc',
      minPrice: '10',
      maxPrice: '49,90',
    })).toEqual({
      page: 3,
      q: 'parfum',
      category: 'fragrances',
      sortBy: 'price',
      order: 'desc',
      minPrice: 10,
      maxPrice: 49.9,
    })
  })

  it('remplace les valeurs invalides par les valeurs par défaut', () => {
    expect(parseCatalogQuery({
      page: 'abc',
      sortBy: 'hack',
      order: 'n-importe-quoi',
      minPrice: '-5',
      maxPrice: 'cher',
    })).toEqual(DEFAULT_CATALOG_FILTERS)
    expect(parseCatalogQuery({ page: '0' }).page).toBe(1)
    expect(parseCatalogQuery({ page: '2.5' }).page).toBe(1)
  })

  it('prend la première valeur d\'un paramètre répété et ignore null', () => {
    expect(parseCatalogQuery({ q: ['a', 'b'], category: null }).q).toBe('a')
    expect(parseCatalogQuery({ category: null }).category).toBe('')
  })
})

describe('toCatalogQuery', () => {
  it('omet les valeurs par défaut', () => {
    expect(toCatalogQuery(DEFAULT_CATALOG_FILTERS)).toEqual({})
  })

  it('aller-retour URL -> filtres -> URL', () => {
    const query = { q: 'parfum', category: 'fragrances', sortBy: 'rating', order: 'desc', minPrice: '0', maxPrice: '50', page: '2' }
    expect(toCatalogQuery(parseCatalogQuery(query))).toEqual(query)
  })
})

describe('patchCatalogFilters', () => {
  it('changer un filtre ramène à la page 1', () => {
    expect(patchCatalogFilters(filters({ page: 4 }), { category: 'beauty' }).page).toBe(1)
  })

  it('changer seulement la page la conserve', () => {
    expect(patchCatalogFilters(filters({ page: 4 }), { page: 5 }).page).toBe(5)
  })
})

describe('recherche plein texte', () => {
  it('normalizeText ignore la casse et les accents', () => {
    expect(normalizeText('Crème ÉCLAT')).toBe('creme eclat')
  })

  it('cherche dans titre, description, marque, catégorie et tags', () => {
    const p = product()
    expect(matchesSearch(p, 'mascara')).toBe(true)
    expect(matchesSearch(p, 'volumisant')).toBe(true)
    expect(matchesSearch(p, 'ESSENCE')).toBe(true)
    expect(matchesSearch(p, 'beauty')).toBe(true)
    expect(matchesSearch(p, 'parfum')).toBe(false)
  })

  it('tous les mots doivent correspondre', () => {
    expect(matchesSearch(product(), 'essence mascara')).toBe(true)
    expect(matchesSearch(product(), 'essence parfum')).toBe(false)
  })

  it('recherche vide : tout correspond ; produit sans marque ni tags', () => {
    expect(matchesSearch(product(), '   ')).toBe(true)
    expect(matchesSearch(product({ brand: undefined, tags: [] }), 'essence')).toBe(true) // via le titre
  })
})

describe('filterProducts', () => {
  const products = [
    product({ id: 1, price: 5 }),
    product({ id: 2, price: 20 }),
    product({ id: 3, price: 50, title: 'Parfum', description: '', tags: [], brand: 'Chanel', category: 'fragrances' }),
  ]

  it('filtre par prix min et max (bornes incluses)', () => {
    expect(filterProducts(products, { q: '', minPrice: 5, maxPrice: 20 }).map(p => p.id)).toEqual([1, 2])
  })

  it('combine recherche et prix', () => {
    expect(filterProducts(products, { q: 'chanel', minPrice: null, maxPrice: 100 }).map(p => p.id)).toEqual([3])
  })

  it('min supérieur à max : aucun résultat', () => {
    expect(filterProducts(products, { q: '', minPrice: 30, maxPrice: 10 })).toEqual([])
  })
})

describe('sortProducts', () => {
  const products = [
    product({ id: 1, title: 'banane', price: 3, rating: 4 }),
    product({ id: 2, title: 'Abricot', price: 1, rating: 5 }),
    product({ id: 3, title: 'cerise', price: 2, rating: 3 }),
  ]

  it('sans tri : ordre de l\'API, copie du tableau', () => {
    const sorted = sortProducts(products, null, 'asc')
    expect(sorted.map(p => p.id)).toEqual([1, 2, 3])
    expect(sorted).not.toBe(products)
  })

  it('par prix croissant et décroissant', () => {
    expect(sortProducts(products, 'price', 'asc').map(p => p.id)).toEqual([2, 3, 1])
    expect(sortProducts(products, 'price', 'desc').map(p => p.id)).toEqual([1, 3, 2])
  })

  it('par note décroissante', () => {
    expect(sortProducts(products, 'rating', 'desc').map(p => p.id)).toEqual([2, 1, 3])
  })

  it('par titre, sans tenir compte de la casse', () => {
    expect(sortProducts(products, 'title', 'asc').map(p => p.id)).toEqual([2, 1, 3])
  })

  it('ne modifie pas le tableau reçu', () => {
    sortProducts(products, 'price', 'asc')
    expect(products.map(p => p.id)).toEqual([1, 2, 3])
  })
})

describe('pagination', () => {
  const items = Array.from({ length: 30 }, (_, i) => i + 1)

  it(`${CATALOG_PAGE_SIZE} éléments par page`, () => {
    const page = paginateItems(items, 2)
    expect(page.items).toEqual(items.slice(12, 24))
    expect(page).toMatchObject({ page: 2, totalPages: 3, totalItems: 30 })
  })

  it('dernière page partielle', () => {
    expect(paginateItems(items, 3).items).toEqual([25, 26, 27, 28, 29, 30])
  })

  it('page hors limites ramenée à la dernière page', () => {
    expect(paginateItems(items, 99).page).toBe(3)
  })

  it('aucun élément : une page vide', () => {
    expect(paginateItems([], 1)).toEqual({ items: [], page: 1, totalPages: 1, totalItems: 0 })
  })
})

describe('getCatalogPage', () => {
  it('enchaîne filtres, tri et pagination', () => {
    const products = Array.from({ length: 20 }, (_, i) => product({ id: i + 1, price: i + 1 }))
    const result = getCatalogPage(products, filters({ minPrice: 5, sortBy: 'price', order: 'desc', page: 2 }))
    expect(result.totalItems).toBe(16)
    expect(result.items.map(p => p.price)).toEqual([8, 7, 6, 5])
  })
})
