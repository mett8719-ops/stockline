# 📋 GUIDE DE MISSION FRONTEND — JHONNY

> **Rôle :** Responsable du Site Public, Inscription (Wizard 4 étapes), Onboarding, Clients, Fournisseurs, Notifications & Messagerie  
> **Propriétaire de dossier :** `src/apps/public/` *(landing, signup, legal)*, `src/apps/boutique/features/{onboarding, customers, suppliers, suggestions}`, `src/apps/shared/features/{notifications, messaging}`  
> **Date de début :** Novembre 2026 | **Lead / Revue de PR :** Ethan

---

## 🛑 1. RÈGLES D'OR & CADRE DE COLLABORATION

1. **Maquette Figma obligatoire :** Tout écran développé (notamment la Landing page et le Wizard d'inscription) doit reproduire **fidèlement au pixel près** la maquette Figma.
2. **Backend intouchable :** **Interdiction formelle de modifier le backend** sans en faire la demande explicite sur l'application TaskSprint et obtenir l'accord d'Ethan. L'API est documentée sur `http://localhost:4000/api-docs`.
3. **Périmètre de code :**
   - Tu travailles principalement dans tes dossiers assignés.
   - Ne crée pas tes propres boutons ou modales bruts : utilise le UI Kit partagé créé par **Mechack** (`src/components/ui/Button`, `Input`, `Modal`...).
   - Tu n'utilises aucun `axios` en direct : utilise le client API configuré par **Djenna** (`@/core/api/client`).
4. **Git Workflow :**
   - Branche de travail commune : `develop`. Ne **jamais** pousser sur `main`.
   - Chaque matin avant de coder : `git pull --rebase origin develop`.
   - **Une tâche = Une branche = Une PR** relue et validée par Ethan avant 18h.
   - Format de branche : `feature/<espace>-<module>-<action>` (ex : `feature/public-landing-hero`, `feature/public-signup-steps-1-2`, `feature/boutique-customers`).
   - Format de commit conventionnel : `feat(landing): ...`, `feat(signup): ...`, `feat(customers): ...`.
5. **Règles d'ergonomie et de sécurité :**
   - **Zéro mot de passe en clair dans le navigateur :** Lors du wizard d'inscription, le mot de passe ne doit **jamais** être stocké dans `localStorage` ni `sessionStorage`.
   - **Chiffres marketing fictifs :** Les chiffres de réassurance de la landing page ("1 200+ boutiques", "4.9/5") doivent être isolés dans un fichier `landing.content.js` avec un flag `FICTIF: true` pour ne pas tromper la production.
   - **Tarifs en direct de l'API :** Les prix des abonnements sur la Landing page doivent être récupérés depuis l'endpoint `GET /api/v1/public/plans` (ne pas les coder en dur dans le HTML).
   - **3 états par écran :** Chargement (`skeleton`), Vide (`EmptyState`), Erreur (`ErrorState`).

---

## 🛠️ 2. INSTALLATION & CONFIGURATION LOCALE

### Lancer l'environnement
1. **Backend (API) :**
   ```bash
   cd backend
   npm run dev
   ```
   *L'API tourne sur `http://localhost:4000` (Doc Swagger interactive : `http://localhost:4000/api-docs`).*
2. **Frontend (Vite) :**
   ```bash
   cd frontend
   npm run dev
   ```
   *Application sur `http://localhost:5173`.*

---

## 📁 3. SQUELETTE D'UNE FEATURE (`features/<module>/`)
Chaque module développé doit respecter cette structure standard :
```text
features/<module>/
├── api.js         # Appels API via @/core/api/client
├── hooks.js       # Hooks React Query (useQuery, useMutation)
├── schemas.js     # Schémas de validation Zod
├── components/    # Composants internes au module
├── pages/         # Pages complètes
└── routes.jsx     # Export default [{ path, element, permission }]
```

---

## 📅 4. PLANNING DÉTAILLÉ SEMAINE PAR SEMAINE

### ══ SEMAINE 1 : Landing Page Publique Complète & Pages Légales ══
**Objectif :** Réaliser la vitrine publique de Stockline pour convertir les commerçants visiteurs et fournir les pages légales indispensables.  
**Preuve de fin :** En ouvrant `http://localhost:5173/`, je vois le header, la présentation héro, les 6 modules, les tarifs chargés depuis l'API, les avis clients et le footer ; les liens CGU et Politique de confidentialité ouvrent de vraies pages.

---

#### 🔹 TÂCHE JH-01 — Landing : En-tête collant & Section Présentation (Héro)
- **Branche :** `feature/public-landing-hero`
- **Priorité :** Haute | **Échéance :** 04/11/2026 (5h)
- **Fichiers à créer :**
  - `src/apps/public/pages/LandingPage.jsx`
  - `src/apps/public/components/LandingHeader.jsx`
  - `src/apps/public/components/LandingHero.jsx`
  - `src/apps/public/landing.content.js`
- **Ce que tu dois faire :**
  1. `LandingHeader` : Barre de navigation collante (sticky) avec logo Stockline, liens d'ancrage fluides (`#fonctionnalites`, `#tarifs`, `#apropos`), bouton "Se connecter" menant vers `/login` et bouton "Créer mon compte" menant vers `/inscription`. Menu hamburger responsive pour mobile (< 768px).
  2. `LandingHero` : Titre percutant "Gérez votre boutique. Vendez plus vite.", sous-titre, bouton CTA principal "Créer mon compte gratuitement", bouton secondaire "Voir la démo", et aperçu stylisé de la caisse.
  3. `landing.content.js` : Définir les textes et les métriques de la maquette avec un drapeau `FICTIF: true`.
- **Preuve / Test :** Teste sur mobile (390px) et sur desktop : navigation fluide et liens fonctionnels.

---

#### 🔹 TÂCHE JH-02 — Landing : Modules, Tarifs API, Témoignages, Footer & Pages Légales
- **Branche :** `feature/public-landing-sections` (après JH-01)
- **Priorité :** Haute | **Échéance :** 06/11/2026 (6h)
- **Fichiers à créer :**
  - `src/apps/public/components/LandingFeatures.jsx`
  - `src/apps/public/components/LandingPricing.jsx`
  - `src/apps/public/components/LandingTestimonials.jsx`
  - `src/apps/public/components/LandingFooter.jsx`
  - `src/apps/public/pages/CguPage.jsx` *(Conditions Générales d'Utilisation)*
  - `src/apps/public/pages/PrivacyPolicyPage.jsx` *(Politique de confidentialité)*
  - `src/apps/public/pages/LegalNoticePage.jsx` *(Mentions légales)*
- **Backend lié :** `GET /api/v1/public/plans` (`backend/dry/dry-app/public/features/plan/controllers/plan-public-list.controller.js`).
- **Ce que tu dois faire :**
  1. `LandingFeatures` : 6 cartes présentant les atouts clés avec icônes Lucide (Produits & Stock, Vente/POS, Clients & Dettes, Fournisseurs, Trésorerie, Rapports).
  2. `LandingPricing` : Bascule Mensuel / Annuel (-15%). Appeler `GET /api/v1/public/plans`. Afficher les plans dynamiquement (Starter, Pro, Enterprise). Plan populaire mis en avant visuellement. Bouton CTA renvoyant vers `/inscription?plan=<id>&cycle=<mensuel|annuel>`.
  3. Formater les prix avec `formatMoney` de Mechack.
  4. `LandingFooter` : Liens légaux (pointant vers `/cgu`, `/confidentialite`, `/mentions-legales`), contact et copyright.
  5. Intégrer les 3 pages légales simples et propres avec texte standard OHADA/Congo.
- **Preuve / Test :** Les tarifs affichés correspondent exactement aux données renvoyées par l'API backend ; le clic sur "CGU" dans le footer ou le formulaire d'inscription ouvre bien la page `/cgu`.

---

### ══ SEMAINE 2 : Inscription Commerçant (Wizard) & Tour Guidé ══
**Objectif :** Parcours d'inscription sans friction et accueil du nouveau commerçant.  
**Preuve de fin :** Soumission d'une demande complète d'inscription avec affichage de l'écran "En attente de validation" ; première connexion d'un admin validé avec visite guidée 4 étapes et checklist de configuration.

- **JH-03 Inscription Wizard : Étape 1 Boutique & Étape 2 Propriétaire** (`feature/public-signup-steps-1-2` - Échéance 10/11)  
  *Page :* `/inscription`. Stepper vertical 4 étapes. Store Zustand dédié pour conserver l'état entre étapes (sans jamais stocker le mot de passe).
  - Étape 1 : Nom de la boutique, type d'activité (6 choix), ville du Congo (Brazzaville, Pointe-Noire, etc.).
  - Étape 2 : Nom du propriétaire, email, téléphone (+242 06 XXX XX XX), mot de passe sécurisé (8 caractères, min/maj/chiffre/spécial) avec jauge de force.
- **JH-04 Inscription Wizard : Étape 3 Plan, Étape 4 Confirmation** (`feature/public-signup-steps-3-4` - Échéance 12/11)  
  *Backend :* `POST /api/v1/public/signup`. Choix du plan, cycle, date de prélèvement. Étape récapitulative modifiable. Case CGU obligatoire (avec lien vers `/cgu`). Gestion des erreurs (409 email déjà utilisé : retour auto à l'étape 2). Écran "Demande envoyée !".
- **JH-05 Première Connexion : Tour Guidé & Checklist** (`feature/boutique-onboarding-tour` - Échéance 13/11)  
  *Dossier :* `src/apps/boutique/features/onboarding`. S'affiche si `!user.aTermineVisiteGuidee`. Tour en modale avec surlignage des menus. `POST /api/v1/auth/complete-tour`. Widget checklist 0/3 sur le tableau de bord.

---

### ══ SEMAINE 3 : Gestion des Clients & Créances ══
**Objectif :** Base clients, plafonds de crédit et suivi des créances.
- **JH-06 Clients : Liste, Recherche & Fiche Client** (`feature/boutique-customers` - Échéance 19/11)  
  *Backend :* `GET /api/v1/customers` (paramètre `impayes=true`, recherche débaouncée `q`), `POST /api/v1/customers`, `GET /api/v1/customers/:id`.
  - Badges : "Solde à jour" ou badge rouge "Impayé : 125 000 FCFA".
  - Fiche détaillée : coordonnées, historique des achats et des versements.
  - Modale création : nom, téléphone (gestion de l'erreur 409 avec nom du client en doublon), catégorie client, plafond de crédit.

---

### ══ SEMAINE 4 : Versements, Fournisseurs & Réceptions ══
**Objectif :** Encaissement des créances clients et approvisionnement fournisseurs.
- **JH-07 Versement Client : Modale de Paiement** (`feature/boutique-customers-payment` - Échéance 23/11) :
  - `PaymentModal.jsx` : composant générique réutilisable pour clients et fournisseurs. Saisie du montant (bloqué au solde maximum dû, bouton "Tout solder"), mode de paiement, `POST /api/v1/customers/:id/payments`.
- **JH-08 Fournisseurs : Annuaire & Fiche Détaillée** (`feature/boutique-suppliers` - Échéance 25/11) :
  - `GET /api/v1/suppliers`, fiche fournisseur avec solde dû, commandes passées et paiements échelonnés.
- **JH-09 Fournisseurs : Réception de Marchandise & Mise à Jour Stock** (`feature/boutique-suppliers-purchase` - Échéance 27/11) :
  - `POST /api/v1/suppliers/:id/purchases`. Saisie dynamique des articles reçus, calcul du total, montant payé comptant et reste en dette. Invalidation des caches produits et stock.

---

### ══ SEMAINE 5 : Notifications Temps Réel & Suggestions ══
**Objectif :** Alertes instantanées et espace d'amélioration continue.
- **JH-10 Centre de Notifications Temps Réel** (`feature/shared-notifications` - Échéance 01/12) :
  - Remplacer le stub `NotificationBell.jsx` créé par Djenna : compteur de non-lus, menu déroulant des dernières alertes.
  - Écran `/notifications` (partagé boutique et plateforme) : onglets par catégorie, "Tout marquer comme lu", écoute de l'événement socket `notification:new`.
- **JH-11 Boîte à Suggestions Collaboratives** (`feature/boutique-suggestions` - Échéance 03/12) :
  - `GET /api/v1/suggestions`, système de vote ▲ avec protection contre le double-vote, filtre par module, affichage de la "Réponse de l'équipe" en encadré vert.

---

### ══ SEMAINE 6 : Messagerie Interne Temps Réel ══
- **JH-12 Messagerie Interne en Direct** (`feature/shared-messaging` - Échéance 10/12) :
  - `GET /api/v1/messaging/conversations`, fil de discussion en direct par Socket.io (`conversation:join`, `message:new`).
  - Discussion directe avec le Support Stockline (réservée à l'administrateur boutique).
  - Côté plateforme : vue support avec bandeau garantissant l'isolation des données commerciales.
