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
