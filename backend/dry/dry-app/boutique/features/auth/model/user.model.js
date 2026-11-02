/**
 * UTILISATEUR.
 *
 * Couvre DEUX populations dans un seul modele :
 *   - le staff de la plateforme  → shopId = null  (super_admin, support_agent)
 *   - les membres d'une boutique → shopId renseigne (admin, caissier, ...)
 *
 * Un modele unique evite de dupliquer la logique de hachage, de verification
 * et de gestion des sessions.
 *
 * Le mot de passe est hache avec ARGON2ID : recommandation OWASP actuelle,
 * nettement plus resistant que bcrypt aux attaques par carte graphique.
 *
 * NOTE : le projet utilise @node-rs/argon2 (binaires precompiles, pas de
 * compilation C++ sur Windows). API identique a argon2 : hash() / verify().
 */
const mongoose = require("mongoose");
const { hash, verify } = require("@node-rs/argon2");
const {
  ALL_ROLES, SHOP_ROLES, DEFAULT_ROLE_PERMISSIONS, PERMISSION_LIST,
} = require("../../../../../core/constants");

const userSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    telephone: { type: String, trim: true, index: true },

    /**
     * `select: false` : le hash n'est JAMAIS renvoye par une requete normale.
     * Il faut le demander explicitement : .select("+passwordHash")
     * Sans cela, un simple GET /users exposerait tous les hash de la boutique.
     */
    passwordHash: { type: String, required: true, select: false },

    role: { type: String, enum: Object.values(ALL_ROLES), required: true, index: true },

    // null pour le staff plateforme (super_admin / support_agent)
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "platform-shop",
      default: null,
      index: true,
    },

    // Permissions effectives ; ecrasees par customRole s'il est actif
    permissions: { type: [String], enum: PERMISSION_LIST, default: [], select: false },
    customRole: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-role", default: null },

    actif: { type: Boolean, default: true, index: true },

    // Gel individuel par l'admin de la boutique (distinct de la desactivation)
    gele: { type: Boolean, default: false },
    motifGel: { type: String, maxlength: 300 },

    /**
     * Force l'ecran bloquant de premiere connexion :
     * "Bienvenue ! Veuillez definir votre mot de passe personnel avant de continuer."
     */
    doitChangerMotDePasse: { type: Boolean, default: false },
    aTermineVisiteGuidee: { type: Boolean, default: false },

    derniereConnexion: { type: Date },

    // Protection anti force-brute : blocage temporaire apres 5 echecs
    tentativesEchouees: { type: Number, default: 0, select: false },
    bloqueJusquA: { type: Date, select: false },

    /**
     * Sessions actives. Chaque connexion y ajoute un identifiant unique (jti).
     * Vider ce tableau revoque INSTANTANEMENT toutes les sessions de
     * l'utilisateur — c'est ce qui rend le gel d'un agent immediat.
     */
    refreshTokens: {
      type: [
        {
          jti: String,
          creeLe: { type: Date, default: Date.now },
          expireLe: Date,
          userAgent: String,
          ip: String,
        },
      ],
      default: [],
      select: false,
    },

    // Reinitialisation par email : on stocke le HASH du jeton, jamais le jeton
    resetToken: { type: String, select: false },
    resetTokenExpire: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      /**
       * Filet de securite ultime : meme si un developpeur fait un
       * .select("+passwordHash") et renvoie l'objet tel quel, les champs
       * sensibles sont retires de la reponse JSON.
       */
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.refreshTokens;
        delete ret.resetToken;
        delete ret.resetTokenExpire;
        delete ret.tentativesEchouees;
        delete ret.bloqueJusquA;
        return ret;
      },
    },
  }
);

// ══ INDEX ═════════════════════════════════════════════════════════════

/**
 * Un email est unique DANS une boutique, pas globalement.
 * La meme personne peut etre employee de deux boutiques differentes avec la
 * meme adresse email — cas frequent chez les comptables independants.
 */
userSchema.index({ shopId: 1, email: 1 }, { unique: true });

// Liste des membres filtree par role et par statut
userSchema.index({ shopId: 1, role: 1, actif: 1 });

/**
 * Unicite GLOBALE, mais uniquement pour les comptes plateforme (shopId null).
 * L'index partiel evite d'entrer en conflit avec l'index precedent.
 */
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { shopId: null } }
);

// ══ HOOKS ═════════════════════════════════════════════════════════════

/**
 * Hachage automatique a chaque modification du mot de passe.
 * On assigne le mot de passe EN CLAIR a `passwordHash` et ce hook le remplace
 * par son empreinte — les controleurs n'ont donc jamais a appeler argon2.
 *
 * Parametres : ~64 Mo de memoire, 3 iterations. Suffisamment couteux pour
 * decourager une attaque, assez rapide pour ne pas ralentir la connexion.
 */
userSchema.pre("save", async function hasherMotDePasse() {
  if (!this.isModified("passwordHash")) return;
  this.passwordHash = await hash(this.passwordHash, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
});

/** Applique les permissions par defaut du role si aucune n'est precisee. */
userSchema.pre("save", function appliquerPermissionsParDefaut() {
  if (this.isNew && (!this.permissions || this.permissions.length === 0)) {
    this.permissions = DEFAULT_ROLE_PERMISSIONS[this.role] || [];
  }
});

// ══ METHODES ══════════════════════════════════════════════════════════

/** Verifie un mot de passe en clair contre le hash stocke. */
userSchema.methods.verifierMotDePasse = function verifierMotDePasse(motDePasse) {
  if (!this.passwordHash) return false;
  return verify(this.passwordHash, motDePasse);
};

/** Le compte est-il temporairement bloque pour trop de tentatives ? */
userSchema.methods.estBloque = function estBloque() {
  return !!(this.bloqueJusquA && this.bloqueJusquA > new Date());
};

userSchema.methods.estAdminBoutique = function estAdminBoutique() {
  return this.role === SHOP_ROLES.ADMIN;
};

module.exports = mongoose.model("boutique-user", userSchema);
