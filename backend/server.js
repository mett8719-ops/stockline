/**
 * ══════════════════════════════════════════════════════════════════════════
 *  POINT D'ENTREE DE L'API STOCKLINE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ORDRE DES MIDDLEWARES — volontaire et important :
 *   1. Securite HTTP      (helmet, cors)
 *   2. Parsing            (json, cookies, compression)
 *   3. Assainissement     (mongo-sanitize)
 *   4. Documentation      (/api-docs)
 *   5. Routes metier
 *   6. Gestion d'erreurs  (toujours EN DERNIER)
 *
 * Un middleware place apres les routes ne s'executerait jamais pour celles-ci.
 */
require("dotenv").config({ path: "./config.env" });
require("colors");

const express = require("express");
const http = require("http");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
/**
 * Sanitiseur Mongo compatible Express 5.
 * express-mongo-sanitize v2 essaie d'ecrire req.query, readonly dans Express 5.
 * On ne sanitisant que req.body et req.params.
 */
function mongoSanitizeV5() {
  const DOLLAR_OR_REGEX = /\$[^\s]|\.$/;

  function nettoyer(objet) {
    if (objet && typeof objet === "object" && !Array.isArray(objet)) {
      for (const cle of Object.keys(objet)) {
        if (DOLLAR_OR_REGEX.test(cle)) {
          objet[`_${cle.replace(/^\$/, "")}`] = objet[cle];
          delete objet[cle];
        } else if (typeof objet[cle] === "object") {
          nettoyer(objet[cle]);
        }
      }
    }
    return objet;
  }

  return (req, _res, next) => {
    if (req.body) nettoyer(req.body);
    if (req.params) nettoyer(req.params);
    next();
  };
}
const swaggerUi = require("swagger-ui-express");

const connectDB = require("./dry/core/connect-db");
const { errorHandler, notFoundHandler } = require("./dry/core/error-handler");
const { buildOpenApiDocument } = require("./dry/core/openapi");
const { initRealtime } = require("./dry/core/services/realtime.service");
const { initCronJobs } = require("./dry/core/services/cron.service");

// ── Routeurs des 4 espaces ────────────────────────────────────────────
const authRoute = require("./dry/dry-app/boutique/features/auth/routes/auth.route");
const publicRoute = require("./dry/dry-app/public/core/public.route");
const boutiqueRoute = require("./dry/dry-app/boutique/core/boutique.route");
const platformRoute = require("./dry/dry-app/platform/core/platform.route");
const sharedRoute = require("./dry/dry-app/shared/core/shared.route");
const { myFeatures } = require("./dry/dry-app/platform/features/feature-flag/controllers/feature-flag.controllers");
const { authenticate } = require("./dry/core/authenticate");

const PORT = Number(process.env.PORT || 4000);
const API_PREFIX = process.env.API_PREFIX || "/api/v1";

const app = express();

// ══ 1. SECURITE HTTP ══════════════════════════════════════════════════

/**
 * Derriere un reverse proxy (Nginx), `req.ip` renverrait l'IP du proxy sans
 * cette ligne. Or le rate limiting et le journal d'audit ont besoin de la
 * VRAIE IP du client.
 */
app.set("trust proxy", 1);

app.use(
  helmet({
    // Autorise le chargement des ressources depuis le frontend
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const originesAutorisees = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Pas d'origine = appel serveur a serveur (Postman, callback passerelle)
      if (!origin || originesAutorisees.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origine non autorisee : ${origin}`));
    },
    // INDISPENSABLE pour que le cookie httpOnly du refresh token circule
    credentials: true,
  })
);

// ══ 2. PARSING ════════════════════════════════════════════════════════

// 2 Mo : suffisant pour un import CSV de 1000 produits deja parse
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/**
 * Compression gzip. Critique sur le marche vise : une liste de 500 produits
 * passe d'environ 400 Ko a 40 Ko — la difference entre une caisse fluide et
 * une caisse inutilisable sur une connexion lente.
 */
app.use(compression());

// ══ 3. ASSAINISSEMENT ═════════════════════════════════════════════════

/**
 * Neutralise les operateurs Mongo ($gt, $ne...) injectes dans le corps ou
 * l'URL. Sans ce middleware, envoyer {"email": {"$ne": null}} au login
 * connecterait le premier utilisateur venu.
 */
app.use(mongoSanitizeV5());

// ══ 4. SONDE DE SANTE ═════════════════════════════════════════════════

/**
 * Appelee par le load balancer ou un service de surveillance. Volontairement
 * placee avant tout ce qui touche a l'authentification : elle doit repondre
 * meme si la base est inaccessible.
 */
app.get("/health", (req, res) => {
  const mongoose = require("mongoose");

  res.json({
    statut: "ok",
    service: "stockline-api",
    version: "1.0.0",
    baseDeDonnees: mongoose.connection.readyState === 1 ? "connectee" : "deconnectee",
    passerellePaiement: process.env.PAYMENT_PROVIDER || "geniuspay",
    demarreDepuisSecondes: Math.floor(process.uptime()),
    horodatage: new Date().toISOString(),
  });
});

// ══ 5. ROUTES METIER ══════════════════════════════════════════════════

/**
 * `auth` est monte SEPAREMENT des autres routes boutique : ses endpoints
 * doivent rester accessibles avant authentification (connexion) et pendant
 * le blocage du mot de passe temporaire (changement).
 */
app.use(`${API_PREFIX}/auth`, authRoute);

// Espace public : inscription, plans tarifaires, callback de paiement
app.use(`${API_PREFIX}/public`, publicRoute);

// Console Super-Admin
app.use(`${API_PREFIX}/platform`, platformRoute);

// Modules partages (notifications, tickets, messagerie)
app.use(API_PREFIX, sharedRoute);

// Feature flags actifs pour la boutique de l'appelant
app.get(`${API_PREFIX}/features`, authenticate, myFeatures);

// Espace boutique : les 13 modules metier + abonnement
app.use(API_PREFIX, boutiqueRoute);

// ══ 6. DOCUMENTATION OPENAPI ══════════════════════════════════════════

/**
 * Le document est genere APRES le chargement de toutes les routes : chaque
 * fichier de routes a appele registerRoute() au moment de son `require`.
 * Le generer plus tot produirait une documentation vide.
 */
const documentOpenApi = buildOpenApiDocument();

app.get("/api-docs.json", (req, res) => res.json(documentOpenApi));

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(documentOpenApi, {
    customSiteTitle: "Stockline API",
    swaggerOptions: {
      persistAuthorization: true,   // garde le jeton entre les rechargements
      docExpansion: "none",         // sections repliees a l'ouverture
      filter: true,                 // barre de recherche
      tagsSorter: "alpha",
    },
  })
);

// ══ 7. GESTION D'ERREURS — TOUJOURS EN DERNIER ════════════════════════
app.use(notFoundHandler);
app.use(errorHandler);

// ══ DEMARRAGE ═════════════════════════════════════════════════════════

const serveur = http.createServer(app);

(async () => {
  try {
    await connectDB();

    // Socket.IO se greffe sur le meme serveur HTTP
    initRealtime(serveur);

    // Initialisation des taches planifiees (facturation automatique, devis, analytique)
    initCronJobs();

    const HOST = process.env.HOST || "127.0.0.1";
    serveur.listen(PORT, HOST, () => {
      console.log("");
      console.log("  ╔═══════════════════════════════════════════════╗".cyan);
      console.log("  ║           STOCKLINE API — DEMARREE            ║".cyan.bold);
      console.log("  ╚═══════════════════════════════════════════════╝".cyan);
      console.log(`  Environnement : ${(process.env.NODE_ENV || "development").yellow}`);
      console.log(`  API           : ${`http://localhost:${PORT}${API_PREFIX}`.green}`);
      console.log(`  Documentation : ${`http://localhost:${PORT}/api-docs`.green.bold}`);
      console.log(`  Sante         : ${`http://localhost:${PORT}/health`.green}`);
      console.log(`  Paiement      : ${(process.env.PAYMENT_PROVIDER || "geniuspay").yellow}`);
      console.log("");
    });
  } catch (e) {
    console.error(`Echec du demarrage : ${e.message}`.red.bold);
    process.exit(1);
  }
})();

// ══ ARRET PROPRE ══════════════════════════════════════════════════════

/**
 * A la reception d'un signal d'arret (Ctrl+C, redemarrage du conteneur), on
 * ferme le serveur puis la base. Sans cela, les requetes en cours seraient
 * brutalement interrompues — potentiellement au milieu d'une transaction.
 */
const arretPropre = async (signal) => {
  console.log(`\n${signal} recu — arret en cours...`.yellow);

  serveur.close(async () => {
    try {
      await require("mongoose").connection.close();
      console.log("Arret propre termine".green);
    } catch (e) {
      console.error(`Erreur a l'arret : ${e.message}`.red);
    }
    process.exit(0);
  });

  // Filet de securite : arret force apres 10 secondes
  setTimeout(() => {
    console.error("Arret force apres delai d'attente".red);
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => arretPropre("SIGTERM"));
process.on("SIGINT", () => arretPropre("SIGINT"));

/**
 * Une promesse rejetee sans gestionnaire signale un bug. On journalise et on
 * laisse le processus continuer : en production, un redemarrage automatique
 * vaut mieux qu'un plantage silencieux.
 */
process.on("unhandledRejection", (raison) => {
  console.error(`Promesse rejetee non geree : ${raison}`.red.bold);
});

module.exports = app;
