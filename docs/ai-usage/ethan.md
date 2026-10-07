# Journal d'utilisation de l'IA - Ethan Mauclair

## Projet : ChampaShop (Nuxt 3)

### Fonctionnalité F1 : Catalogue Produits
**Objectif :** Créer la page d'accueil de la boutique listant tous les produits via l'API DummyJSON, avec des cartes produits réutilisables.

* **Aide demandée à l'IA :** Compréhension du système de pages de Nuxt 3, typage des données de l'API avec TypeScript, création d'un composant Vue propre, et génération d'un design CSS classique suite à l'absence de Tailwind.
* **Solutions apportées :**
  * Création de la page principale (initialement `produits.vue`, puis restructurée en `produits/index.vue`).
  * Création du composant `ProductCard.vue` avec utilisation de `defineProps` pour passer les données du parent à l'enfant.
  * Définition d'interfaces TypeScript strictes pour typer la réponse de `useFetch` et éviter les erreurs de compilation (ex: `Property does not exist on type '{}'`).
  * Découverte et première gestion du flux Git/GitHub (création de branche `feature/`, Pull Request, et analyse des premiers échecs de la CI).

### Fonctionnalité F2 : Fiche Produit Dynamique
**Objectif :** Créer une page produit détaillée (`/produits/[id]`) récupérant les données depuis DummyJSON, avec gestion des stocks, du SEO et des erreurs 404.

* **Aide demandée à l'IA :** Génération du template CSS responsive (suite à l'absence de Tailwind), intégration des données complexes (marque, garantie, livraison) et logique conditionnelle sur le bouton d'ajout au panier selon le stock.
* **Solutions apportées :**
  * Utilisation de `useFetch` pour l'appel API dynamique basé sur `route.params.id`.
  * Mise en place de `throw createError` pour gérer proprement les faux ID et renvoyer une erreur 404.
  * Ajout de `useSeoMeta` pour rendre le titre de l'onglet du navigateur dynamique (SEO).
  * Modification du composant `ProductCard.vue` (F1) pour utiliser `<NuxtLink>` et rendre les cartes cliquables vers la F2.

### Débogage : Intégration Continue (GitHub Actions)
**Objectif :** Faire passer le workflow `build-and-test` au vert sur GitHub.

* **Problème 1 (ESLint) :** La CI échouait car ESLint ne trouvait pas la configuration Nuxt ou faisait face à une erreur `Object.groupBy is not a function`.
* **Aide de l'IA :** 
  * Analyse des logs GitHub Action.
  * Ajout de la commande `npx nuxt prepare` dans `ci.yml` pour générer le dossier `.nuxt/` requis par l'environnement de test avant le lint.
  * Mise à jour de la version de Node.js (`actions/setup-node@v4`) vers la version **22** pour supporter les fonctions JavaScript modernes requises par la configuration ESLint "Flat Config".
* **Problème 2 (Vitest) :** La CI échouait avec `No test files found, exiting with code 1`.
* **Aide de l'IA :** Restructuration du dossier de tests pour correspondre à la configuration stricte du projet. Déplacement du fichier de test basique `app.test.ts` vers le chemin attendu : `test/unit/app.test.ts`.

## Semaine 2

| Date | Outil | Ce que j'ai demandé | Ce que j'ai gardé / modifié / rejeté, et pourquoi |
| :--- | :--- | :--- | :--- |
| 07/10 | Claude Code | Implémenter F6a (#26) : `parseCompareIds`, `toggleCompare` et leurs tests, store `compare`, bouton « Comparer » et barre de comparaison | Gardé la même architecture que F7 (fonctions pures testées / store + cookie / composants) et la réutilisation de `isValidProductId`. Choix vérifié : `rejected` ne vaut `true` que si le comparateur est plein (un identifiant invalide ne doit pas afficher « Comparateur plein »). Gardé un libellé fixe « Comparer » avec `aria-pressed` plutôt qu'un texte qui change, et la barre en `sticky` plutôt qu'en `fixed` pour ne jamais masquer le pied de page. Vérifié dans le navigateur : 4ᵉ produit refusé avec message, cookie corrompu (`abc,5,5,,7,8,9,10`) réécrit en `5,7,8`, barre présente dans le HTML serveur. |
| 07/10 | Claude Code | Implémenter F6b (#27) : page `/comparer?ids=`, normalisation de l'URL, tableau comparatif accessible, « Copier le lien » | Gardé la logique du tableau en fonctions pures testées (`buildCompareRows`, `findBestIndexes`, `splitCompareResults`, `isCanonicalCompareQuery`) et le découpage page / `CompareTable` / `CopyLinkButton`. Choix discutés : image et titre en en-têtes de colonnes (`th scope="col"`) plutôt qu'en lignes répétées ; note comparée arrondie comme affichée (sinon « Meilleure note » sur deux « 4,9 » différents) ; pas de mise en évidence quand toutes les valeurs sont égales. Corrigé après test sur mobile : la barre faisait 157 px de haut, ramenée à ~100 px. Vérifié : 10 URL invalides redirigées sans 500, tableau et bouton « Remplacer » dans le HTML serveur, colonne figée au défilement. À vérifier par moi : copie réelle dans Chrome (le navigateur de test refusait le presse-papiers, seul le repli a été testé) et Lighthouse accessibilité. |
