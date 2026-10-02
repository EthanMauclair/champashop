# ChampaShop - Vitrine en ligne

Boutique fictive développée en équipe avec Nuxt, Vue 3, TypeScript (strict), Pinia et Vitest.

**Version actuelle : v0.1.0** (fin de semaine 1, voir [CHANGELOG.md](CHANGELOG.md)) · Site : https://champashop.vercel.app/

## Répartition des rôles

* **Ethan** : initialisation du projet (dépôt, CI, déploiement Vercel, template de PR), F1 - Catalogue, F2 - Fiche produit
* **Roman** : F3 - Panier, F4 - Moteur de promotions, F5 - Authentification, mise en conformité F1/F2, refonte design et page d'accueil

> **Note sur la version de Nuxt** : le sujet impose Nuxt 3. Le projet a été initialisé avec `npx nuxi@latest init`, qui installe aujourd'hui **Nuxt 4** (code dans le dossier `app/`, API `useFetch`, `useCookie`, `definePageMeta`… identiques à Nuxt 3). Cet écart est connu de l'équipe.

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

### F5 (Authentification DummyJSON)
* **Endpoints** (vérifiés sur dummyjson.com/docs/auth) : `POST /auth/login` (`username`, `password`, `expiresInMins`), `GET /auth/me` (`Authorization: Bearer`), `POST /auth/refresh` (`refreshToken`, `expiresInMins`).
* **Jetons en cookies** (`champashop_access`, `champashop_refresh`) via `useCookie` : ils sont lisibles côté serveur, donc le plugin `app/plugins/auth.server.ts` charge l'utilisateur (`GET /auth/me`) pendant le rendu SSR et l'état Pinia arrive déjà rempli dans le navigateur : pas de « flash » de l'état déconnecté.
* **Middleware `auth`** (`app/middleware/auth.ts`) sur `/compte` : redirection vers `/connexion?redirect=/compte`, puis retour à la page demandée après connexion. Le paramètre `redirect` est validé (`sanitizeRedirect`) pour éviter une redirection vers un site externe.
* **Rafraîchissement single-flight** : toutes les requêtes authentifiées passent par `authFetch` (store `app/stores/auth.ts`). En cas de 401, le jeton est rafraîchi par `createSingleFlight` : si plusieurs requêtes reçoivent une 401 en même temps, un seul `POST /auth/refresh` part, puis toutes les requêtes sont rejouées (`createAuthRequest`, `app/utils/auth.ts`, testé dans `tests/unit/auth.spec.ts`). Le store étant créé par requête côté serveur, le single-flight n'est jamais partagé entre deux visiteurs.
* **Tester avec `expiresInMins: 1`** : sur `/connexion`, cocher « Session de test (1 minute) », attendre une minute, puis sur `/compte` cliquer « Lancer 3 requêtes simultanées » : le panneau affiche le nombre d'appels à `/auth/refresh` (1 attendu).
* **Déconnexion** : suppression des cookies et de l'état, retour à l'accueil.
* **Limite assumée** : les cookies ne sont pas `httpOnly`, car le navigateur doit lire le jeton pour l'en-tête `Authorization`. En production, on passerait par un proxy serveur (BFF) avec des cookies `httpOnly`, inaccessibles à un script injecté (XSS).

### Design, accessibilité et référencement
* **Design « moderne minimal » en CSS pur**, sans dépendance supplémentaire : `app/assets/css/main.css` définit les variables (couleurs, espacements, rayons), la base typographique (police Inter), les boutons (`.btn`), les champs (`.input`, `.select`) et les états (`.state`, `.notice`). Les composants n'utilisent que ces variables.
* **Accessibilité** : `lang="fr"`, lien d'évitement, focus visible partout, champs tous associés à un label, contrastes AA, annonces `aria-live` (résultats, ajout au panier), galerie et quantités utilisables au clavier.
* **Référencement** : rendu serveur, `useSeoMeta` sur chaque page (titre, description, Open Graph), page d'accueil, pagination en vrais liens, `robots.txt` et plan du site généré à la demande (`/sitemap.xml`, `server/routes/sitemap.xml.ts`) à partir de `NUXT_PUBLIC_SITE_URL`.

## Installation

1. Cloner le dépôt.
2. Installer les dépendances en tapant `npm install` dans le terminal.

## Scripts utiles

* `npm run dev` : Lancer le serveur de développement local.
* `npm run lint` : Vérifier le code avec ESLint (règle `@typescript-eslint/no-explicit-any` en erreur).
* `npm run format` / `npm run format:check` : Formater / vérifier le formatage avec Prettier (`.prettierrc.json`).
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
* **Pull Requests** : une issue = une branche = une PR vers `develop`, template rempli, `Closes #<n°>`, CI verte et une review approuvée d'un coéquipier ; merge en « Create a merge commit », branche supprimée après merge.
* **Releases** : `release/vX.Y.Z` créée depuis `develop` (seulement corrections, version, CHANGELOG), mergée dans `main` et `develop`, tag annoté `vX.Y.Z` sur `main` et GitHub Release.
* **Hotfix** : `hotfix/<desc>` depuis `main`, mergée dans `main` et `develop`, version patch (ex. `v0.1.1`).

## Déploiement

https://champashop.vercel.app/