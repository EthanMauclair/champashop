// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: [
    '@pinia/nuxt',
    '@nuxt/eslint',
    '@nuxt/test-utils/module'
  ],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      // Langue de la page : indispensable pour l'accessibilité et le référencement.
      htmlAttrs: { lang: 'fr' },
      title: 'ChampaShop',
      meta: [
        { name: 'description', content: 'ChampaShop, la boutique en ligne troyenne : beauté, maison, high-tech et épicerie, livraison offerte dès 80 €.' },
        { name: 'theme-color', content: '#111827' },
        { property: 'og:site_name', content: 'ChampaShop' },
        { property: 'og:locale', content: 'fr_FR' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' },
        { rel: 'preconnect', href: 'https://cdn.dummyjson.com' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      // URL publique du site (surchargée par NUXT_PUBLIC_SITE_URL), utilisée par le sitemap.
      siteUrl: 'https://champashop.vercel.app',
    },
  },
  typescript: {
    strict: true,
    typeCheck: true
  }
})
