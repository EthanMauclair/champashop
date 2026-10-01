<template>
  <div class="skeleton" aria-hidden="true">
    <div class="skeleton__media shimmer" />
    <div class="skeleton__body">
      <div class="skeleton__line skeleton__line--xs shimmer" />
      <div class="skeleton__line shimmer" />
      <div class="skeleton__line skeleton__line--sm shimmer" />
      <div class="skeleton__line skeleton__line--price shimmer" />
      <div class="skeleton__button shimmer" />
    </div>
  </div>
</template>

<style scoped>
@keyframes shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

.skeleton {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.shimmer {
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite linear;
}

.skeleton__media {
  aspect-ratio: 1;
}

.skeleton__body {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
}

.skeleton__line {
  height: 14px;
  border-radius: var(--radius-full);
}

.skeleton__line--xs { width: 35%; height: 10px; }
.skeleton__line--sm { width: 25%; }
.skeleton__line--price { width: 40%; height: 18px; margin-top: var(--space-2); }

.skeleton__button {
  height: 36px;
  margin-top: var(--space-2);
  border-radius: var(--radius-full);
}
</style>
