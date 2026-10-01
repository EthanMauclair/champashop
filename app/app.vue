<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
// Ajoute « – ChampaShop » aux titres qui ne le contiennent pas déjà.
useHead({
  titleTemplate: (title?: string): string => {
    if (!title) return 'ChampaShop'
    return title.includes('ChampaShop') ? title : `${title} – ChampaShop`
  },
})
</script>
