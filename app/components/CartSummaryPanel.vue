<template>
  <section class="summary" aria-labelledby="summary-title">
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
  padding: 1.5rem;
  border: 1px solid #eaeaea;
  border-radius: 8px;
  background: #f8f9fa;
}
.summary h2 {
  margin-top: 0;
  font-size: 1.25rem;
}
.summary__rows {
  margin: 0;
}
.summary__row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.4rem 0;
}
.summary__row dt {
  margin: 0;
}
.summary__row dd {
  margin: 0;
  white-space: nowrap;
}
.summary__row--discount {
  color: #1e6b3a;
}
.summary__row--total {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 2px solid #2c3e50;
  font-size: 1.2rem;
  font-weight: bold;
}
.summary__messages {
  margin: 1rem 0 0;
  padding: 0.75rem 1rem 0.75rem 2rem;
  border-radius: 4px;
  background: #fff4e5;
  color: #7a4100;
}
</style>
