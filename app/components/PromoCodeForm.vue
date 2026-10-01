<template>
  <form class="promo" @submit.prevent="onSubmit">
    <label for="promo-code" class="promo__label">Code promo</label>
    <div class="promo__controls">
      <input
        id="promo-code"
        v-model="code"
        type="text"
        name="promo"
        autocomplete="off"
        maxlength="30"
        class="promo__input"
        placeholder="Ex. : TROYES10"
      >
      <button type="submit" class="promo__button">Appliquer</button>
    </div>

    <p v-if="appliedCode" class="promo__applied">
      Code saisi : <strong>{{ appliedCode }}</strong>
      <button type="button" class="promo__remove" @click="onRemove">Retirer le code</button>
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
  margin-top: 1.5rem;
}
.promo__label {
  display: block;
  font-weight: bold;
  margin-bottom: 0.4rem;
}
.promo__controls {
  display: flex;
  gap: 0.5rem;
}
.promo__input {
  flex: 1;
  min-width: 0;
  padding: 0.5rem;
  border: 1px solid #9ca3af;
  border-radius: 4px;
  font-size: 1rem;
}
.promo__button,
.promo__remove {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: #2c3e50;
  color: #fff;
  cursor: pointer;
}
.promo__remove {
  margin-left: 0.5rem;
  padding: 0.25rem 0.6rem;
  background: #fff;
  color: #b42318;
  border: 1px solid #b42318;
}
.promo__input:focus-visible,
.promo__button:focus-visible,
.promo__remove:focus-visible {
  outline: 3px solid #f39c12;
  outline-offset: 2px;
}
.promo__applied {
  margin: 0.75rem 0 0;
}
</style>
