# 🚀 DÉMARRAGE RAPIDE LOCAL — STOCKLINE

Bienvenue sur le projet **Stockline** !  
Ce guide permet à chaque développeur de l'équipe (Djenna, Mechack, Jhonny, Ethan) d'avoir son environnement fonctionnel en 3 minutes.

---

## 🧭 1. Guide de mission par personne
Chaque développeur dispose d'un guide complet et détaillé de ses tâches à la racine du dépôt :
- 👩‍💻 **Djenna :** [`DJENNA_STOCKLINE.md`](./DJENNA_STOCKLINE.md) *(Socle technique, auth, router, catalogue produits, inventaire, paramètres)*
- 👨‍💻 **Mechack :** [`MECHACK_STOCKLINE.md`](./MECHACK_STOCKLINE.md) *(UI Kit design system, trésorerie, devis/factures, terminal de caisse POS)*
- 👨‍💻 **Jhonny :** [`JHONY_STOCKLINE.md`](./JHONY_STOCKLINE.md) *(Site public landing page, wizard inscription, onboarding, clients, fournisseurs, notifications)*
- 👨‍💻 **Ethan :** [`ETHAN_STOCKLINE.md`](./ETHAN_STOCKLINE.md) *(Lead Tech, console Super-Admin, PWA offline, recette et déploiement)*

---

## 🗄️ 2. Base de données locale (MongoDB Compass)

En phase de développement, **chacun travaille sur sa propre base locale** (ou cluster personnel si préféré).  
Le cluster distant partagé de production/staging est réservé pour plus tard.

1. Installe et ouvre **MongoDB Compass** (ou ton service MongoDB local).
2. Connecte-toi sur :  
   ```text
   mongodb://127.0.0.1:27017
   ```
3. Dans `backend/`, crée un fichier `config.env` (copié depuis `config.env.example`) avec :
   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/stockline
   ```

---

## ⚡ 3. Initialiser les données de test (Seed)

Depuis le dossier `backend/`, lance une seule commande :
```bash
cd backend
npm run seed
```

Cette commande va créer automatiquement et sans doublon :
1. ✅ **Les 3 plans tarifaires :** Starter, Pro, Enterprise
2. ✅ **Les paramètres de la plateforme et feature flags**
3. ✅ **Le compte Super-Admin :** `admin@stockline.cg` / `ChangeMoi2026!`
4. ✅ **Une boutique de démonstration active (T001) :** *Boutique Démo Brazzaville*
5. ✅ **Un compte Gérant (Admin boutique) :** `gerant@stockline.cg` / `Boutique2026!`
6. ✅ **Un compte Caissier boutique :** `caissier@stockline.cg` / `Caissier2026!`
7. ✅ **Des catégories et produits réels avec stock :**
   - Riz parfumé 25kg (Stock: 45)
   - Huile 5L (Stock: 30)
   - Lait Bonnet Bleu (Stock bas: 8 sur seuil 10 — idéal pour tester l'alerte !)
   - Eau minérale Mayo (Stock: 60)
   - Savon de Marseille (Stock: 200)

---

## 💻 4. Lancer les applications

### Terminal 1 — Backend (API) :
```bash
cd backend
npm run dev
```
- API : `http://localhost:4000/api/v1`
- Documentation Swagger interactive : `http://localhost:4000/api-docs`

### Terminal 2 — Frontend (Vite React) :
```bash
cd frontend
npm run dev
```
- Application : `http://localhost:5173`
- *Le proxy Vite redirige automatiquement toutes les requêtes `/api` et `/socket.io` vers le backend sur le port 4000.*

---

## 🌿 5. Règles Git pour toute l'équipe
- Branche de travail commune : **`develop`**. Ne jamais pousser sur `main`.
- Chaque matin : `git pull --rebase origin develop`.
- Une tâche = une branche `feature/<espace>-<module>-<action>` = une PR relue par Ethan.
- **Interdiction formelle de modifier le backend** sans accord explicite sur TaskSprint.
