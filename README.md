# ChampaShop - Vitrine en ligne

Boutique fictive développée en équipe avec Nuxt 3, Vue 3 et TypeScript.

## Répartition des rôles

* **Ethan** : [F1 - Catalogue, F2 - Fiche produit...]
* **Roman** : F3 - Panier, F4 - Moteur de promotions
* **[Prénom Coéquipier 2]** : [F5 - Authentification...]

## Choix Techniques & Justifications

### F1 (Catalogue) - Stratégie de filtrage, recherche et pagination
L'API DummyJSON ne propose ni filtre par prix, ni combinaison recherche + catégorie. Le catalogue charge donc en **une seule requête** tous les produits de la catégorie sélectionnée (`limit=0`), en ne demandant que les champs utiles à l'affichage et à la recherche (`select=title,description,category,price,…`), ce qui réduit fortement le poids de la réponse (les avis, dimensions, QR codes… ne sont pas transférés).
La recherche plein texte, le filtre de prix, le tri et la pagination (12 par page) sont ensuite faits en mémoire par des **fonctions pures** (`app/utils/catalog.ts`, testées dans `tests/unit/catalog.spec.ts`).

* **Appels réseau** : 1 requête par catégorie (plus 1 pour la liste des catégories). Taper une recherche, changer le prix, le tri ou la page ne déclenche **aucune** requête.
* **Performance** : environ 200 produits au maximum, filtrés en quelques millisecondes. Le coût est une réponse initiale plus lourde qu'une page de 12 produits, compensé par le `select`.
* **Pagination** : calculée après filtrage, donc jamais de « fausse » page vide ; une page hors limites est ramenée à la dernière page.
* **Recherche** : debounce de 300 ms (composable `useDebouncedCallback`). Comme la recherche ne fait pas de requête, aucune ancienne réponse ne peut écraser une plus récente. Seul le changement de catégorie fait une requête, et `useFetch` annule la requête précédente si une nouvelle part.
* **URL source de vérité** : `q`, `category`, `sortBy`, `order`, `minPrice`, `maxPrice` et `page` sont dans l'URL ; la page est rendue côté serveur, et la pagination utilise de vrais liens (fonctionne sans JavaScript).

### F2 (Fiche produit)
`/produits/[id]` affiche une galerie (`ProductGallery`, miniatures utilisables au clavier), la description, la marque, la note, le stock, la garantie, la livraison et les avis. Le message de stock (« Plus que X en stock » sous 5, « Rupture de stock » à 0) vient de la fonction pure `getStockStatus` (`app/utils/stock.ts`, testée). Le bouton d'ajout est le composant partagé `AddToCartButton`, désactivé à 0.
SEO : `useSeoMeta` (titre, description, Open Graph avec image). Un identifiant inexistant ou non numérique renvoie une **vraie 404** via `createError` ; une panne de l'API renvoie une 503, pas une fausse 404. La page `app/error.vue` affiche ces erreurs.

### F4 (Moteur de promotions)
`app/utils/promotions.ts` expose `computeCart(lines, promoCode?)`, une **fonction pure** (sans Vue ni Pinia) appelée par le store du panier. Tous les montants sont en **centimes entiers** ; l'arrondi commercial (demi vers le haut) est fait en arithmétique entière (`app/utils/money.ts`) pour éviter les erreurs de flottants.
Chaque règle (remise beauté, code TROYES10, plafond de 25 %, livraison) est une petite fonction exportée et testée séparément ; `computeCart` ne fait que les enchaîner dans l'ordre du sujet.
Les 8 scénarios d'acceptation sont dans `tests/unit/promotions.spec.ts`. Un seuil de couverture de 90 % (lignes et branches) sur ce fichier est imposé dans `vitest.config.ts` : la CI échoue en dessous.
> DummyJSON ne gère pas les promotions : ce calcul est fait côté front pour l'exercice. En production il devrait être refait côté serveur.

### F3 (Panier) - Persistance par cookie
Le panier est un store Pinia (`app/stores/cart.ts`) persisté avec `useCookie` : le cookie est lu côté serveur, donc le panier (et le compteur du header) est présent dès le rendu SSR.
**Stratégie pour la limite de 4 Ko :** le cookie `champashop_cart` ne contient que le strict nécessaire, l'identifiant et la quantité de chaque produit, dans un format compact `id-quantité` séparé par `_` (ex. `12-3_45-1`, environ 8 octets par ligne). Le panier est limité à 50 produits différents, soit moins de 500 octets. Le code promo est dans un second cookie, `champashop_promo`.
Le titre, le prix, la catégorie, le stock et l'image ne sont **pas** stockés : sur `/panier`, ils sont rechargés côté serveur depuis DummyJSON (`/products/{id}?select=...`, uniquement pour les produits inconnus du store). Avantages : cookie minuscule, prix et stock toujours à jour (un prix modifié dans le cookie n'a aucun effet), et le stock est revérifié à chaque chargement (la quantité est ramenée au stock, avec un message, s'il a baissé).
La logique (ajout, quantité, stock, lecture/écriture du cookie) est faite par des fonctions pures dans `app/utils/cart.ts`, testées dans `tests/unit/cart.spec.ts`. Le store ne fait que les appeler et persister le résultat.
Le composant `AddToCartButton` est réutilisable : il est branché sur les cartes du catalogue et peut être inséré dans la fiche produit (F2) avec `<AddToCartButton :product="product" />`. Il gère déjà l'état « Rupture de stock » (bouton désactivé).

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