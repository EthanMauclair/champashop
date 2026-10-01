/**
 * Plan du site pour les moteurs de recherche (« site référençable »).
 * Généré à la demande : pages fixes, catégories et toutes les fiches produits.
 */

// Types minimaux (le dossier server/ ne doit pas dépendre de app/).
interface SitemapCategory {
  slug: string
}

interface SitemapProductsResponse {
  products: Array<{ id: number }>
}

const API_URL = 'https://dummyjson.com/products'

function urlEntry(loc: string): string {
  return `  <url><loc>${loc.replace(/&/g, '&amp;')}</loc></url>`
}

export default defineEventHandler(async (event): Promise<string> => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl.replace(/\/$/, '')

  const [categories, products] = await Promise.all([
    $fetch<SitemapCategory[]>(`${API_URL}/categories`),
    $fetch<SitemapProductsResponse>(API_URL, { query: { limit: 0, select: 'id' } }),
  ])

  const urls = [
    `${siteUrl}/`,
    `${siteUrl}/produits`,
    ...categories.map(category => `${siteUrl}/produits?category=${encodeURIComponent(category.slug)}`),
    ...products.products.map(product => `${siteUrl}/produits/${product.id}`),
  ]

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(urlEntry),
    '</urlset>',
  ].join('\n')
})
