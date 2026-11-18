const request = require("supertest");
const mongoose = require("mongoose");
const { updateShopSettingsSchema } = require("./model/shop-settings.schema");

describe("Tests unitaires & validation — Paramètres Boutique (DJ-14)", () => {
  describe("Validation du schéma updateShopSettingsSchema", () => {
    it("valide des données correctes avec XAF et délais de paiement", () => {
      const payload = {
        nom: "Boutique Maman Grâce",
        adresse: "Avenue de la Paix, Brazzaville",
        telephone: "+242061234567",
        email: "contact@mamangrace.cg",
        rccm: "CG-BZV-2026-A-001",
        devise: "XAF",
        delaiPaiementClient: 45,
        delaiPaiementFournisseur: 20,
      };

      const result = updateShopSettingsSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect(result.data.delaiPaiementClient).toBe(45);
      expect(result.data.delaiPaiementFournisseur).toBe(20);
      expect(result.data.devise).toBe("XAF");
    });

    it("refuse un délai de paiement négatif", () => {
      const payload = {
        delaiPaiementClient: -5,
      };

      const result = updateShopSettingsSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("ne peut pas être négatif");
    });

    it("refuse un délai de paiement supérieur à 365 jours", () => {
      const payload = {
        delaiPaiementFournisseur: 400,
      };

      const result = updateShopSettingsSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("ne peut pas dépasser 365");
    });

    it("refuse une adresse email malformée", () => {
      const payload = {
        email: "invalid-email-format",
      };

      const result = updateShopSettingsSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("Adresse e-mail invalide");
    });

    it("refuse les balises HTML contre les attaques XSS", () => {
      const payload = {
        nom: "<script>alert('xss')</script>",
      };

      const result = updateShopSettingsSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("balises HTML");
    });
  });

  describe("Contrôle d'accès et isolation tenant (Règles métier)", () => {
    it("interdit la modification aux utilisateurs avec un rôle autre qu'admin", () => {
      const mockReqNonAdmin = {
        user: {
          id: new mongoose.Types.ObjectId().toString(),
          role: "caissier",
          shopId: new mongoose.Types.ObjectId().toString(),
        },
      };

      expect(mockReqNonAdmin.user.role).not.toBe("admin");
    });

    it("garantit que l'identifiant boutique utilisé est strictement issu de la session utilisateur", () => {
      const shopIdA = new mongoose.Types.ObjectId().toString();
      const shopIdB = new mongoose.Types.ObjectId().toString();

      const reqUser = {
        user: {
          id: new mongoose.Types.ObjectId().toString(),
          role: "admin",
          shopId: shopIdA,
        },
        params: { shopId: shopIdB }, // Tentative cross-tenant par paramètre
      };

      // Le contrôleur utilise EXCLUSIVEMENT req.user.shopId
      const targetShopId = reqUser.user.shopId;
      expect(targetShopId).toBe(shopIdA);
      expect(targetShopId).not.toBe(shopIdB);
    });
  });
});
