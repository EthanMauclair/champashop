<template>
  <main class="container login-page">
    <section class="login card" aria-labelledby="login-title">
      <h1 id="login-title" class="login__title">Connexion</h1>
      <p class="login__subtitle">Accédez à votre compte ChampaShop.</p>

      <p v-if="redirectedFromProtectedPage" class="notice login__notice" role="status">
        Connectez-vous pour accéder à cette page.
      </p>

      <form class="login__form" novalidate @submit.prevent="onSubmit">
        <div class="field">
          <label for="username" class="field__label">Identifiant</label>
          <input
            id="username"
            v-model="username"
            type="text"
            name="username"
            class="input"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            required
            :aria-invalid="errorMessage ? 'true' : undefined"
            :aria-describedby="errorMessage ? 'login-error' : undefined"
          >
        </div>

        <div class="field">
          <label for="password" class="field__label">Mot de passe</label>
          <div class="password">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              class="input password__input"
              autocomplete="current-password"
              required
              :aria-invalid="errorMessage ? 'true' : undefined"
              :aria-describedby="errorMessage ? 'login-error' : undefined"
            >
            <button
              type="button"
              class="btn btn--secondary btn--sm password__toggle"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Masquer' : 'Afficher' }}
            </button>
          </div>
        </div>

        <label class="checkbox">
          <input v-model="shortSession" type="checkbox" name="short-session">
          <span>
            Session de test (1 minute)
            <span class="checkbox__hint">Pour vérifier le rafraîchissement automatique du jeton.</span>
          </span>
        </label>

        <p v-if="errorMessage" id="login-error" class="login__error" role="alert">
          {{ errorMessage }}
        </p>

        <button type="submit" class="btn btn--primary btn--block" :disabled="pending">
          {{ pending ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>

      <p class="login__demo">
        Compte de démonstration : <code>emilys</code> / <code>emilyspass</code>
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { isUnauthorizedError, sanitizeRedirect } from '~/utils/auth'

const TEST_SESSION_MINUTES = 1
const DEFAULT_SESSION_MINUTES = 30

const route = useRoute()
const auth = useAuthStore()

const redirectTo = computed<string>(() => sanitizeRedirect(route.query.redirect))
const redirectedFromProtectedPage = computed<boolean>(() => typeof route.query.redirect === 'string')

// Déjà connecté : inutile d'afficher le formulaire.
if (auth.isAuthenticated) {
  await navigateTo(redirectTo.value, { replace: true })
}

const username = ref<string>('')
const password = ref<string>('')
const showPassword = ref<boolean>(false)
const shortSession = ref<boolean>(false)
const pending = ref<boolean>(false)
const errorMessage = ref<string>('')

/** DummyJSON répond 400 (ou 401) quand les identifiants sont refusés. */
function isRejectedCredentials(error: unknown): boolean {
  return isUnauthorizedError(error)
    || (typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 400)
}

async function onSubmit(): Promise<void> {
  errorMessage.value = ''
  if (!username.value.trim() || !password.value) {
    errorMessage.value = 'Saisissez votre identifiant et votre mot de passe.'
    return
  }

  pending.value = true
  try {
    await auth.login({
      username: username.value,
      password: password.value,
      expiresInMins: shortSession.value ? TEST_SESSION_MINUTES : DEFAULT_SESSION_MINUTES,
    })
    password.value = ''
    await navigateTo(redirectTo.value)
  }
  catch (error) {
    errorMessage.value = isRejectedCredentials(error)
      ? 'Identifiant ou mot de passe incorrect.'
      : 'Connexion impossible pour le moment. Réessayez dans quelques instants.'
  }
  finally {
    pending.value = false
  }
}

useSeoMeta({
  title: 'Connexion',
  description: 'Connectez-vous à votre compte ChampaShop.',
  robots: 'noindex',
})
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  padding-top: var(--space-7);
}

.login {
  width: 100%;
  max-width: 420px;
  padding: var(--space-6);
}

.login__title {
  margin-bottom: var(--space-1);
}

.login__subtitle {
  margin-bottom: var(--space-5);
  color: var(--color-text-muted);
}

.login__notice {
  margin-bottom: var(--space-5);
}

.login__form {
  display: grid;
  gap: var(--space-4);
}

.password {
  display: flex;
  gap: var(--space-2);
}

.password__input {
  flex: 1;
  min-width: 0;
}

.password__toggle {
  min-height: 44px;
}

.checkbox {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  font-size: var(--text-sm);
  cursor: pointer;
}

.checkbox input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: var(--color-accent);
}

.checkbox__hint {
  display: block;
  color: var(--color-text-muted);
}

.login__error {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-danger-soft);
  color: var(--color-danger);
  font-size: var(--text-sm);
}

.login__demo {
  margin: var(--space-5) 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  text-align: center;
}

.login__demo code {
  padding: 1px var(--space-1);
  border-radius: 4px;
  background: var(--color-surface-muted);
  color: var(--color-text);
}
</style>
