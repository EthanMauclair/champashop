/**
 * Logique d'authentification (F5) en fonctions pures : aucune dépendance à
 * Vue, Nuxt ou Pinia, testées dans tests/unit/auth.spec.ts.
 * Le store `stores/auth.ts` les assemble avec les cookies et $fetch.
 */
import type { LoginResponse, User } from '../types/dummyjson'

/** Page par défaut après connexion. */
export const DEFAULT_AUTH_REDIRECT = '/compte'

/* ------------------------------------------------------------------ */
/* Single-flight                                                      */
/* ------------------------------------------------------------------ */

/**
 * « Single-flight » : tant qu'un appel est en cours, les appels suivants
 * reçoivent la MÊME promesse au lieu d'en lancer un nouveau. Une fois la
 * promesse terminée (succès ou échec), le prochain appel repart à zéro.
 *
 * Utilisé pour le rafraîchissement du jeton : si 3 requêtes reçoivent une
 * 401 en même temps, une seule requête POST /auth/refresh part.
 */
export function createSingleFlight<T>(task: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null
  return () => {
    if (inFlight === null) {
      inFlight = task().finally(() => {
        inFlight = null
      })
    }
    return inFlight
  }
}

/* ------------------------------------------------------------------ */
/* Requêtes authentifiées                                             */
/* ------------------------------------------------------------------ */

/** Vrai si l'erreur est une réponse HTTP 401 (format des erreurs $fetch). */
export function isUnauthorizedError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }
  if ('statusCode' in error && error.statusCode === 401) {
    return true
  }
  return 'status' in error && error.status === 401
}

export interface AuthRequestDependencies {
  /** Jeton d'accès actuel (lu dans le cookie), null si déconnecté. */
  getAccessToken: () => string | null
  /** Rafraîchit les jetons et renvoie le nouveau jeton d'accès (null si échec). Doit être single-flight. */
  refresh: () => Promise<string | null>
  /** Appelé quand la session est définitivement expirée (refresh refusé). */
  onSessionExpired: () => void
}

/** Envoie une requête avec un jeton donné ; le jeton est null si déconnecté. */
export type AuthRequestSender<T> = (accessToken: string | null) => Promise<T>

export type AuthRequest = <T>(send: AuthRequestSender<T>) => Promise<T>

/**
 * Fabrique la fonction qui exécute une requête authentifiée :
 * 1. envoie la requête avec le jeton actuel ;
 * 2. en cas de 401, rafraîchit le jeton (single-flight) puis REJOUE la requête ;
 * 3. si le rafraîchissement échoue, termine la session et relance l'erreur.
 * Les autres erreurs (404, réseau…) sont relancées sans rafraîchissement.
 */
export function createAuthRequest(deps: AuthRequestDependencies): AuthRequest {
  return async <T>(send: AuthRequestSender<T>): Promise<T> => {
    const usedToken = deps.getAccessToken()
    try {
      return await send(usedToken)
    }
    catch (error) {
      if (!isUnauthorizedError(error)) {
        throw error
      }

      // Une autre requête a peut-être déjà rafraîchi le jeton pendant que
      // celle-ci attendait sa 401 : on rejoue directement avec le nouveau.
      const currentToken = deps.getAccessToken()
      const newToken = currentToken !== null && currentToken !== usedToken
        ? currentToken
        : await deps.refresh()

      if (newToken === null) {
        deps.onSessionExpired()
        throw error
      }
      return send(newToken)
    }
  }
}

/* ------------------------------------------------------------------ */
/* Divers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Valide le paramètre `?redirect=` de /connexion. Seuls les chemins internes
 * sont acceptés (« /compte », « /panier?x=1 ») : une URL externe
 * (« https://… », « //site-pirate.fr ») serait une redirection ouverte.
 */
export function sanitizeRedirect(raw: unknown, fallback = DEFAULT_AUTH_REDIRECT): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') {
    return fallback
  }
  const isInternalPath = value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')
  if (!isInternalPath || value.startsWith('/connexion')) {
    return fallback
  }
  return value
}

/** Ne garde que les champs utilisateur utiles (la réponse de l'API en contient beaucoup plus). */
export function toUser(data: User | LoginResponse): User {
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    gender: data.gender,
    image: data.image,
  }
}
