# 📋 GUIDE DE MISSION FRONTEND — MECHACK

> **Rôle :** Gardien du Design System (UI Kit), Trésorerie, Devis & Factures, Caisse (POS) & Performance  
> **Propriétaire de dossier :** `src/components/ui/`, `src/core/utils/` *(cn, formatMoney, formatDate, labels)*, `src/apps/boutique/features/{treasury, documents, pos}`  
> **Date de début :** Novembre 2026 | **Lead / Revue de PR :** Ethan

---

## 🛑 1. RÈGLES D'OR & CADRE DE COLLABORATION

1. **Maquette Figma obligatoire :** Chaque composant et chaque écran de caisse doivent respecter **strictement les maquettes Figma**.
2. **Backend intouchable :** **Interdiction formelle de modifier le backend** sans en faire la demande explicite sur l'application TaskSprint et obtenir l'accord d'Ethan. L'API est documentée sur `http://localhost:4000/api-docs`.
3. **Périmètre de code :**
   - Tu es le **propriétaire unique de `src/components/ui/`**. Tous les composants génériques (Button, Input, Modal, Badge...) sont créés par toi. Si Djenna ou Jhonny ont besoin d'un composant, c'est toi qui l'intègres.
   - Ne modifie pas les dossiers d'authentification ou d'inscription sans en parler à Djenna ou Jhonny.
4. **Git Workflow :**
   - Branche de travail commune : `develop`. Ne **jamais** pousser sur `main`.
   - Chaque matin avant de coder : `git pull --rebase origin develop`.
   - **Une tâche = Une branche = Une PR** relue et validée par Ethan avant 18h.
   - Format de branche : `feature/<espace>-<module>-<action>` (ex : `feature/core-utils`, `feature/ui-kit-base`, `feature/boutique-pos-cart`).
   - Format de commit conventionnel : `feat(ui): ...`, `feat(pos): ...`, `fix(treasury): ...`.
5. **Règles métier & ergonomie :**
   - **Argent :** Toujours formater les montants avec `formatMoney(montant)` qui donne l'espace insécable et le suffixe `" FCFA"` (ex: `15 000 FCFA`).
   - **Dates :** Toujours avec Day.js en français (`formatDate`, `formatDateTime`, `formatRelative`).
   - **Accessibilité tactile :** En caisse et sur mobile, toutes les zones de clic doivent faire **au minimum 44 x 44 px**.
   - **Zéro axios hors de `@/core/api`** : importe toujours le client configuré par Djenna.
   - **Erreurs API :** Toujours traiter les erreurs avec `parseApiError(err)`.

---

## 🛠️ 2. INSTALLATION & CONFIGURATION LOCALE

### Lancer l'environnement
1. **Backend (API) :**
   ```bash
   cd backend
   npm run dev
   ```
   *L'API tourne sur `http://localhost:4000` (Doc: `http://localhost:4000/api-docs`).*
2. **Frontend (Vite) :**
   ```bash
   cd frontend
   npm run dev
   ```
   *Application sur `http://localhost:5173`.*

---

## 📁 3. SQUELETTE D'UNE FEATURE (`features/<module>/`)
Chaque module développé (Trésorerie, Documents, POS) doit respecter cette structure :
```text
features/<module>/
├── api.js         # Appels API via @/core/api/client
├── hooks.js       # Hooks React Query (useQuery, useMutation)
├── schemas.js     # Schémas Zod pour formulaires
├── store/         # (Optionnel : cartStore pour le POS)
├── components/    # Composants internes au module
├── pages/         # Pages complètes
└── routes.jsx     # Export default [{ path, element, permission }]
```

---

## 📅 4. PLANNING DÉTAILLÉ SEMAINE PAR SEMAINE

### ══ SEMAINE 1 : Design System & Utilitaires Partagés ══
**Objectif :** Fournir dès les premiers jours à toute l'équipe (Djenna, Jhonny, Ethan) le kit de composants UI et les utilitaires de calcul pour qu'ils puissent construire leurs écrans sans réinventer la roue.  
**Preuve de fin :** Page `/dev/ui` affichant tous les composants dans tous leurs états ; `formatMoney(15000)` renvoie `"15 000 FCFA"`.

---

#### 🔹 TÂCHE ME-01 — Utilitaires transverses & Hooks de base (incluant Dark Mode)
- **Branche :** `feature/core-utils`
- **Priorité :** Haute | **Échéance :** 03/11/2026 (4h)
- **Fichiers à créer :**
  - `src/core/utils/cn.js`
  - `src/core/utils/formatMoney.js`
  - `src/core/utils/formatDate.js`
  - `src/core/utils/labels.js`
  - `src/core/hooks/useDebounce.js`
  - `src/core/hooks/useDisclosure.js`
  - `src/core/hooks/usePagination.js`
  - `src/core/hooks/useTheme.js` *(Mode sombre : toggle 'dark' sur documentElement, persistance en localStorage)*
- **Ce que tu dois faire :**
  1. `cn.js` : combinaison de `clsx` et `tailwind-merge` pour concaténer les classes sans conflits.
  2. `formatMoney.js` : prend un nombre, formate avec un espace comme séparateur de milliers, zéro décimale par défaut, suffixé de `" FCFA"`.
  3. `formatDate.js` : dayjs configuré avec la locale `'fr'`. Fournir `formatDate(d)`, `formatDateTime(d)` et `formatRelative(d)` ("il y a 10 min").
  4. `labels.js` : dictionnaires de traduction des statuts serveur vers le français (statuts de vente, de document, de ticket...).
  5. `useDebounce(value, 300)` : hook essentiel pour retarder la recherche serveur de 300ms.
  6. `useTheme()` : fournit `{ theme, toggleTheme }`, applique la classe `dark` pour que le bouton soleil/lune de la TopBar fonctionne réellement.
- **Preuve / Test :** Écris des tests unitaires ou des exemples d'usage en commentaire.

---

#### 🔹 TÂCHE ME-02 — UI Kit de Base (Boutons, Champs, Badges)
- **Branche :** `feature/ui-kit-base` (après ME-01)
- **Priorité :** Haute | **Échéance :** 04/11/2026 (8h)
- **Fichiers à créer :**
  - `src/components/ui/Button.jsx`
  - `src/components/ui/Input.jsx`
  - `src/components/ui/Select.jsx`
  - `src/components/ui/Textarea.jsx`
  - `src/components/ui/Checkbox.jsx`
  - `src/components/ui/Toggle.jsx`
  - `src/components/ui/Badge.jsx`
- **Ce que tu dois faire :**
  1. `Button` : Variantes `primary` (bleu `brand-600`), `platform` (violet `platform-600`), `secondary`, `danger`, `ghost`. Support de `isLoading` avec spinner intégré et `disabled`.
  2. `Input`, `Select`, `Textarea` : Compatibles `react-hook-form` via `React.forwardRef`. Affichage propre du label, astérisque rouge si requis, icône à gauche, et message d'erreur rouge sous le champ.
  3. `Badge` : Variantes de statuts (`success` vert, `warning` orange, `danger` rouge, `info` bleu, `neutral` gris, `platform` violet).
- **Preuve / Test :** Livrable utilisable dès le 04/11 par Djenna pour ses formulaires de login et Jhonny pour la landing page.

---

#### 🔹 TÂCHE ME-03 — UI Kit Avancé & Page Vitrine `/dev/ui`
- **Branche :** `feature/ui-kit-advanced` (après ME-02)
- **Priorité :** Haute | **Échéance :** 06/11/2026 (9h)
- **Fichiers à créer :**
  - `src/components/ui/Modal.jsx`
  - `src/components/ui/ConfirmDialog.jsx`
  - `src/components/ui/DataTable.jsx`
  - `src/components/ui/Tabs.jsx`
  - `src/components/ui/KpiCard.jsx`
  - `src/components/ui/SearchInput.jsx`
  - `src/components/ui/EmptyState.jsx`
  - `src/components/ui/ErrorState.jsx`
  - `src/components/ui/Skeleton.jsx`
  - `src/apps/public/pages/DevUiPage.jsx` *(page temporaire de démo)*
- **Ce que tu dois faire :**
  1. `Modal` : Utiliser un React Portal, gestion de la fermeture par touche Échap, clic extérieur et piège de focus.
  2. `ConfirmDialog` : Modale de confirmation réutilisable, avec option `verificationWord` (l'utilisateur doit retaper un mot précis, ex: "BANNIR", pour débloquer l'action destructrice).
  3. `DataTable` : Tableau générique supportant les colonnes dynamiques, l'état skeleton et l'état vide.
  4. Créer la page de démonstration `/dev/ui` qui met en scène chaque composant avec toutes ses variantes.
- **Preuve / Test :** Ouvre `http://localhost:5173/dev/ui` : tous les composants fonctionnent visuellement.

---

### ══ SEMAINE 2 : Trésorerie Complète & Documents Commerciaux ══
**Objectif :** Suivi de la trésorerie de boutique et consultation des devis/factures.  
**Preuve de fin :** Enregistrement d'une dépense répercutée en direct, Z de caisse avec écart compté, liste des devis et factures filtrable.

- **ME-04 Trésorerie : Journal & Opérations** (`feature/boutique-treasury-journal` - Échéance 10/11)  
  *Backend :* `GET /api/v1/treasury`, `POST /api/v1/treasury/transactions`. 3 cartes (Solde caisse, Recettes vert, Dépenses rouge). Modale d'enregistrement (Recette vs Dépense, catégorie, mode de paiement).
- **ME-05 Caisse : Ouverture, Clôture (Z de Caisse) & Export** (`feature/boutique-treasury-sessions` - Échéance 11/11)  
  *Backend :* `POST /api/v1/treasury/sessions/open`, `POST /api/v1/treasury/sessions/close`, `GET /api/v1/treasury/export`. Rapport d'écart (fonds compté vs théorique), mise en page imprimable (CSS print).
- **ME-06 Devis & Factures : Liste & Indicateurs** (`feature/boutique-documents-list` - Échéance 12/11)  
  *Backend :* `GET /api/v1/documents`. 4 KPI (Total facturé, Impayés rouge, Devis en cours, Taux encaissement). Onglets Tous / Factures / Devis.

---

### ══ SEMAINE 3 : Création de Documents & Caisse POS (Grille) ══
**Objectif :** Génération de factures/devis et premier écran du terminal de caisse.
- **ME-07 Création de Devis/Facture** (`feature/boutique-documents-create` - Échéance 17/11) : Lignes dynamiques, calcul automatique de la TVA et remises avec `computeTotals()` rigoureusement identique au calcul backend, `POST /api/v1/documents`.
- **ME-08 Détail du document & Conversion Devis → Facture** (`feature/boutique-documents-detail` - Échéance 18/11) : `POST /documents/:id/convert`, gabarit PDF imprimable.
- **ME-09 Caisse POS : Store Panier, Grille Produits & Scan** (`feature/boutique-pos-grid` - Échéance 20/11) :
  - `src/apps/boutique/features/pos/store/cartStore.js` (Zustand : `addItem`, `setQty`, `removeItem`, `clear`).
  - Page `/pos` : Grille 4 colonnes, focus recherche automatique avec raccourci `/`, filtre catégories, scan code-barres douchette (`GET /api/v1/products/barcode/:code`).

---

### ══ SEMAINE 4 : Vente Complète en Caisse (Paiements, Reçu, Annulation) ══
**Objectif :** Le cœur névralgique de Stockline : encaissement fluide et sans friction.
- **ME-10 Panier, Client & Modes de Paiement Combinés** (`feature/boutique-pos-cart` - Échéance 24/11) : Panier rétractable, client lié pour vente à crédit, monnaie à rendre en direct, ventilation paiements espèces/mobile money.
- **ME-11 Validation de la Vente & Impression Reçu** (`feature/boutique-pos-checkout` - Échéance 26/11) :
  - `src/apps/boutique/features/pos/services/submitSale.js` : unique point d'entrée appelant `POST /api/v1/sales`. Génère un `clientOperationId` unique via `crypto.randomUUID()`.
  - Modale ticket de caisse format 80mm pour impression thermique.
  - Gestion de l'erreur `INSUFFICIENT_STOCK` : surligner en rouge les articles dont le stock est insuffisant.
- **ME-12 Historique des Ventes & Annulation Admin** (`feature/boutique-pos-history` - Échéance 27/11) : `GET /api/v1/sales`, réimpression, annulation avec motif obligatoire `POST /api/v1/sales/:id/cancel` qui réintègre le stock.

---

### ══ SEMAINE 5 : Caisse Mobile (390px), Caméra & Performance ══
- **ME-13 Caisse Mobile & Scan Caméra** (`feature/boutique-pos-mobile` - Échéance 02/12) : Test réel sur mobile Android 390px, panier en tiroir bas (drawer), scan caméra via BarcodeDetector ou `@zxing/browser`.
- **ME-14 Export de Rapports Ventes/Stock** (`feature/boutique-reports-export` - Échéance 03/12) : Remplace le stub `ExportReportButton.jsx` de Djenna par la modale réelle d'export.
- **ME-15 Optimisation & Performance POS** (`chore/pos-performance` - Échéance 04/12) : `React.memo`, virtualisation de liste au-delà de 200 produits, test à 1000 articles sans latence.

---

### ══ SEMAINE 6 : Recette Caisse & Finitions ══
- **ME-16 Corrections de Recette** (`fix/mechack-recette` - Échéance 09/12) : Résolution des retours de recette d'Ethan.
