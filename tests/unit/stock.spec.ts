import { describe, expect, it } from 'vitest'
import { LOW_STOCK_THRESHOLD, getStockStatus } from '../../app/utils/stock'

describe('getStockStatus', () => {
  it('0 (ou négatif) : rupture de stock, non achetable', () => {
    expect(getStockStatus(0)).toEqual({ level: 'out', label: 'Rupture de stock', purchasable: false })
    expect(getStockStatus(-1).level).toBe('out')
  })

  it('en dessous de 5 : « Plus que X en stock »', () => {
    expect(getStockStatus(1)).toEqual({ level: 'low', label: 'Plus que 1 en stock', purchasable: true })
    expect(getStockStatus(LOW_STOCK_THRESHOLD - 1).label).toBe('Plus que 4 en stock')
  })

  it('à partir de 5 : en stock', () => {
    expect(getStockStatus(LOW_STOCK_THRESHOLD)).toEqual({ level: 'available', label: 'En stock', purchasable: true })
    expect(getStockStatus(120).level).toBe('available')
  })
})
