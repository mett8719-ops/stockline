# Dépendances du backend — Stockline

Ce document liste les dépendances installées dans le projet, leur version et leur rôle.

## Installation

Toutes les dépendances ont été installées avec la commande suivante (sous Windows) :

```bash
npm install jsonwebtoken @node-rs/argon2 helmet cors cookie-parser express-rate-limit express-mongo-sanitize
```

> **Note :** `@node-rs/argon2` remplace `argon2`. Ce dernier nécessitait une compilation native (Visual Studio Build Tools sous Windows) qui échouait sur cette machine. `@node-rs/argon2` fournit des binaires précompilés : même API (`hash()` / `verify()`), aucune compilation requise.

## Récapitulatif

| Dépendance | Version | Rôle |
|---|---|---|
| `express` | ^5.2.1 | Framework web : gestion des routes, middlewares, requêtes/réponses HTTP |
| `mongoose` | ^9.9.3 | ODM pour MongoDB : modélisation des données, schémas, requêtes vers la base |
| `jsonwebtoken` | ^9.0.3 | Création et vérification des tokens JWT pour l'authentification |
| `@node-rs/argon2` | ^2.1.0 | Hachage sécurisé des mots de passe (algorithme Argon2id) |
| `helmet` | ^8.3.0 | Sécurisation des en-têtes HTTP (X-Frame-Options, CSP, HSTS, etc.) |
| `cors` | ^2.8.6 | Autorise les requêtes cross-origin (front-end → API) |
| `cookie-parser` | ^1.4.7 | Analyse et gestion des cookies envoyés par les clients |
| `express-rate-limit` | ^8.6.2 | Limitation du nombre de requêtes par IP (anti-brute-force / DDoS léger) |
| `express-mongo-sanitize` | ^2.2.0 | Protège contre les injections NoSQL dans les requêtes MongoDB |
| `dotenv` | ^17.4.2 | Chargement des variables d'environnement depuis un fichier `.env` |
| `colors` | ^1.4.0 | Logs colorés dans la console (débogage plus lisible) |

## Détail par dépendance

### express
Framework web minimaliste et flexible. Il gère le routage (GET, POST, PUT, DELETE...), les middlewares et les réponses HTTP. C'est le cœur du serveur.

```js
import express from 'express';
const app = express();
app.use(express.json());
app.get('/', (req, res) => res.send('Hello'));
```

### mongoose
ODM (Object Document Mapper) pour MongoDB. Il permet de définir des schémas et modèles, de valider les données et d'interagir avec la base sans écrire de requêtes MongoDB brutes.

```js
import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({ name: String, email: String });
export default mongoose.model('User', userSchema);
```

### jsonwebtoken
Génère des tokens signés (JWT) après connexion et les vérifie sur les routes protégées. Le token contient l'identité de l'utilisateur et expire après un délai défini.

```js
import jwt from 'jsonwebtoken';
const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const payload = jwt.verify(token, process.env.JWT_SECRET);
```

### @node-rs/argon2
Hache les mots de passe avec l'algorithme **Argon2id** (vainqueur du concours Password Hashing Competition), recommandé pour le stockage des mots de passe. On ne stocke jamais le mot de passe en clair.

```js
import { hash, verify } from '@node-rs/argon2';

const hashed = await hash(password);           // → $argon2id$v=19$m=19456,t=2,p=1...
const valid  = await verify(hashed, password); // → true / false
```

### helmet
Ajoute automatiquement des en-têtes HTTP de sécurité aux réponses (protection XSS, clickjacking, sniffing MIME...). À appliquer dès le démarrage de l'application.

```js
import helmet from 'helmet';
app.use(helmet());
```

### cors
Permet au front-end (ex. `http://localhost:3000`) d'appeler l'API sur un autre port (ex. `http://localhost:5000`) sans être bloqué par la politique de même origine du navigateur.

```js
import cors from 'cors';
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
```

### cookie-parser
Lit les cookies envoyés par le client et les rend accessibles via `req.cookies`. Utile si on stocke le JWT dans un cookie httpOnly plutôt que dans le localStorage.

```js
import cookieParser from 'cookie-parser';
app.use(cookieParser());
```

### express-rate-limit
Limite le nombre de requêtes par IP sur une période donnée (ex. 100 requêtes / 15 min). Protège les routes de connexion contre le brute-force.

```js
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/auth', limiter);
```

### express-mongo-sanitize
Nettoie les données envoyées par le client en supprimant les caractères `$` et `.` dans les objets, empêchant les injections NoSQL (ex. `{ "email": { "$gt": "" } }`).

```js
import mongoSanitize from 'express-mongo-sanitize';
app.use(mongoSanitize());
```

### dotenv
Charge les variables d'environnement depuis un fichier `.env` (port, URL MongoDB, secret JWT...) dans `process.env`.

```js
import 'dotenv/config';
const port = process.env.PORT || 5000;
```

### colors
Colore les messages de la console pour un débogage plus lisible (succès en vert, erreurs en rouge...).

```js
import 'colors';
console.log('Serveur démarré'.green);
```

## Ordre recommandé des middlewares dans `server.js`

```js
app.use(helmet());                    // sécurité des en-têtes
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());              // lecture du JSON
app.use(cookieParser());              // lecture des cookies
app.use(mongoSanitize());             // anti-injection NoSQL
app.use('/api/auth', authLimiter);    // rate-limit sur l'auth
```

## Dépendances ajoutées (étapes 5 à 7)

| Dépendance | Rôle |
|---|---|
| `zod` ^4.4.3 | Validation de schémas (le même schéma sert à valider ET à générer la doc OpenAPI) |
| `@asteasolutions/zod-to-openapi` ^9.1.0 | Conversion des schémas Zod en spécification OpenAPI 3.1 |
| `ioredis` ^6.0.0 | Client Redis tolérant aux pannes (compteurs d'usage, rate limiting, temps réel) |
| `nodemailer` ^9.0.5 | Envoi des emails transactionnels via SMTP Brevo |
| `axios` ^1.19.0 | Appels HTTP vers l'API FeexPay (Mobile Money MTN Congo) |
| `socket.io` ^4.8.3 | Notifications et messagerie en temps réel |
| `swagger-ui-express` ^5.0.1 | Interface interactive de la doc API sur `/api-docs` |
| `compression` ^1.8.1 | Compression gzip des réponses HTTP |
| `dayjs` ^1.11.23 | Manipulation légère des dates |
| `pino` + `pino-http` + `pino-pretty` | Logs structurés et lisibles |
| `nodemon` | Redémarrage automatique du serveur en développement |
| `jest` + `supertest` | Tests unitaires et tests d'API |
| `eslint` | Analyse statique du code |

---

# Récapitulatif du travail réalisé

## Étapes et commits

| Étape | Contenu | Commit |
|---|---|---|
| 0. Préparation | Installation des dépendances de sécurité ; `argon2` remplacé par `@node-rs/argon2` (binaires précompilés, pas de compilation C++ sur Windows) | — |
| 1. Configuration | Création de `config.env` (MongoDB, JWT, SMTP Brevo, Cloudinary, FeexPay) et `config.env.example` ; secrets JWT générés avec `openssl` | `75337e7` (chore) |
| 2. Étape 3 — Socle technique | 6 fichiers : constantes, connexion DB, réponses, erreurs, async-handler, error-handler | `2d400b6` |
| 3. Étape 4 — Sécurité du socle | 5 fichiers : JWT, authentification, autorisation, isolation multi-tenant | `2d400b6` |
| 4. Étape 5 — Validation + OpenAPI | 7 fichiers : validate, openapi, common-schemas, rate-limit, audit, usage-tracker, redis-client | `dd6c682` |
| 5. Étape 6 — Services externes | 4 fichiers : mailer, FeexPay, temps réel (Socket.IO), notifications | `7422aec` |
| 6. Étape 7 — Modèles plateforme | 5 modèles Mongoose : boutique, plan, demande d'inscription, factures, paiements | `b85482f` |

## Arborescence

```
dry/
├── core/                          # Socle technique et sécurité (18 fichiers)
│   ├── constants.js
│   ├── connect-db.js
│   ├── response.js
│   ├── app-error.js
│   ├── async-handler.js
│   ├── error-handler.js
│   ├── tokens.js
│   ├── authenticate.js
│   ├── authorize.js
│   ├── tenant-guard.js
│   ├── tenant.plugin.js
│   ├── validate.js
│   ├── openapi.js
│   ├── common-schemas.js
│   ├── rate-limit.js
│   ├── audit.js
│   ├── usage-tracker.js
│   ├── redis-client.js
│   └── services/                   # Services externes (4 fichiers)
│       ├── mailer.service.js
│       ├── feexpay.service.js
│       ├── realtime.service.js
│       └── notification.service.js
└── dry-app/
    └── platform/                   # Console Super-Admin (modèles)
        ├── features/shop/model/shop.model.js
        ├── features/plan-admin/model/plan.model.js
        ├── features/signup-review/model/signup-request.model.js
        └── features/billing/model/
            ├── platform-invoice.model.js
            └── payment.model.js
```

## Rôle de chaque fichier

### `dry/core/` — socle technique

| Fichier | Rôle |
|---|---|
| `constants.js` | **Point de vérité unique** : rôles (plateforme + boutique), les 14 permissions, statuts de boutique, documents, tickets, paiements. Jamais réécrit ailleurs. |
| `connect-db.js` | Connexion MongoDB partagée (Mongoose) : `sanitizeFilter` anti-injection NoSQL, pool de 20 connexions, `autoIndex` désactivé en production. |
| `response.js` | Formate **toutes** les réponses API : `{ success, data, meta }` en succès, `{ success: false, error: {...} }` en erreur, pagination standardisée. |
| `app-error.js` | Erreur métier typée : `AppError.notFound(...)`, `AppError.forbidden(...)`… Aucun contrôleur n'écrit `res.status(...)` à la main. |
| `async-handler.js` | Enveloppe les contrôleurs async : toute erreur part automatiquement vers le gestionnaire global (fini les try/catch répétés). |
| `error-handler.js` | **Dernier middleware Express** : traduit Mongoose (Validation, Cast, doublon), JWT (invalide, expiré), 404 et masque les détails techniques en production. |

### `dry/core/` — sécurité

| Fichier | Rôle |
|---|---|
| `tokens.js` | JWT : access token 15 min (`Authorization: Bearer`), refresh token 7 j (cookie httpOnly anti-XSS), mot de passe temporaire lisible, options du cookie. |
| `authenticate.js` | Vérifie le token, **recharge l'utilisateur en base** (permissions à jour, gel immédiat), contrôle l'état de la boutique (bannie/ gelée/ suspendue/ en attente) et injecte `req.user`. |
| `authorize.js` | RBAC + permissions modulaires : `authorizeRoles`, `requirePermission`, `platformOnly`, `superAdminOnly`, `shopOnly`, blocage tant que le mot de passe temporaire n'est pas changé. |
| `tenant-guard.js` ⚠️ | **Le fichier le plus critique** : `tenantScope` force le filtre `shopId` sur toute requête métier, `tenantPayload` neutralise le `shopId` envoyé par le client, `assertSameTenant` renvoie 404 (jamais 403) si la ressource appartient à une autre boutique. |
| `tenant.plugin.js` | 2ᵉ barrière Mongoose : ajoute `shopId` obligatoire/immutable à tout modèle métier et bloque en dev toute requête sans filtre d'isolation. |

### `dry/core/` — validation, doc, protection

| Fichier | Rôle |
|---|---|
| `validate.js` | Middleware de validation Zod : place les données validées dans `req.validated` (jamais `req.body`), erreurs détaillées champ par champ. |
| `openapi.js` | Génère la documentation OpenAPI 3.1 à partir des schémas Zod : la doc **ne peut pas** se désynchroniser du code. Servie sur `/api-docs`. |
| `common-schemas.js` | Briques Zod réutilisables : `objectId`, `phone` (format +242), `email`, `strongPassword`, `money` (arrondi 2 décimales), `paginationQuery` (limit ≤ 100), `safeText` (anti-XSS basique). |
| `rate-limit.js` | 3 niveaux : `authLimiter` (8 req/15 min, anti force-brute), `publicLimiter` (5 req/h, anti-spam), `apiLimiter` (300 req/15 min **par utilisateur** — plusieurs caisses partagent la même IP au Congo). |
| `audit.js` | Journal des actions sensibles (modif de prix, annulation de vente, gel de boutique…) — écriture « fire and forget ». |
| `usage-tracker.js` | Compteurs d'usage par module/jour (uniquement des compteurs, jamais de données commerciales) → écran « Analytique d'usage ». |
| `redis-client.js` | Client Redis **tolérant aux pannes** : si Redis tombe, tout échoue silencieusement, l'application continue de fonctionner. |

### `dry/core/services/` — services externes

| Fichier | Rôle |
|---|---|
| `mailer.service.js` | Emails transactionnels (activation, relance d'impayé, suspension, invitation employé). **Sans SMTP configuré, les emails s'affichent dans la console** (mode simulation). |
| `feexpay.service.js` | Intégration FeexPay (MTN Congo) : initie les paiements d'abonnement. Règles : la clé API ne quitte jamais le serveur ; le callback public est toujours re-vérifié auprès de FeexPay avant de marquer une facture payée. |
| `realtime.service.js` | Socket.IO : authentification par JWT, salons `user:<id>`, `shop:<id>`, `platform` — un socket ne rejoint que le salon de SA boutique (isolation). |
| `notification.service.js` | Crée une notification en base **et** la pousse en temps réel (badge). Ne fait jamais échouer l'action métier si la notification échoue. |

### `dry/dry-app/platform/` — modèles Mongoose (console Super-Admin)

| Fichier | Collection | Rôle |
|---|---|---|
| `shop.model.js` | `platform-shops` | Le **tenant** : toutes les données métier pointent vers son `_id` via `shopId`. Code T001 auto-généré, compteurs matérialisés (pas de 1 200 `countDocuments`), statut/abonnement/onboarding. |
| `plan.model.js` | `platform-plans` | Plans Starter / Pro / Enterprise : quotas (‑1 = illimité), modules inclus, remise annuelle, `publie` pour la page tarifs. |
| `signup-request.model.js` | `platform-signup-requests` | Demande d'inscription en 4 étapes (aucun compte créé avant validation). Mot de passe haché dès la soumission, index partiel unique par email. |
| `platform-invoice.model.js` | `platform-invoices` | Factures d'abonnement **émises par Stockline** aux boutiques (numérotation PF-AAAA-NNNN). À ne pas confondre avec les factures boutique→client. |
| `payment.model.js` | `platform-payments` | Trace complète d'un paiement FeexPay : référence, statut, numéro de payeur **masqué** (`***4567`), réponse brute pour le support. |

## Architecture en une phrase

> **`dry/core/`** = le socle que toute l'équipe écrit ensemble (sécurité, validation, doc, services) ; **`dry/dry-app/`** = les modules métier (plateforme d'abord, boutique ensuite). Chaque donnée métier porte un `shopId` ; `tenant-guard.js` + `tenant.plugin.js` garantissent qu'une boutique ne lit jamais les données d'une autre.
