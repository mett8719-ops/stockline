/**
 * ══════════════════════════════════════════════════════════════════════════
 *  DOCUMENTATION API AUTOMATIQUE (OpenAPI 3.1 / Swagger UI)
 * ══════════════════════════════════════════════════════════════════════════
 *
 * PRINCIPE : on n'ecrit JAMAIS de documentation separee. Chaque route declare
 * ses schemas Zod (qui servent deja a la validation) ; ce fichier les convertit
 * en specification OpenAPI. La doc ne PEUT PAS se desynchroniser du code.
 *
 * Dans un fichier de routes :
 *
 *   registerRoute({
 *     method: "post", path: "/products", tags: ["Produits"],
 *     summary: "Creer un produit",
 *     request:   { body: createProductSchema },
 *     responses: { 201: productResponse },
 *     permissions: ["products"],
 *   });
 *
 * Resultat consultable sur :
 *   GET /api-docs        → interface de test interactive
 *   GET /api-docs.json   → specification brute (import Postman, generation de client)
 */
const {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} = require("@asteasolutions/zod-to-openapi");
const { z } = require("zod");

// Ajoute la methode .openapi() aux schemas Zod (descriptions, exemples)
extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// ── Schema d'authentification declare une seule fois ────────────────────
const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Jeton d'acces obtenu via POST /auth/login",
});

/** Enveloppe standard de succes, appliquee automatiquement a toutes les reponses. */
const wrapSuccess = (schema) =>
  z.object({
    success: z.literal(true),
    data: schema.optional(),
    meta: z.any().optional(),
  });

/** Enveloppe standard d'erreur. */
const errorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string(),
    details: z.any().optional(),
  }),
});

/**
 * Enregistre une route dans la specification OpenAPI.
 * A appeler dans le fichier de routes, juste a cote de la declaration Express.
 */
function registerRoute({
  method,
  path,
  tags = [],
  summary,
  description,
  request = {},
  responses = {},
  security = true,
  permissions = [],
}) {
  const req = {};
  if (request.body) {
    req.body = {
      content: { "application/json": { schema: request.body } },
      required: true,
    };
  }
  if (request.query) req.query = request.query;
  if (request.params) req.params = request.params;

  const res = {};
  for (const [code, schema] of Object.entries(responses)) {
    res[code] = {
      description: schema?._def?.description || "Succes",
      content: { "application/json": { schema: wrapSuccess(schema ?? z.any()) } },
    };
  }

  // Reponses d'erreur communes ajoutees partout, sans les reecrire a chaque route
  res[422] = {
    description: "Donnees invalides",
    content: { "application/json": { schema: errorSchema } },
  };
  if (security) {
    res[401] = {
      description: "Non authentifie",
      content: { "application/json": { schema: errorSchema } },
    };
    res[403] = {
      description: "Acces refuse",
      content: { "application/json": { schema: errorSchema } },
    };
  }

  // La permission requise apparait directement dans la doc : un dev sait
  // immediatement quel role peut appeler cette route.
  let desc = description || "";
  if (permissions.length) {
    desc += `\n\n**Permission requise :** \`${permissions.join("`, `")}\``;
  }

  registry.registerPath({
    method,
    path: `${process.env.API_PREFIX || "/api/v1"}${path}`,
    tags,
    summary,
    description: desc.trim() || undefined,
    security: security ? [{ [bearerAuth.name]: [] }] : [],
    request: Object.keys(req).length ? req : undefined,
    responses: res,
  });
}

/** Enregistre un schema reutilisable (apparait dans la section "Schemas"). */
function registerSchema(nom, schema) {
  return registry.register(nom, schema);
}

/** Assemble le document OpenAPI complet, une fois toutes les routes chargees. */
function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Stockline API",
      version: "1.0.0",
      description: [
        "API de la plateforme SaaS multi-boutiques **Stockline** — gestion",
        "commerciale et de stock pour l'Afrique centrale.",
        "",
        "## Isolation des donnees",
        "Chaque enregistrement metier porte un `shopId`. Un utilisateur ne peut",
        "lire ou modifier que les donnees de SA boutique. Le staff de la",
        "plateforme (Super-Admin) n'accede qu'aux **metadonnees de compte**",
        "(abonnement, quotas, statut) — jamais aux donnees commerciales.",
        "",
        "## Authentification",
        "1. `POST /auth/login` renvoie un `accessToken` (15 min) et depose un",
        "   cookie httpOnly contenant le refresh token (7 jours).",
        "2. Transmettre `Authorization: Bearer <accessToken>` sur chaque appel.",
        "3. `POST /auth/refresh` renouvelle l'access token sans ressaisie.",
        "",
        "## Format des reponses",
        "Succes : `{ success: true, data: ..., meta?: ... }`",
        "",
        "Erreur : `{ success: false, error: { message, code, details? } }`",
      ].join("\n"),
      contact: {
        name: "Equipe Stockline",
        email: process.env.SUPPORT_EMAIL || "support@stockline.cg",
      },
    },
    servers: [
      {
        url: process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`,
        description: "Environnement courant",
      },
    ],
    tags: [
      { name: "Authentification", description: "Connexion, rafraichissement, profil" },
      { name: "Inscription", description: "Demandes de creation de compte (public)" },
      { name: "Produits", description: "Catalogue produits et categories" },
      { name: "Stock", description: "Mouvements de stock et alertes de seuil" },
      { name: "Clients", description: "Fichier clients, creances et versements" },
      { name: "Fournisseurs", description: "Fournisseurs, receptions et paiements" },
      { name: "Ventes", description: "Point de vente (POS) et historique" },
      { name: "Documents", description: "Devis, factures, recus, bons de livraison" },
      { name: "Inventaire", description: "Sessions d'inventaire physique et ecarts" },
      { name: "Tresorerie", description: "Recettes, depenses et cloture de caisse" },
      { name: "Utilisateurs", description: "Agents de la boutique, roles et permissions" },
      { name: "Rapports", description: "Tableau de bord et rapports de la boutique" },
      { name: "Messagerie", description: "Conversations internes et support" },
      { name: "Tickets", description: "Tickets de support" },
      { name: "Suggestions", description: "Boite a suggestions et votes" },
      { name: "Notifications", description: "Centre de notifications" },
      { name: "Plateforme", description: "Console Super-Admin (editeur)" },
    ],
  });
}

module.exports = { registry, registerRoute, registerSchema, buildOpenApiDocument, z };
