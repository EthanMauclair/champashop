/**
 * Store Pinia de l'authentification (F5), API DummyJSON.
 *
 * - Les jetons (accessToken, refreshToken) sont dans des cookies : ils sont
 *   lisibles côté serveur, ce qui permet de charger l'utilisateur pendant le
 *   rendu SSR (plugin `auth.server.ts`) sans « flash » de l'état déconnecté.
 * - Toutes les requêtes authentifiées passent par `authFetch`, qui rejoue la
 *   requête après un rafraîchissement single-flight du jeton en cas de 401.
 * - Les règles elles-mêmes (single-flight, rejeu, redirection) sont des
 *   fonctions pures de `utils/auth.ts`, testées unitairement.
 *
 * Le store est créé une fois PAR REQUÊTE côté serveur : le single-flight est
 * donc propre à chaque utilisateur (jamais partagé entre deux visiteurs).
 */
import { defineStore } from 'pinia'
import { useCookie } from '#app'
import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { AuthTokens, LoginCredentials, LoginResponse, User } from '../types/dummyjson'
import { createAuthRequest, createSingleFlight, toUser } from '../utils/auth'

const API_URL = 'https://dummyjson.com'

const ACCESS_COOKIE = 'champashop_access'
const REFRESH_COOKIE = 'champashop_refresh'
const SESSION_MINUTES_COOKIE = 'champashop_session_minutes'

const DEFAULT_SESSION_MINUTES = 30
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 jours : la validité réelle est contrôlée par l'API

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface AuthFetchOptions {
  method?: HttpMethod
  body?: Record<string, unknown>
  query?: Record<string, string | number>
}

/** Type de retour explicite du store (exigé par les consignes). */
export interface AuthStore {
  // état
  user: Ref<User | null>
  /** Nombre d'appels réels à POST /auth/refresh (pour vérifier le single-flight). */
  refreshCount: Ref<number>
  // valeurs calculées
  isAuthenticated: ComputedRef<boolean>
  /** Vrai si un jeton est présent dans les cookies (même si l'utilisateur n'est pas encore chargé). */
  hasSession: ComputedRef<boolean>
  // actions
  login: (credentials: LoginCredentials) => Promise<User>
  fetchUser: () => Promise<User | null>
  logout: () => Promise<void>
  authFetch: <T>(path: string, options?: AuthFetchOptions) => Promise<T>
}

export const useAuthStore = defineStore('auth', (): AuthStore => {
  const cookieOptions = {
    maxAge: COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax' as const,
    path: '/',
    secure: !import.meta.dev,
  }
  const accessCookie = useCookie<string | null>(ACCESS_COOKIE, { ...cookieOptions, default: () => null })
  const refreshCookie = useCookie<string | null>(REFRESH_COOKIE, { ...cookieOptions, default: () => null })
  const sessionMinutesCookie = useCookie<number | null>(SESSION_MINUTES_COOKIE, { ...cookieOptions, default: () => null })

  // ---- état -------------------------------------------------------------
  const user = ref<User | null>(null)
  const refreshCount = ref<number>(0)

  // ---- valeurs calculées ------------------------------------------------
  const isAuthenticated = computed<boolean>(() => user.value !== null)
  const hasSession = computed<boolean>(() => Boolean(accessCookie.value || refreshCookie.value))

  // ---- session ----------------------------------------------------------
  function sessionMinutes(): number {
    const minutes = Number(sessionMinutesCookie.value)
    return Number.isInteger(minutes) && minutes > 0 ? minutes : DEFAULT_SESSION_MINUTES
  }

  function saveTokens(tokens: AuthTokens): void {
    accessCookie.value = tokens.accessToken
    refreshCookie.value = tokens.refreshToken
  }

  function clearSession(): void {
    accessCookie.value = null
    refreshCookie.value = null
    sessionMinutesCookie.value = null
    user.value = null
  }

  /**
   * POST /auth/refresh, en single-flight : si plusieurs requêtes reçoivent
   * une 401 en même temps, elles attendent toutes ce même appel.
   * Renvoie le nouveau jeton d'accès, ou null si la session est expirée.
   */
  const refreshTokens = createSingleFlight(async (): Promise<string | null> => {
    const refreshToken = refreshCookie.value
    if (!refreshToken) {
      return null
    }
    refreshCount.value++
    try {
      const tokens = await $fetch<AuthTokens>(`${API_URL}/auth/refresh`, {
        method: 'POST',
        body: { refreshToken, expiresInMins: sessionMinutes() },
      })
      saveTokens(tokens)
      return tokens.accessToken
    }
    catch {
      return null
    }
  })

  const authRequest = createAuthRequest({
    getAccessToken: () => accessCookie.value ?? null,
    refresh: refreshTokens,
    onSessionExpired: clearSession,
  })

  /** Requête vers l'API DummyJSON avec `Authorization: Bearer <accessToken>`. */
  function authFetch<T>(path: string, options: AuthFetchOptions = {}): Promise<T> {
    return authRequest<T>(accessToken =>
      // Dans une fonction générique, TypeScript ne peut pas simplifier le type
      // « TypedInternalResponse » de $fetch (prévu pour les routes internes de
      // Nuxt) : pour une URL externe, c'est bien le JSON de type T qui revient.
      $fetch<T>(`${API_URL}${path}`, {
        method: options.method ?? 'GET',
        body: options.body,
        query: options.query,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      }) as Promise<T>,
    )
  }

  // ---- actions ----------------------------------------------------------

  /** POST /auth/login ; les erreurs (identifiants refusés, réseau) sont relancées. */
  async function login(credentials: LoginCredentials): Promise<User> {
    const expiresInMins = credentials.expiresInMins ?? DEFAULT_SESSION_MINUTES
    const response = await $fetch<LoginResponse>(`${API_URL}/auth/login`, {
      method: 'POST',
      body: {
        username: credentials.username.trim(),
        password: credentials.password,
        expiresInMins,
      },
    })
    saveTokens(response)
    sessionMinutesCookie.value = expiresInMins
    user.value = toUser(response)
    return user.value
  }

  /** GET /auth/me (côté serveur au premier rendu). Renvoie null si non connecté. */
  async function fetchUser(): Promise<User | null> {
    if (!hasSession.value) {
      user.value = null
      return null
    }
    try {
      user.value = toUser(await authFetch<User>('/auth/me'))
    }
    catch {
      // Jetons invalides ou API indisponible : on repart déconnecté.
      user.value = null
    }
    return user.value
  }

  /** Déconnexion : suppression des cookies et de l'état, retour à l'accueil. */
  async function logout(): Promise<void> {
    clearSession()
    await navigateTo('/')
  }

  return {
    user,
    refreshCount,
    isAuthenticated,
    hasSession,
    login,
    fetchUser,
    logout,
    authFetch,
  }
})
