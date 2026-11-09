# 📋 GUIDE DE MISSION & LEADERSHIP — ETHAN

> **Rôle :** Lead Tech & Développeur Fullstack (Console Super-Admin, PWA Offline, Recette & Déploiement)  
> **Propriétaire de dossier :** `src/apps/platform/features/{signups, shops, billing, plans, overview, analytics}`, `src/core/offline/`, `backend/` *(évolutions)*  
> **Date de début :** Novembre 2026

---

## 👑 1. CADRE DE DIRECTION TECHNIQUE

1. **Revue de PR quotidienne :** Relecture et validation des PRs de Djenna, Mechack et Jhonny chaque jour avant 18h sur `develop`.
2. **Respect des frontières :** Vérifier qu'aucun développeur n'a importé `axios` hors de `@/core/api`, qu'aucun jeton ne traîne en `localStorage`, et que la maquette Figma est scrupuleusement respectée.
3. **Gardien du Backend :** Tu es la seule personne habilitée à modifier ou approuver une modification du backend.

---

## 📅 2. PLANNING DES MODULES D'ETHAN

### ══ SEMAINE 2 : Validation des Inscriptions & Compléments Backend ══
- **ET-01 Console : Demandes d'inscription en attente** (`feature/platform-signups-queue` - Échéance 10/11) :
  - `GET /platform/signup-requests`, dossier complet, actions : Valider et créer le compte (`POST /:id/approve`), Demande d'infos, Rejeter.
- **ET-02 Console : Annuaire des Boutiques, Gel & Bannissement** (`feature/platform-shops` - Échéance 12/11) :
  - `GET /platform/shops`, jauges quotas, gel temporaire (déconnecte les employés), bannissement sécurisé (avec saisie obligatoire du mot "BANNIR").
- **ET-03 Backend : Paramètres Boutique & Uploads Signés** (`feature/backend-shop-settings-uploads` - Échéance 13/11) :
  - `PATCH /api/v1/shop` (nom, adresse, logoUrl avec `etapesOnboarding.logoAjoute = true`).
  - `POST /api/v1/uploads/sign` (signature Cloudinary sécurisée par shopId).

---

### ══ SEMAINE 3 : Facturation Abonnements & Plans ══
- **ET-04 Console : Facturation & Encaissement Mobile Money** (`feature/platform-billing` - Échéance 18/11) :
  - KPI MRR/ARR, `POST /platform/billing/charge` avec polling toutes les 5s sur le statut de validation du téléphone.
- **ET-05 Console : Gestion des Plans Tarifaires** (`feature/platform-plans` - Échéance 20/11) :
  - Création/modification des plans, quotas et grille des 14 fonctionnalités.

---

### ══ SEMAINE 4 : Analytique d'Usage & Vue d'Ensemble ══
- **ET-06 Console : Vue d'ensemble & Analytique anonymisée** (`feature/platform-overview-analytics` - Échéance 25/11) :
  - `GET /platform/overview`, `GET /platform/analytics?jours=30` (graphiques Recharts, croissance tenants, bandeau d'anonymisation).

---

### ══ SEMAINE 5 : Mode Hors-Ligne & PWA Installable ══
- **ET-07 PWA & Synchronisation Offline** (`feature/core-offline-sync` - Échéance 03/12) :
  - Dexie.js (IndexedDB local), wrapper `submitSale`, file d'attente `pendingSales`, `SyncBadge` temps réel, synchronisation automatique par lots au retour du réseau via `POST /api/v1/sales/sync`.

---

### ══ SEMAINE 6 : Recette Complète & Mise en Ligne ══
- **ET-08 Recette Bout en Bout, Isolation Multi-Tenant & Déploiement** (`release/recette-v1` - Échéance 11/12) :
  - Test d'isolation étanche entre 2 boutiques distinctes, build de production, audit Lighthouse PWA ≥ 90, tag v1.0.0.
