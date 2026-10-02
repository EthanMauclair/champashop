<template>
  <main v-if="auth.user" class="container account">
    <header class="page-header">
      <h1 class="page-header__title">Mon compte</h1>
      <p class="page-header__subtitle">Bonjour {{ auth.user.firstName }} !</p>
    </header>

    <div class="account__grid">
      <section class="profile card" aria-labelledby="profile-title">
        <h2 id="profile-title" class="visually-hidden">Profil</h2>
        <img :src="auth.user.image" alt="" class="profile__avatar" width="96" height="96">
        <p class="profile__name">{{ auth.user.firstName }} {{ auth.user.lastName }}</p>
        <dl class="profile__details">
          <div>
            <dt>Identifiant</dt>
            <dd>{{ auth.user.username }}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{{ auth.user.email }}</dd>
          </div>
        </dl>
        <button type="button" class="btn btn--secondary btn--block" @click="auth.logout()">
          Se déconnecter
        </button>
      </section>

      <!-- Démonstration du rafraîchissement « single-flight » demandé par le sujet -->
      <section class="refresh-test card" aria-labelledby="refresh-title">
        <h2 id="refresh-title">Tester le rafraîchissement du jeton</h2>
        <ol class="refresh-test__steps">
          <li>Connectez-vous en cochant « Session de test (1 minute) ».</li>
          <li>Attendez plus d'une minute : le jeton d'accès expire.</li>
          <li>Lancez le test : {{ PARALLEL_REQUESTS }} requêtes partent en même temps et reçoivent une 401.</li>
        </ol>
        <p class="refresh-test__expected">
          Résultat attendu : <strong>un seul</strong> appel à <code>POST /auth/refresh</code>,
          puis les {{ PARALLEL_REQUESTS }} requêtes sont rejouées avec succès.
        </p>

        <button type="button" class="btn btn--accent" :disabled="testRunning" @click="runRefreshTest">
          {{ testRunning ? 'Test en cours…' : `Lancer ${PARALLEL_REQUESTS} requêtes simultanées` }}
        </button>

        <div v-if="testResult" class="refresh-test__result" role="status">
          <p>
            Requêtes réussies : <strong>{{ testResult.succeeded }} / {{ PARALLEL_REQUESTS }}</strong><br>
            Appels à <code>/auth/refresh</code> pendant le test : <strong>{{ testResult.refreshCalls }}</strong>
          </p>
          <p class="refresh-test__verdict" :class="`refresh-test__verdict--${testResult.verdict}`">
            {{ verdictLabel }}
          </p>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { User } from '~/types/dummyjson'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
})

const PARALLEL_REQUESTS = 3

interface RefreshTestResult {
  succeeded: number
  refreshCalls: number
  /** single : 1 refresh (jeton expiré) ; none : jeton encore valide ; multiple : problème. */
  verdict: 'single' | 'none' | 'multiple'
}

const auth = useAuthStore()
const testRunning = ref<boolean>(false)
const testResult = ref<RefreshTestResult | null>(null)

const verdictLabel = computed<string>(() => {
  switch (testResult.value?.verdict) {
    case 'single':
      return 'Single-flight vérifié : un seul rafraîchissement pour toutes les requêtes.'
    case 'none':
      return 'Le jeton était encore valide : aucun rafraîchissement nécessaire. Attendez l\'expiration puis relancez.'
    case 'multiple':
      return 'Plusieurs rafraîchissements sont partis : le single-flight ne fonctionne pas.'
    default:
      return ''
  }
})

async function runRefreshTest(): Promise<void> {
  testRunning.value = true
  testResult.value = null
  const refreshBefore = auth.refreshCount

  const results = await Promise.allSettled(
    Array.from({ length: PARALLEL_REQUESTS }, () => auth.authFetch<User>('/auth/me')),
  )

  const refreshCalls = auth.refreshCount - refreshBefore
  testResult.value = {
    succeeded: results.filter(result => result.status === 'fulfilled').length,
    refreshCalls,
    verdict: refreshCalls === 0 ? 'none' : refreshCalls === 1 ? 'single' : 'multiple',
  }
  testRunning.value = false
}

useSeoMeta({
  title: 'Mon compte',
  robots: 'noindex',
})
</script>

<style scoped>
.account__grid {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 2fr;
  gap: var(--space-5);
  align-items: start;
}

.profile {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  padding: var(--space-6) var(--space-5);
  text-align: center;
}

.profile__avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--color-surface-muted);
}

.profile__name {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: 700;
}

.profile__details {
  display: grid;
  gap: var(--space-2);
  width: 100%;
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
}

.profile__details div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.profile__details dt {
  color: var(--color-text-muted);
}

.profile__details dd {
  margin: 0;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.refresh-test {
  padding: var(--space-5);
}

.refresh-test__steps {
  margin: 0 0 var(--space-3);
  padding-left: var(--space-5);
  color: var(--color-text-muted);
}

.refresh-test__expected {
  color: var(--color-text-muted);
}

.refresh-test code {
  padding: 1px var(--space-1);
  border-radius: 4px;
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: var(--text-sm);
}

.refresh-test__result {
  margin-top: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
}

.refresh-test__verdict {
  margin: 0;
  font-weight: 600;
}

.refresh-test__verdict--single { color: var(--color-success); }
.refresh-test__verdict--none { color: var(--color-warning); }
.refresh-test__verdict--multiple { color: var(--color-danger); }

@media (max-width: 760px) {
  .account__grid {
    grid-template-columns: 1fr;
  }
}
</style>
