<template>
  <div class="copy-link">
    <button type="button" class="btn btn--secondary btn--sm" @click="copy">
      <span aria-hidden="true">{{ copied ? '✓' : '⧉' }}</span>
      {{ copied ? 'Lien copié' : 'Copier le lien' }}
    </button>

    <!-- Solution de repli : le lien dans un champ sélectionné, à copier soi-même. -->
    <div v-if="showFallback" class="copy-link__fallback field">
      <label :for="inputId" class="field__label">Lien de la comparaison</label>
      <input :id="inputId" ref="inputRef" class="input" type="text" readonly :value="url" @focus="selectAll">
    </div>

    <!-- Confirmation annoncée aux lecteurs d'écran. -->
    <p class="copy-link__status" role="status" aria-live="polite">{{ status }}</p>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId } from 'vue'

/**
 * Bouton « Copier le lien » : Clipboard API, confirmation annoncée, et
 * solution de repli si l'API n'est pas disponible (contexte non sécurisé,
 * navigateur ancien, permission refusée).
 */
const props = defineProps<{
  url: string
}>()

const FEEDBACK_DURATION_MS = 2000

const inputId = useId()
const inputRef = ref<HTMLInputElement | null>(null)
const copied = ref<boolean>(false)
const showFallback = ref<boolean>(false)
const status = ref<string>('')
let feedbackTimer: ReturnType<typeof setTimeout> | undefined

function selectAll(): void {
  inputRef.value?.select()
}

async function copy(): Promise<void> {
  status.value = ''
  clearTimeout(feedbackTimer)
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      throw new Error("Clipboard API indisponible")
    }
    await navigator.clipboard.writeText(props.url)
    showFallback.value = false
    copied.value = true
    status.value = 'Lien copié dans le presse-papiers.'
    feedbackTimer = setTimeout(() => {
      copied.value = false
    }, FEEDBACK_DURATION_MS)
  } catch {
    // Repli : on affiche le lien déjà sélectionné, prêt à être copié.
    showFallback.value = true
    status.value = 'Copie automatique impossible : le lien est sélectionné dans le champ, copiez-le avec Ctrl+C.'
    await nextTick()
    inputRef.value?.focus()
    inputRef.value?.select()
  }
}

onBeforeUnmount(() => clearTimeout(feedbackTimer))
</script>

<style scoped>
.copy-link {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
}

.copy-link__fallback {
  width: min(100%, 28rem);
}

.copy-link__status {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

/* Pas de display: none : la zone doit rester dans l'arbre d'accessibilité
   pour que le message soit annoncé quand il apparaît. */
.copy-link__status:empty {
  position: absolute;
}
</style>
