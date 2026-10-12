import { describe, expect, it } from 'vitest'
import {
  RECENTLY_VIEWED_MAX,
  isValidProductId,
  parseRecentlyViewedCookie,
  pushRecentlyViewed,
  serializeRecentlyViewed,
} from '../../app/utils/recentlyViewed'

describe('isValidProductId', () => {
  it('accepte uniquement les entiers strictement positifs', () => {
    expect(isValidProductId(1)).toBe(true)
    expect(isValidProductId(194)).toBe(true)
    for (const value of [0, -3, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 60, '3', null, undefined, [3]]) {
      expect(isValidProductId(value)).toBe(false)
    }
  })
})

describe('pushRecentlyViewed', () => {
  it("ajoute le produit en tête d'une liste vide", () => {
    expect(pushRecentlyViewed([], 5)).toEqual([5])
  })

  it("ajoute en tête et garde l'ordre des autres (du plus récent au plus ancien)", () => {
    expect(pushRecentlyViewed([3, 17, 42], 8)).toEqual([8, 3, 17, 42])
  })

  it('sans doublon : un produit déjà présent remonte en tête', () => {
    expect(pushRecentlyViewed([3, 17, 42], 42)).toEqual([42, 3, 17])
    expect(pushRecentlyViewed([3, 17, 42], 3)).toEqual([3, 17, 42])
  })

  it('10 produits maximum : le plus ancien sort', () => {
    const full = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
    const result = pushRecentlyViewed(full, 11)
    expect(result).toHaveLength(RECENTLY_VIEWED_MAX)
    expect(result).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  })

  it('liste pleine et produit déjà présent : rien ne sort, il remonte', () => {
    const full = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
    expect(pushRecentlyViewed(full, 1)).toEqual([1, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  })

  it('respecte un maximum personnalisé', () => {
    expect(pushRecentlyViewed([1, 2, 3], 4, 3)).toEqual([4, 1, 2])
    expect(pushRecentlyViewed([1, 2, 3], 4, 0)).toEqual([])
  })

  it('un identifiant invalide ne modifie pas la liste', () => {
    expect(pushRecentlyViewed([3, 17], Number.NaN)).toEqual([3, 17])
    expect(pushRecentlyViewed([3, 17], 0)).toEqual([3, 17])
    expect(pushRecentlyViewed([3, 17], -1)).toEqual([3, 17])
    expect(pushRecentlyViewed([3, 17], 2.5)).toEqual([3, 17])
  })

  it('ne modifie pas le tableau reçu (fonction pure)', () => {
    const ids = [3, 17, 42]
    pushRecentlyViewed(ids, 17)
    expect(ids).toEqual([3, 17, 42])
  })
})

describe('parseRecentlyViewedCookie', () => {
  it("lit un tableau JSON encodé pour l'URL (format écrit par l'application)", () => {
    expect(parseRecentlyViewedCookie('%5B17%2C3%2C42%5D')).toEqual([17, 3, 42])
  })

  it('lit un tableau JSON non encodé ou déjà décodé', () => {
    expect(parseRecentlyViewedCookie('[17,3,42]')).toEqual([17, 3, 42])
    expect(parseRecentlyViewedCookie([17, 3, 42])).toEqual([17, 3, 42])
  })

  it('tableau vide → liste vide', () => {
    expect(parseRecentlyViewedCookie('[]')).toEqual([])
    expect(parseRecentlyViewedCookie([])).toEqual([])
  })

  it('cookie absent ou vide → liste vide', () => {
    expect(parseRecentlyViewedCookie(null)).toEqual([])
    expect(parseRecentlyViewedCookie(undefined)).toEqual([])
    expect(parseRecentlyViewedCookie('')).toEqual([])
    expect(parseRecentlyViewedCookie('   ')).toEqual([])
  })

  it('JSON invalide ou modifié à la main → ignoré', () => {
    for (const raw of ['abc', '1,,2', '5,5,5', '[1,2', '{"ids":[1]}', '%E0%A4%A', 'null', '42', 'true']) {
      expect(parseRecentlyViewedCookie(raw)).toEqual([])
    }
  })

  it('autres types inattendus → liste vide', () => {
    expect(parseRecentlyViewedCookie(42)).toEqual([])
    expect(parseRecentlyViewedCookie({ ids: [1, 2] })).toEqual([])
  })

  it('valeurs non numériques ou invalides dans le tableau → ignorées', () => {
    expect(parseRecentlyViewedCookie('["abc",3,null,-1,0,2.5,"7",{},17]')).toEqual([3, 17])
  })

  it('doublons retirés, la première occurrence (la plus récente) est gardée', () => {
    expect(parseRecentlyViewedCookie('[5,5,5]')).toEqual([5])
    expect(parseRecentlyViewedCookie('[3,17,3,42,17]')).toEqual([3, 17, 42])
  })

  it('au-delà de 10 identifiants, seuls les 10 plus récents sont gardés', () => {
    const raw = JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(parseRecentlyViewedCookie(raw)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('les doublons ne comptent pas dans le maximum', () => {
    const raw = JSON.stringify([1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(parseRecentlyViewedCookie(raw)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })
})

describe('serializeRecentlyViewed', () => {
  it('produit une valeur de cookie sûre (sans virgule ni crochet bruts)', () => {
    expect(serializeRecentlyViewed([17, 3])).toBe('%5B17%2C3%5D')
    expect(serializeRecentlyViewed([])).toBe('%5B%5D')
  })

  it("aller-retour : ce qui est écrit est relu à l'identique", () => {
    const ids = [8, 3, 17, 42]
    expect(parseRecentlyViewedCookie(serializeRecentlyViewed(ids))).toEqual(ids)
  })
})
