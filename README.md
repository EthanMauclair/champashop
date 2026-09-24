# ChampaShop - Vitrine en ligne

Boutique fictive développée en équipe avec Nuxt 3, Vue 3 et TypeScript.

## Répartition des rôles

* **Ethan** : [F1 - Catalogue, F2 - Fiche produit...]
* **[Prénom Coéquipier 1]** : [F3 - Panier, F4 - Moteur de promotions...]
* **[Prénom Coéquipier 2]** : [F5 - Authentification...]

## Choix Techniques & Justifications

### F1 (Catalogue) - Stratégie de filtrage par prix
L'API externe utilisée (DummyJSON) ne supportant pas le filtrage par prix natif, j'ai opté pour une approche hybride (Client/Serveur). Au lieu de paginer via l'API, l'application récupère l'ensemble des produits de la catégorie sélectionnée (en utilisant `limit=0`). Le filtrage de prix, le tri complexe et la pagination sont ensuite appliqués directement en mémoire (côté Nuxt). 
**Justification :** Bien que cela augmente légèrement la charge de la requête réseau initiale, c'est la seule méthode garantissant une expérience utilisateur (UX) robuste et cohérente. Cela permet aux filtres croisés et à la pagination de fonctionner parfaitement en tandem, évitant ainsi de générer des pages intermédiaires faussement vides.

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