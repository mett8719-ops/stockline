/**
 * Constantes partagees par toute l'application.
 * POINT DE VERITE UNIQUE : ne jamais redefinir ces valeurs ailleurs.
 */

/** Roles cote EDITEUR (console Super-Admin) — ces comptes n'ont PAS de shopId */
const PLATFORM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  SUPPORT_AGENT: 'support_agent',
};

/** Roles cote BOUTIQUE (tenant) — toujours rattaches a un shopId */
const SHOP_ROLES = {
  ADMIN: 'admin',           // le gerant : cree ses propres agents
  CAISSIER: 'caissier',
  MAGASINIER: 'magasinier',
  COMPTABLE: 'comptable',
  CUSTOM: 'custom',         // role sur mesure cree par l'admin de la boutique
};

const ALL_ROLES = { ...PLATFORM_ROLES, ...SHOP_ROLES };
const PLATFORM_ROLE_LIST = Object.values(PLATFORM_ROLES);
const SHOP_ROLE_LIST = Object.values(SHOP_ROLES);

/**
 * Les 14 permissions modulaires d'une boutique.
 * L'admin peut composer un role personnalise avec n'importe quelle combinaison
 * (ex. "Chef de rayon" = products + stock + inventory).
 */
const PERMISSIONS = {
  DASHBOARD: 'dashboard',
  POS: 'pos',
  PRODUCTS: 'products',
  STOCK: 'stock',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  DOCUMENTS: 'documents',
  INVENTORY: 'inventory',
  TREASURY: 'treasury',
  USERS: 'users',
  MESSAGING: 'messaging',
  TICKETS: 'tickets',
  SUGGESTIONS: 'suggestions',
  SETTINGS: 'settings',
};
const PERMISSION_LIST = Object.values(PERMISSIONS);

/** Permissions attribuees par defaut a chaque role predefini */
const DEFAULT_ROLE_PERMISSIONS = {
  [SHOP_ROLES.ADMIN]: PERMISSION_LIST,          // acces total a SA boutique
  [SHOP_ROLES.CAISSIER]: [
    PERMISSIONS.POS, PERMISSIONS.CUSTOMERS, PERMISSIONS.DOCUMENTS,
    PERMISSIONS.MESSAGING, PERMISSIONS.TICKETS,
  ],
  [SHOP_ROLES.MAGASINIER]: [
    PERMISSIONS.PRODUCTS, PERMISSIONS.STOCK, PERMISSIONS.INVENTORY,
    PERMISSIONS.MESSAGING, PERMISSIONS.TICKETS,
  ],
  [SHOP_ROLES.COMPTABLE]: [
    PERMISSIONS.DASHBOARD, PERMISSIONS.CUSTOMERS, PERMISSIONS.SUPPLIERS,
    PERMISSIONS.DOCUMENTS, PERMISSIONS.TREASURY,
    PERMISSIONS.MESSAGING, PERMISSIONS.TICKETS,
  ],
};

/** Cycle de vie d'un compte boutique (pilote par le Super-Admin) */
const SHOP_STATUS = {
  PENDING: 'pending',       // demande soumise, en attente de validation
  ACTIVE: 'active',         // operationnel
  FROZEN: 'frozen',         // gele (24h -> indefini), avec motif
  BANNED: 'banned',         // banni definitivement, motif obligatoire
  SUSPENDED: 'suspended',   // suspendu pour non-paiement
};

/** Statuts d'une demande d'inscription publique */
const SIGNUP_STATUS = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  INFO_REQUESTED: 'info_requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

/** Types de commerce proposes a l'etape 1 du formulaire d'inscription */
const BUSINESS_TYPES = [
  'boutique_detail', 'depot_grossiste', 'supermarche',
  'pharmacie', 'quincaillerie', 'autre',
];

const BILLING_CYCLE = { MONTHLY: 'monthly', YEARLY: 'yearly' };

const PAYMENT_METHODS = ['especes', 'mobile_money', 'carte', 'virement', 'credit'];

const STOCK_MOVEMENT_TYPES = { IN: 'entree', OUT: 'sortie', ADJUST: 'ajustement' };

const DOCUMENT_TYPES = {
  QUOTE: 'devis', INVOICE: 'facture',
  RECEIPT: 'recu', DELIVERY_NOTE: 'bon_livraison',
};

const DOCUMENT_STATUS = {
  DRAFT: 'brouillon', PENDING: 'en_attente', PAID: 'paye', OVERDUE: 'en_retard',
  ACCEPTED: 'accepte', REJECTED: 'refuse', EXPIRED: 'expire', CANCELLED: 'annule',
};

const TICKET_STATUS = {
  OPEN: 'ouvert', IN_PROGRESS: 'en_cours', RESOLVED: 'resolu', CLOSED: 'ferme',
};
const TICKET_PRIORITY = {
  LOW: 'basse', NORMAL: 'normale', HIGH: 'haute', URGENT: 'urgente',
};

const SUGGESTION_STATUS = {
  PENDING: 'en_attente', ANALYSIS: 'en_analyse', PLANNED: 'planifie',
  DELIVERED: 'livre', REFUSED: 'refuse',
};

/** Statuts d'une transaction FeexPay */
const PAYMENT_STATUS = { PENDING: 'PENDING', SUCCESS: 'SUCCESS', FAILED: 'FAILED' };

/** Filtres du centre de notifications */
const NOTIFICATION_CATEGORIES = {
  ACCOUNT: 'compte', BILLING: 'facturation',
  SECURITY: 'securite', SYSTEM: 'systeme', BUSINESS: 'metier',
};

module.exports = {
  PLATFORM_ROLES, SHOP_ROLES, ALL_ROLES, PLATFORM_ROLE_LIST, SHOP_ROLE_LIST,
  PERMISSIONS, PERMISSION_LIST, DEFAULT_ROLE_PERMISSIONS,
  SHOP_STATUS, SIGNUP_STATUS, BUSINESS_TYPES, BILLING_CYCLE,
  PAYMENT_METHODS, STOCK_MOVEMENT_TYPES, DOCUMENT_TYPES, DOCUMENT_STATUS,
  TICKET_STATUS, TICKET_PRIORITY, SUGGESTION_STATUS, PAYMENT_STATUS,
  NOTIFICATION_CATEGORIES,
};
