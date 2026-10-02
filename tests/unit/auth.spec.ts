import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AUTH_REDIRECT,
  createAuthRequest,
  createSingleFlight,
  isUnauthorizedError,
  sanitizeRedirect,
  toUser,
} from '../../app/utils/auth'
import type { LoginResponse } from '../../app/types/dummyjson'

/** Erreur au format de $fetch (ofetch) : statusCode + status. */
function httpError(status: number): Error & { statusCode: number, status: number } {
  return Object.assign(new Error(`HTTP ${status}`), { statusCode: status, status })
}

/** Promesse résolue « plus tard », pour simuler une requête réseau. */
function later<T>(value: T, ms = 5): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

describe('createSingleFlight', () => {
  it('appels simultanés : une seule exécution, même résultat pour tous', async () => {
    let calls = 0
    const run = createSingleFlight(async () => {
      calls++
      return later(`jeton-${calls}`)
    })

    const results = await Promise.all([run(), run(), run()])

    expect(calls).toBe(1)
    expect(results).toEqual(['jeton-1', 'jeton-1', 'jeton-1'])
  })

  it('une fois terminé, l\'appel suivant relance la tâche', async () => {
    let calls = 0
    const run = createSingleFlight(async () => ++calls)
    await run()
    await run()
    expect(calls).toBe(2)
  })

  it('un échec est transmis à tous et ne bloque pas les appels suivants', async () => {
    let calls = 0
    const run = createSingleFlight(async () => {
      calls++
      if (calls === 1) throw new Error('réseau')
      return 'ok'
    })

    const failures = await Promise.allSettled([run(), run()])
    expect(failures.map(f => f.status)).toEqual(['rejected', 'rejected'])
    expect(calls).toBe(1)
    expect(await run()).toBe('ok')
  })
})

describe('isUnauthorizedError', () => {
  it('reconnaît une 401 via statusCode ou status', () => {
    expect(isUnauthorizedError(httpError(401))).toBe(true)
    expect(isUnauthorizedError({ status: 401 })).toBe(true)
  })

  it('ignore les autres erreurs et les valeurs non objet', () => {
    expect(isUnauthorizedError(httpError(403))).toBe(false)
    expect(isUnauthorizedError(new Error('réseau'))).toBe(false)
    expect(isUnauthorizedError(null)).toBe(false)
    expect(isUnauthorizedError('401')).toBe(false)
  })
})

describe('createAuthRequest', () => {
  /** Simule un serveur : seul `validToken` est accepté, sinon 401. */
  function setup(options: { refreshSucceeds?: boolean } = {}) {
    const state = {
      token: 'expiré' as string | null,
      validToken: 'neuf',
      refreshCalls: 0,
      expired: 0,
      sent: [] as Array<string | null>,
    }
    const refresh = createSingleFlight(async (): Promise<string | null> => {
      state.refreshCalls++
      await later(null)
      if (options.refreshSucceeds === false) return null
      state.token = state.validToken
      return state.token
    })
    const authRequest = createAuthRequest({
      getAccessToken: () => state.token,
      refresh,
      onSessionExpired: () => {
        state.expired++
        state.token = null
      },
    })
    const send = async (token: string | null): Promise<string> => {
      state.sent.push(token)
      await later(null)
      if (token !== state.validToken) throw httpError(401)
      return `réponse avec ${token}`
    }
    return { state, authRequest, send }
  }

  it('jeton valide : une seule requête, pas de rafraîchissement', async () => {
    const { state, authRequest, send } = setup()
    state.token = 'neuf'
    expect(await authRequest(send)).toBe('réponse avec neuf')
    expect(state.refreshCalls).toBe(0)
  })

  it('3 requêtes en 401 simultanées : UN SEUL refresh, puis les 3 sont rejouées', async () => {
    const { state, authRequest, send } = setup()

    const results = await Promise.all([authRequest(send), authRequest(send), authRequest(send)])

    expect(state.refreshCalls).toBe(1)
    expect(results).toEqual(['réponse avec neuf', 'réponse avec neuf', 'réponse avec neuf'])
    // 3 envois avec l'ancien jeton + 3 rejoués avec le nouveau
    expect(state.sent).toEqual(['expiré', 'expiré', 'expiré', 'neuf', 'neuf', 'neuf'])
  })

  it('401 reçue après un refresh déjà terminé : rejoue sans nouveau refresh', async () => {
    const { state, authRequest } = setup()
    // Cette requête est lente : le jeton est rafraîchi par ailleurs avant sa 401.
    const slowSend = async (token: string | null): Promise<string> => {
      if (token === 'expiré') {
        state.token = 'neuf'
        throw httpError(401)
      }
      return `réponse avec ${token}`
    }
    expect(await authRequest(slowSend)).toBe('réponse avec neuf')
    expect(state.refreshCalls).toBe(0)
  })

  it('refresh refusé : session terminée et erreur 401 relancée', async () => {
    const { state, authRequest, send } = setup({ refreshSucceeds: false })

    await expect(authRequest(send)).rejects.toMatchObject({ statusCode: 401 })
    expect(state.expired).toBe(1)
    expect(state.token).toBeNull()
  })

  it('autre erreur (404, réseau) : relancée sans rafraîchissement', async () => {
    const { state, authRequest } = setup()
    await expect(authRequest(async () => {
      throw httpError(404)
    })).rejects.toMatchObject({ statusCode: 404 })
    expect(state.refreshCalls).toBe(0)
  })
})

describe('sanitizeRedirect', () => {
  it('accepte les chemins internes', () => {
    expect(sanitizeRedirect('/compte')).toBe('/compte')
    expect(sanitizeRedirect('/panier?code=TROYES10')).toBe('/panier?code=TROYES10')
    expect(sanitizeRedirect(['/compte', '/autre'])).toBe('/compte')
  })

  it('refuse les URL externes (redirection ouverte) et les valeurs invalides', () => {
    expect(sanitizeRedirect('https://pirate.example')).toBe(DEFAULT_AUTH_REDIRECT)
    expect(sanitizeRedirect('//pirate.example')).toBe(DEFAULT_AUTH_REDIRECT)
    expect(sanitizeRedirect('/\\pirate.example')).toBe(DEFAULT_AUTH_REDIRECT)
    expect(sanitizeRedirect(undefined)).toBe(DEFAULT_AUTH_REDIRECT)
    expect(sanitizeRedirect(42)).toBe(DEFAULT_AUTH_REDIRECT)
  })

  it('évite une boucle vers la page de connexion', () => {
    expect(sanitizeRedirect('/connexion?redirect=/compte')).toBe(DEFAULT_AUTH_REDIRECT)
  })
})

describe('toUser', () => {
  it('ne garde que les champs utiles (jamais les jetons)', () => {
    const response: LoginResponse = {
      id: 1,
      username: 'emilys',
      email: 'emily@example.com',
      firstName: 'Emily',
      lastName: 'Johnson',
      gender: 'female',
      image: 'https://dummyjson.com/icon/emilys/128',
      accessToken: 'a',
      refreshToken: 'r',
    }
    const user = toUser(response)
    expect(user).toEqual({
      id: 1,
      username: 'emilys',
      email: 'emily@example.com',
      firstName: 'Emily',
      lastName: 'Johnson',
      gender: 'female',
      image: 'https://dummyjson.com/icon/emilys/128',
    })
    expect('accessToken' in user).toBe(false)
  })
})
