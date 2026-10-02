# Changelog

Toutes les évolutions notables de ChampaShop sont listées ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon [SemVer](https://semver.org/lang/fr/).

## [0.1.0] - 2026-10-02

Première version : socle du projet et fonctionnalités de la semaine 1.

### Ajouté
- **Socle** : projet Nuxt + TypeScript strict, Pinia, ESLint, Vitest, CI GitHub Actions (lint, typecheck, tests, build) sur chaque PR, template de PR, déploiement Vercel depuis `main` (#6).
- **F1 — Catalogue `/produits`** : 12 produits par page, recherche plein texte (debounce 300 ms), filtres catégorie et prix, tri, URL source de vérité rendue côté serveur, états chargement / vide / erreur (#6, #11).
- **F2 — Fiche produit `/produits/[id]`** : galerie, stock (« Plus que X en stock », « Rupture de stock »), avis, SEO avec Open Graph, vraie 404 (#7, #12).
- **F3 — Panier** : store Pinia persisté par cookie compact lu côté serveur, contrôle du stock, page `/panier` avec code promo et détail des remises (#8).
- **F4 — Moteur de promotions** `utils/promotions.ts` : remise beauté, code TROYES10, plafond 25 %, livraison ; 8 scénarios d'acceptation testés, seuil de couverture 90 % (#9).
- **F5 — Authentification DummyJSON** : `/connexion`, jetons en cookies, utilisateur chargé côté serveur, middleware `auth` sur `/compte`, rafraîchissement du jeton en single-flight, déconnexion (#15).
- **Design et accessibilité** : refonte « moderne minimal » en CSS pur, page d'accueil, en-tête et pied de page, `lang="fr"`, focus visible, `sitemap.xml` et `robots.txt` (#14).
- Fichiers de suivi IA `docs/ai-usage/` (#10).

### Modifié
- Logique du catalogue, du stock, du panier et de l'authentification déplacée en fonctions pures dans `utils/`, avec tests unitaires (#11, #12).
- Release : règle ESLint `no-explicit-any` explicite, configuration Prettier et scripts `format`, version 0.1.0, README complété.

### Corrigé
- CI : étape `nuxt prepare` avant ESLint, Node 22, transmission de `--run` à Vitest (#7, #11).
- Typage du retour de `$fetch` dans `authFetch` (#15).

### Remarques
- La PR #13 a été mergée par erreur dans `main` au lieu de `develop` ; elle a été refaite vers `develop` (#14). Cette release réaligne `main` sur `develop`.

[0.1.0]: https://github.com/EthanMauclair/champashop/releases/tag/v0.1.0
