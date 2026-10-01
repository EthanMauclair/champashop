/**
 * Affichage du stock (F2), en fonction pure testée dans tests/unit/stock.spec.ts.
 * Règles du sujet : « Plus que X en stock » en dessous de 5,
 * « Rupture de stock » (et bouton désactivé) à 0.
 */
import type { StockStatus } from '../types/stock'

export const LOW_STOCK_THRESHOLD = 5

export function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) {
    return { level: 'out', label: 'Rupture de stock', purchasable: false }
  }
  if (stock < LOW_STOCK_THRESHOLD) {
    return { level: 'low', label: `Plus que ${stock} en stock`, purchasable: true }
  }
  return { level: 'available', label: 'En stock', purchasable: true }
}
