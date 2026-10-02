import { useAuthStore } from '~/stores/auth'

/**
 * Côté serveur, avant le rendu : si un jeton est présent dans les cookies,
 * on charge l'utilisateur via GET /auth/me. L'état Pinia est ensuite
 * transmis au navigateur avec la page : pas de « flash » de l'état
 * déconnecté au rechargement.
 */
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  if (auth.hasSession && !auth.isAuthenticated) {
    await auth.fetchUser()
  }
})
