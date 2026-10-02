/**
 * Types des réponses DummyJSON (https://dummyjson.com/docs/products),
 * écrits à partir des réponses réelles de l'API.
 */

export interface Review {
  rating: number
  comment: string
  date: string
  reviewerName: string
  reviewerEmail: string
}

export interface ProductDimensions {
  width: number
  height: number
  depth: number
}

export interface ProductMeta {
  createdAt: string
  updatedAt: string
  barcode: string
  qrCode: string
}

export interface Product {
  id: number
  title: string
  description: string
  category: string
  /** Prix unitaire en euros (flottant) : à convertir en centimes pour les calculs. */
  price: number
  /** Sert uniquement au badge « −X % » : jamais appliqué au prix. */
  discountPercentage: number
  rating: number
  stock: number
  tags: string[]
  /** Absente pour certains produits (ex. catégorie groceries). */
  brand?: string
  sku: string
  weight: number
  dimensions: ProductDimensions
  warrantyInformation: string
  shippingInformation: string
  availabilityStatus: string
  reviews: Review[]
  returnPolicy: string
  minimumOrderQuantity: number
  meta: ProductMeta
  images: string[]
  thumbnail: string
}

/** Sous-ensemble d'un produit suffisant pour une carte du catalogue. */
export type ProductPreview = Pick<Product, 'id' | 'title' | 'price' | 'thumbnail' | 'category' | 'stock'>
  & Partial<Pick<Product, 'rating' | 'discountPercentage'>>

/**
 * Réponse paginée de DummyJSON. Générique car avec `?select=` l'API ne
 * renvoie qu'une partie des champs de chaque produit.
 */
export interface ProductsResponse<T = Product> {
  products: T[]
  total: number
  skip: number
  limit: number
}

export interface Category {
  slug: string
  name: string
  url: string
}

/* ---- Authentification (https://dummyjson.com/docs/auth) ---------------- */

/** Jetons renvoyés par POST /auth/login et POST /auth/refresh. */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

/**
 * Utilisateur connecté. GET /auth/me renvoie beaucoup plus de champs
 * (adresse, banque…) : on ne garde que ceux affichés par l'application.
 */
export interface User {
  id: number
  username: string
  email: string
  firstName: string
  lastName: string
  gender: string
  image: string
}

/** Réponse de POST /auth/login : l'utilisateur et ses jetons. */
export type LoginResponse = User & AuthTokens

/** Corps de POST /auth/login. */
export interface LoginCredentials {
  username: string
  password: string
  /** Durée de validité de l'accessToken (1 minute pour tester le rafraîchissement). */
  expiresInMins?: number
}
