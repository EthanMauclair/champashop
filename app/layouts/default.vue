<template>
  <div class="layout">
    <a href="#contenu" class="skip-link">Aller au contenu</a>
    <header class="site-header">
      <NuxtLink to="/produits" class="site-header__brand">ChampaShop</NuxtLink>
      <nav aria-label="Navigation principale">
        <ul class="site-header__nav">
          <li><NuxtLink to="/produits">Catalogue</NuxtLink></li>
          <li><CartLink /></li>
        </ul>
      </nav>
    </header>
    <div id="contenu" tabindex="-1">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.site-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.75rem 2rem;
  background-color: #2c3e50;
}
.site-header a {
  color: #fff;
  text-decoration: none;
}
.site-header a:focus-visible {
  outline: 3px solid #f39c12;
  outline-offset: 2px;
}
.site-header__brand {
  font-size: 1.4rem;
  font-weight: bold;
}
.site-header__nav {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.skip-link {
  position: absolute;
  left: -9999px;
}
.skip-link:focus {
  left: 1rem;
  top: 1rem;
  z-index: 10;
  padding: 0.5rem 1rem;
  background: #fff;
  color: #2c3e50;
}
</style>
