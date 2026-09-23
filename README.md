# ChampaShop - Vitrine en ligne

Boutique fictive développée en équipe avec Nuxt 3, Vue 3 et TypeScript.

## Répartition des rôles

* **[Votre Prénom]** : [F1 - Catalogue, F2 - Fiche produit...]
* **[Prénom Coéquipier 1]** : [F3 - Panier, F4 - Moteur de promotions...]
* **[Prénom Coéquipier 2]** : [F5 - Authentification...]

## Installation

1. Cloner le dépôt.
2. Installer les dépendances en tapant `npm install` dans le terminal.

## Scripts utiles

* `npm run dev` : Lancer le serveur de développement local.
* `npm run lint` : Vérifier le code avec ESLint.
* `npm run typecheck` : Vérifier strictement les types TypeScript.
* `npm run test` : Lancer les tests unitaires avec Vitest.
* `npm run test:coverage` : Générer le rapport de couverture des tests.
* `npm run build` : Compiler l'application pour la production.

## Conventions Git (GitFlow)

Nous suivons un modèle GitFlow strict :

* **main** : Branche de production protégée.
* **develop** : Branche d'intégration protégée. Merge autorisé uniquement via Pull Request approuvée.
* **Branches de fonctionnalités** : `feature/<id>-<description>` créées depuis `develop`.
* **Commits** : Format Conventional Commits imposé (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`).

## Déploiement

https://champashop.vercel.app/
