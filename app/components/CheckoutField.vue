<template>
  <div class="field checkout-field" :class="{ 'checkout-field--invalid': error }">
    <label :for="id" class="field__label">
      {{ label }}
      <span v-if="!required" class="checkout-field__optional">(facultatif)</span>
    </label>
    <p v-if="hint" :id="`${id}-hint`" class="checkout-field__hint">{{ hint }}</p>
    <input
      :id="id"
      :value="modelValue"
      :type="type"
      :name="id"
      class="input"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :maxlength="maxlength"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      @input="onInput"
    >
    <p v-if="error" :id="`${id}-error`" class="checkout-field__error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * Champ de formulaire du tunnel de commande : libellé, aide, message
 * d'erreur relié au champ (aria-describedby) et état aria-invalid.
 * `format` permet de mettre en forme la saisie (numéro de carte…).
 */
const props = withDefaults(
  defineProps<{
    id: string
    label: string
    modelValue: string
    error?: string
    hint?: string
    type?: 'text' | 'email' | 'tel'
    autocomplete?: string
    inputmode?: 'text' | 'email' | 'tel' | 'numeric'
    maxlength?: number
    required?: boolean
    format?: (value: string) => string
  }>(),
  {
    error: undefined,
    hint: undefined,
    type: 'text',
    autocomplete: undefined,
    inputmode: undefined,
    maxlength: undefined,
    required: true,
    format: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const describedBy = computed<string | undefined>(() => {
  const ids = [props.hint ? `${props.id}-hint` : null, props.error ? `${props.id}-error` : null].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
})

function onInput(event: Event): void {
  const input = event.target as HTMLInputElement
  const value = props.format ? props.format(input.value) : input.value
  // On réécrit le champ pour afficher la valeur mise en forme.
  if (value !== input.value) {
    input.value = value
  }
  emit('update:modelValue', value)
}
</script>

<style scoped>
.checkout-field__optional {
  color: var(--color-text-muted);
  font-weight: 400;
}

.checkout-field__hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.checkout-field--invalid .input {
  border-color: var(--color-danger);
}

.checkout-field__error {
  margin: 0;
  color: var(--color-danger);
  font-size: var(--text-sm);
  font-weight: 500;
}
</style>
