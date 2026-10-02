import { useAuthStore } from '~/stores/auth'

/**
 * Middleware de route « auth » : protège les pages qui le déclarent
 * (definePageMeta({ middleware: 'auth' })). Un visiteur non connecté est
 * envoyé vers /connexion?redirect=<page demandée>, puis renvoyé vers cette
 * page après connexion.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()

  // Cas rare côté navigateur : jeton présent mais utilisateur pas encore chargé.
  if (!auth.isAuthenticated && auth.hasSession) {
    await auth.fetchUser()
  }

  if (!auth.isAuthenticated) {
    return navigateTo({ path: '/connexion', query: { redirect: to.fullPath } })
  }
})
