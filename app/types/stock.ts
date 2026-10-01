/** Niveau de stock affiché sur la fiche produit. */
export type StockLevel = 'out' | 'low' | 'available'

export interface StockStatus {
  level: StockLevel
  label: string
  /** Vrai si le produit peut être ajouté au panier. */
  purchasable: boolean
}
