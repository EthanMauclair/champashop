<template>
  <form class="promo card" @submit.prevent="onSubmit">
    <label for="promo-code" class="field__label">Code promo</label>
    <div class="promo__controls">
      <input
        id="promo-code"
        v-model="code"
        type="text"
        name="promo"
        autocomplete="off"
        maxlength="30"
        class="input promo__input"
        placeholder="Ex. : TROYES10"
      >
      <button type="submit" class="btn btn--secondary">Appliquer</button>
    </div>

    <p v-if="appliedCode" class="promo__applied">
      Code saisi : <strong>{{ appliedCode }}</strong>
      <button type="button" class="btn btn--danger-ghost btn--sm" @click="onRemove">Retirer</button>
    </p>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'

/**
 * Formulaire de code promo. Il ne décide PAS si le code est valable :
 * c'est le moteur de promotions (utils/promotions.ts) qui l'évalue, et
 * ses messages sont affichés dans le récapitulatif.
 */
const props = defineProps<{
  appliedCode: string
}>()

const emit = defineEmits<{
  apply: [code: string]
  remove: []
}>()

const code = ref<string>(props.appliedCode)

function onSubmit(): void {
  emit('apply', code.value)
}

function onRemove(): void {
  code.value = ''
  emit('remove')
}
</script>

<style scoped>
.promo {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding: var(--space-5);
}

.promo__controls {
  display: flex;
  gap: var(--space-2);
}

.promo__input {
  flex: 1;
  min-width: 0;
  text-transform: uppercase;
}

.promo__applied {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
