import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  businessTypeLabels,
  formatSignupDate,
  getPlanBadgeClass,
  rejectSignupSchema,
  requestInfoSchema,
  signupStatusMeta,
} from "../src/apps/platform/features/signups/schemas.js";

describe("ET-01 — Validation et helpers Demandes d'inscription", () => {
  it("valide requestInfoSchema avec un message d'au moins 10 caractères", () => {
    const ok = requestInfoSchema.safeParse({
      message: "Merci d'indiquer votre numéro RCCM complet.",
    });
    assert.equal(ok.success, true);

    const tooShort = requestInfoSchema.safeParse({ message: "Court" });
    assert.equal(tooShort.success, false);
  });

  it("valide rejectSignupSchema avec un motif d'au moins 5 caractères", () => {
    const ok = rejectSignupSchema.safeParse({
      motif: "Coordonnées non vérifiables.",
    });
    assert.equal(ok.success, true);

    const tooShort = rejectSignupSchema.safeParse({ motif: "Non" });
    assert.equal(tooShort.success, false);
  });

  it("mappe correctement les statuts, types d'activité et badges de plan", () => {
    assert.equal(signupStatusMeta.pending.label, "En attente");
    assert.equal(signupStatusMeta.in_review.label, "En cours de vérification");
    assert.equal(businessTypeLabels.boutique_detail, "Boutique de détail");
    assert.match(getPlanBadgeClass("Pro"), /blue/);
    assert.match(getPlanBadgeClass("Enterprise"), /platform/);
    assert.match(getPlanBadgeClass("Starter"), /slate/);
  });

  it("formate les dates valides et rejette les valeurs invalides", () => {
    assert.equal(formatSignupDate(null), "—");
    assert.equal(formatSignupDate("not-a-date"), "—");
    assert.notEqual(formatSignupDate("2026-01-15T14:22:00Z"), "—");
  });
});
