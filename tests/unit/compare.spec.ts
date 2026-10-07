import { describe, expect, it } from 'vitest'
import {
  COMPARE_MAX,
  formatCompareIds,
  parseCompareIds,
  serializeCompareCookie,
  toComparePath,
  toggleCompare,
} from '../../app/utils/compare'

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
