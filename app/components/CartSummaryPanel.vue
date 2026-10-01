<template>
  <section class="summary card" aria-labelledby="summary-title">
    <h2 id="summary-title">Récapitulatif</h2>

    <dl class="summary__rows">
      <div class="summary__row">
        <dt>Sous-total brut</dt>
        <dd>{{ formatCents(summary.grossCents) }}</dd>
      </div>

      <!-- Détail ligne à ligne de chaque remise, avec sa raison -->
      <div v-for="discount in summary.discounts" :key="discount.id" class="summary__row summary__row--discount">
        <dt>{{ discount.label }}</dt>
        <dd>−{{ formatCents(discount.amountCents) }}</dd>
      </div>

      <div class="summary__row">
        <dt>Livraison</dt>
        <dd>{{ summary.shippingCents === 0 ? 'Offerte' : formatCents(summary.shippingCents) }}</dd>
      </div>

      <div class="summary__row summary__row--total">
        <dt>Total</dt>
        <dd>{{ formatCents(summary.totalCents) }}</dd>
      </div>
    </dl>

    <ul v-if="summary.messages.length" class="summary__messages" aria-live="polite">
      <li v-for="message in summary.messages" :key="message">{{ message }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { CartSummary } from '~/types/promotions'
import { formatCents } from '~/utils/money'

defineProps<{
  summary: CartSummary
}>()
</script>

<style scoped>
.summary {
  padding: var(--space-5);
}

.summary h2 {
  margin-bottom: var(--space-4);
}

.summary__rows {
  margin: 0;
}

.summary__row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-2) 0;
  font-size: var(--text-sm);
}

.summary__row dt {
  margin: 0;
  color: var(--color-text-muted);
}

.summary__row dd {
  margin: 0;
  white-space: nowrap;
  font-weight: 600;
}

.summary__row--discount dt,
.summary__row--discount dd {
  color: var(--color-success);
}

.summary__row--total {
  margin-top: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  font-size: var(--text-xl);
}

.summary__row--total dt {
  color: var(--color-text);
  font-weight: 700;
}

.summary__row--total dd {
  font-weight: 800;
}

.summary__messages {
  margin: var(--space-4) 0 0;
  padding: var(--space-3) var(--space-4) var(--space-3) var(--space-6);
  border-radius: var(--radius-sm);
  background: var(--color-warning-soft);
  color: var(--color-warning);
  font-size: var(--text-sm);
}
</style>
