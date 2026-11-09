# 📋 GUIDE DE MISSION FRONTEND — DJENNA

> **Rôle :** Responsable du Socle Technique, Authentification, Layouts, Produits, Stock, Inventaire & Paramètres  
> **Propriétaire de dossier :** `src/core/` *(api, store, hooks, router)* et `src/apps/boutique/features/{products, stock, dashboard, inventory, users, settings}` & `src/apps/platform/features/{flags, settings, logs}`  
> **Date de début :** Novembre 2026 | **Lead / Revue de PR :** Ethan

---

## 🛑 1. RÈGLES D'OR & CADRE DE COLLABORATION

1. **Maquette Figma obligatoire :** Tout écran développé doit correspondre **au pixel près** à la maquette Figma.
2. **Backend intouchable :** **Interdiction formelle de modifier le backend** sans en faire la demande explicite sur l'application TaskSprint et obtenir l'accord d'Ethan. L'API est documentée sur `http://localhost:4000/api-docs`.
3. **Périmètre de code :** Tu travailles principalement dans tes dossiers assignés.
   - Si tu as besoin d'un composant UI partagé, demande à **Mechack** (`src/components/ui/`).
   - Tu es la **gardienne de `src/core/`**. Si un collègue doit y toucher, il doit passer par toi.
4. **Git Workflow :**
   - Branche de travail commune : `develop`. Ne **jamais** pousser sur `main`.
   - Chaque matin avant de coder : `git pull --rebase origin develop`.
   - **Une tâche = Une branche = Une PR** relue et validée par Ethan avant 18h.
   - Format de branche : `feature/<espace>-<module>-<action>` (ex : `feature/core-api-client`, `feature/boutique-products-list`).
   - Format de commit conventionnel : `feat(core): ...`, `feat(products): ...`, `fix(auth): ...`.
5. **Règles techniques de développement :**
   - **ZÉRO `axios` hors de `@/core/api`** : tous les appels passent par `@/core/api/client.js`.
   - **ZÉRO jeton dans `localStorage` ou `sessionStorage`** : le JWT d'accès reste **en mémoire uniquement** (Zustand). Le rafraîchissement se fait par cookie HttpOnly via `/api/v1/auth/refresh`.
   - **3 états obligatoires par écran :** Chargement (`skeleton`), Vide (`EmptyState`), Erreur (`ErrorState` avec `parseApiError`).
   - **Montants & Dates :** Toujours utiliser `formatMoney(montant)` (ex: `15 000 FCFA`) et `formatDate(date)` (français) créés par Mechack.
   - **Recherche :** Toujours avec un `debounce` de 300 ms (`useDebounce`).
   - **Listes :** Toujours paginées côté serveur (page, limit).

---

## 🛠️ 2. INSTALLATION & CONFIGURATION LOCALE

### Lancer l'environnement
1. **Backend (API) :**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   *L'API tourne sur `http://localhost:4000`. Vérifie la documentation interactive sur `http://localhost:4000/api-docs`.*
2. **Frontend (Vite) :**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *L'application tourne sur `http://localhost:5173`. Le proxy Vite redirige automatiquement `/api` et `/socket.io` vers le port 4000.*

---

## 📁 3. SQUELETTE TYPE D'UN MODULE (`features/<module>/`)
Chaque sous-module de tes fonctionnalités doit comporter cette arborescence stricte :
```text
features/<module>/
├── api.js         # Fonctions asynchrones appelant client.js (ex: getProducts, createProduct)
├── hooks.js       # Hooks React Query (useQuery, useMutation avec invalidation de cache)
├── schemas.js     # Schémas de validation Zod (alignés avec le backend)
├── components/    # Composants internes spécifiques à la fonctionnalité (modales, cartes)
├── pages/         # Composants pages affichés par le routeur
└── routes.jsx     # Export par défaut: [ { path, element, permission } ]
```

---

## 📅 4. PLANNING DÉTAILLÉ SEMAINE PAR SEMAINE

### ══ SEMAINE 1 : Socle technique & Authentification ══
**Objectif :** Poser les fondations indispensables pour que toute l'équipe puisse naviguer et consommer l'API de façon sécurisée.  
**Preuve de fin :** Connexion avec le Super-Admin (`admin@stockline.cg` / `ChangeMoi2026!`) affichant la sidebar violette ; connexion caissier affichant la sidebar sombre filtrée par permissions.

---

#### 🔹 TÂCHE DJ-01 — Client API Axios & Normalisation des erreurs
- **Branche :** `feature/core-api-client`
- **Priorité :** Haute | **Échéance :** 03/11/2026 (4h)
- **Fichiers à créer :**
  - `src/core/api/client.js`
  - `src/core/api/errors.js`
- **Backend lié :** `backend/dry/dry-app/boutique/features/auth/controllers/auth-refresh.controller.js` (`POST /api/v1/auth/refresh`).
- **Ce que tu dois faire :**
  1. Configurer l'instance Axios : `baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api/v1' : '/api/v1'`, `withCredentials: true`.
  2. Intercepteur de requête : injecte automatiquement le header `Authorization: Bearer <accessToken>` depuis `authStore.getState().accessToken`.
  3. Intercepteur de réponse :
     - Si l'erreur est un 401 avec code `TOKEN_EXPIRED`, gérer une file d'attente pour **un seul** appel en vol à `POST /auth/refresh`.
     - Si le refresh réussit, rejouer les requêtes en attente.
     - Si le refresh échoue, déconnecter l'utilisateur (`authStore.getState().logout()`) et rediriger vers `/login`.
  4. Dans `errors.js`, coder `parseApiError(err)` pour retourner `{ message, code, details[] }`. Prendre en compte les codes serveur : `QUOTA_EXCEEDED`, `INSUFFICIENT_STOCK`, `PASSWORD_CHANGE_REQUIRED`, `SHOP_FROZEN`, `SHOP_BANNED`, `SHOP_SUSPENDED`.
- **Démarche anti-conflit :** Ce fichier est la racine de tous les appels API. Termine et fais merger cette PR avant que Mechack et Jhonny ne commencent leurs appels API.
- **Preuve / Test :** Modifier artificiellement le token en mémoire pour le périmer, faire un `GET /auth/me` : la requête doit réussir de manière transparente après un appel unique à `/auth/refresh` visible dans l'onglet Network.

---

#### 🔹 TÂCHE DJ-02 — Store de Session Zustand, React Query & Socket.io
- **Branche :** `feature/core-session-store` (départ depuis `develop` mis à jour après merge de DJ-01)
- **Priorité :** Haute | **Échéance :** 04/11/2026 (4h)
- **Fichiers à créer :**
  - `src/core/store/authStore.js`
  - `src/core/queryClient.js`
  - `src/core/socket.js`
  - `src/core/hooks/useAuth.js`
  - `src/core/hooks/usePermission.js`
- **Backend lié :** `backend/dry/core/services/realtime.service.js`, `backend/dry/dry-app/boutique/features/auth/routes/auth.route.js`.
- **Ce que tu dois faire :**
  1. `authStore.js` : stocker `{ accessToken, user, shop, permissions, isAuthenticated }`. Actions : `setAuth`, `logout`, `initSession`.
  2. `initSession()` : appelé au démarrage de l'app. Appelle `POST /auth/refresh` puis `GET /auth/me` pour restaurer la session sans persister le token dans le stockage local du navigateur.
  3. `queryClient.js` : `staleTime: 30000`, `retry: 1`, aucun retry si le statut HTTP est `4xx`.
  4. `socket.js` : wrapper de `socket.io-client`. Se connecte en passant `{ auth: { token } }`. S'active dès que l'utilisateur est connecté, se déconnecte au logout.
  5. `usePermission(perm)` : retourne `true` si le rôle est `admin` ou si `permissions` contient la permission demandée.
- **Preuve / Test :** Connecte-toi, actualise avec F5 : la session persiste. Clique sur Déconnexion : le store est purgé et le cache React Query vidé.

---

#### 🔹 TÂCHE DJ-03 — Router avec collecte automatique & Gardes d'accès
- **Branche :** `feature/core-router-guards`
- **Priorité :** Haute | **Échéance :** 04/11/2026 (5h)
- **Fichiers à créer :**
  - `src/router.jsx`
  - `src/components/layout/ProtectedRoute.jsx`
  - `src/components/layout/PermissionRoute.jsx`
  - `src/components/layout/PlatformRoute.jsx`
  - `src/components/feedback/ComingSoon.jsx`
  - `src/components/feedback/NotFound.jsx`
- **Ce que tu dois faire :**
  1. Utiliser `import.meta.glob('./apps/**/features/**/routes.jsx', { eager: true })` pour charger automatiquement les routes sans que personne n'ait à modifier manuellement `router.jsx`.
  2. Créer les composants gardiens :
     - `ProtectedRoute` : vérifie la session active. Si non connecté, redirection vers `/login` avec conservation de l'URL demandée (`from`).
     - `PermissionRoute` : vérifie `usePermission(permission)`. Si refusé, affiche une page "Accès Refusé / Droits insuffisants".
     - `PlatformRoute` : réservé au rôle `super_admin`.
     - Garde de statut : Si le backend renvoie `SHOP_FROZEN`, `SHOP_BANNED` ou `SHOP_SUSPENDED`, afficher un écran bloquant d'information avec bouton d'aide support.
- **Preuve / Test :** Naviguer sur `/products` sans être connecté renvoie sur `/login`. Se connecter avec un compte caissier et tenter d'accéder à `/treasury` affiche un accès refusé.

---

#### 🔹 TÂCHE DJ-04 — Pages d'Authentification
- **Branche :** `feature/public-auth-pages`
- **Priorité :** Haute | **Échéance :** 05/11/2026 (7h)
- **Fichiers à créer :**
  - `src/apps/public/pages/LoginPage.jsx`
  - `src/apps/public/pages/ForgotPasswordPage.jsx`
  - `src/apps/public/pages/ResetPasswordPage.jsx`
  - `src/apps/public/components/ForcePasswordChangeModal.jsx`
- **Backend lié :** `POST /api/v1/auth/login`, `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`, `POST /api/v1/auth/change-password`.
- **Ce que tu dois faire :**
  1. Écran de connexion : saisie email ou téléphone, masquage/démasquage mot de passe, gestion des erreurs (401 identifiants invalides, 429 compte temporairement verrouillé avec temps restant).
  2. Gestion du `doitChangerMotDePasse` : modale bloquante demandant l'ancien mot de passe, le nouveau et confirmation avec jauge de complexité.
  3. Redirection intelligente après login : `super_admin` vers `/platform/overview`, commerçant vers `/dashboard`.
- **Preuve / Test :** Parcours complet avec `admin@stockline.cg` / `ChangeMoi2026!`.

---

#### 🔹 TÂCHE DJ-05 — Layouts Boutique & Plateforme avec sidebars dynamiques
- **Branche :** `feature/core-layouts`
- **Priorité :** Haute | **Échéance :** 06/11/2026 (7h)
- **Fichiers à créer :**
  - `src/apps/boutique/layout/BoutiqueLayout.jsx`
  - `src/apps/platform/layout/PlatformLayout.jsx`
  - `src/core/offline/SyncBadge.jsx` *(stub initial pour Ethan)*
  - `src/apps/shared/features/notifications/NotificationBell.jsx` *(stub initial pour Jhonny)*
- **Ce que tu dois faire :**
  1. `BoutiqueLayout` : Sidebar couleur sombre `#0f172a`, logo, sélecteur de boutique, les 14 liens de navigation filtrés selon les permissions de l'utilisateur connecté. TopBar avec titre de page, `<SyncBadge />`, `<NotificationBell />`, avatar et déconnexion. Menu responsive (drawer) sous 768px.
  2. `PlatformLayout` : Sidebar violette (`platform-950`), navigation de la console Super-Admin, pastille "Plateforme opérationnelle".
  3. Créer les stubs neutres pour `SyncBadge` ("Synchronisé") et `NotificationBell` (icône cloche simple).
- **Preuve / Test :** Vérifier que la sidebar affiche la couleur violette pour l'admin plateforme et la couleur sombre pour la boutique, avec repli responsive sur mobile.

---

### ══ SEMAINE 2 : Catalogue Produits (Liste, Formulaire, Import/Export) ══
**Objectif :** Gestion complète du catalogue produit de la boutique.  
**Preuve de fin :** Création d'un produit, recherche instantanée, modification, export CSV et import de fichier avec rapport.

- **DJ-06 Produits : Liste, recherche & filtres** (`feature/boutique-products-list` - Échéance 10/11)  
  *Backend :* `GET /api/v1/products` (paramètres : `page`, `q`, `categorieId`, `statutStock`). Afficher tableau, indicateurs de stock, calcul de marge en couleur (vert si ≥ 30%, orange sinon), désactivation d'un produit.
- **DJ-07 Modale Ajouter/Modifier un produit** (`feature/boutique-products-form` - Échéance 11/11)  
  *Backend :* `POST /api/v1/products`, `PATCH /api/v1/products/:id`. Validation Zod (`prixVente >= prixAchat`). Gestion des quotas de plan (`403 QUOTA_EXCEEDED`).
- **DJ-08 Import CSV & Export du catalogue** (`feature/boutique-products-import-export` - Échéance 13/11)  
  *Backend :* `GET /api/v1/products/export`, `POST /api/v1/products/import`. Utiliser `papaparse`. Rapport d'import détaillé (lignes créées, ignorées, en erreur).

---

### ══ SEMAINE 3 : Stock, Dashboard & Inventaire Physique ══
**Objectif :** Suivi des flux réels et comptage physique en boutique.
- **DJ-09 Stock & Mouvements** (`feature/boutique-stock` - Échéance 17/11) : `GET /stock/alerts`, `GET /stock/movements`, modale entrée/sortie/ajustement avec erreur `INSUFFICIENT_STOCK`.
- **DJ-10 Tableau de bord commerçant** (`feature/boutique-dashboard` - Échéance 18/11) : `GET /reports/dashboard`. 4 KPI, graphique Recharts des ventes/bénéfices sur 7 jours, écoute de l'événement socket `sale:created`.
- **DJ-11 Comptage d'inventaire** (`feature/boutique-inventory-count` - Échéance 20/11) : `GET /inventories`, `POST /inventories`, saisie de comptage au clavier `PATCH /inventories/:id/count` avec sauvegarde et reprise après F5.

---

### ══ SEMAINE 4 : Clôture Inventaire, Employés & Paramètres ══
- **DJ-12 Clôture d'inventaire** (`feature/boutique-inventory-close` - Échéance 23/11) : `POST /inventories/:id/close` avec confirmation et rapport d'ajustements.
- **DJ-13 Gestion des employés** (`feature/boutique-users-list` - Échéance 25/11) : `GET /users`, invitation `POST /users` affichant le mot de passe temporaire unique, gel et rôles.
- **DJ-14 Rôles sur mesure & Paramètres boutique** (`feature/boutique-settings-roles` - Échéance 27/11) : `GET /roles`, configuration de la grille des 14 permissions.

---

### ══ SEMAINE 5 : Tickets & Console Plateforme ══
- **DJ-15 Tickets Support** (`feature/shared-tickets` - Échéance 01/12) : `GET /tickets`, fil de discussion partagé boutique / plateforme.
- **DJ-16 Feature Flags & Paramètres Plateforme** (`feature/platform-flags-settings` - Échéance 03/12).
- **DJ-17 Journaux & Sécurité** (`feature/platform-logs` - Échéance 04/12) : `GET /platform/logs`, alertes sécurité.

---

### ══ SEMAINE 6 : Recette & Finitions ══
- **DJ-18 Finitions & Traitement des retours** (`fix/djenna-recette` - Échéance 09/12) : Vérification des états vide/chargement/erreur, accessibilité, tests mobiles à 768px.
