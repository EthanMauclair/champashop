<template>
  <div class="layout">
    <a href="#contenu" class="skip-link">Aller au contenu</a>

    <header class="site-header">
      <div class="site-header__inner">
        <NuxtLink to="/" class="brand" aria-label="ChampaShop, accueil">
          <span class="brand__mark" aria-hidden="true">C</span>
          <span class="brand__name">ChampaShop</span>
        </NuxtLink>

        <nav aria-label="Navigation principale">
          <ul class="nav">
            <li><NuxtLink to="/produits" class="nav__link">Catalogue</NuxtLink></li>
            <li><CartLink /></li>
          </ul>
        </nav>
      </div>
    </header>

    <div id="contenu" class="layout__content" tabindex="-1">
      <slot />
    </div>

    <footer class="site-footer">
      <div class="site-footer__inner">
        <div>
          <p class="site-footer__brand">ChampaShop</p>
          <p class="site-footer__text">La boutique en ligne troyenne. Projet pédagogique, données fournies par DummyJSON.</p>
        </div>
        <ul class="site-footer__perks">
          <li>Livraison offerte dès 80 €</li>
          <li>−10 % dès 3 produits beauté</li>
          <li>Code <strong>TROYES10</strong> dès 50 € d'achat</li>
        </ul>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.layout__content {
  flex: 1;
}

.layout__content:focus {
  outline: none;
}

.skip-link {
  position: absolute;
  left: var(--space-4);
  top: -100px;
  z-index: 100;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-text);
  color: #fff;
  font-weight: 600;
}

.skip-link:focus {
  top: var(--space-3);
  color: #fff;
}

/* ---- En-tête ---------------------------------------------------------- */

.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgb(255 255 255 / 0.9);
  backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--color-border);
}

.site-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  max-width: var(--container-width);
  height: var(--header-height);
  margin: 0 auto;
  padding: 0 var(--space-5);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text);
  text-decoration: none;
  font-weight: 800;
  font-size: var(--text-lg);
  letter-spacing: -0.03em;
}

.brand:hover {
  color: var(--color-text);
}

.brand__mark {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--color-text);
  color: #fff;
  font-size: var(--text-base);
}

.nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.nav__link {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  color: var(--color-text-muted);
  font-weight: 500;
  text-decoration: none;
  transition: background-color var(--transition), color var(--transition);
}

.nav__link:hover,
.nav__link.router-link-active {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

/* ---- Pied de page ----------------------------------------------------- */

.site-footer {
  margin-top: var(--space-8);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}

.site-footer__inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-5);
  max-width: var(--container-width);
  margin: 0 auto;
  padding: var(--space-6) var(--space-5);
}

.site-footer__brand {
  margin-bottom: var(--space-1);
  font-weight: 800;
}

.site-footer__text {
  max-width: 420px;
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.site-footer__perks {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}
</style>
