import apiClient from "@/core/api/client.js";

export async function getPublicPlans() {
  const response = await apiClient.get("/public/plans");
  const plans = response.data?.data;

  if (!Array.isArray(plans)) {
    throw new TypeError("La réponse des tarifs publics est invalide.");
  }

  for (const plan of plans) {
    const planId = plan?._id ?? plan?.id;

    if (
      !planId ||
      typeof plan.nom !== "string" ||
      !plan.nom.trim() ||
      !Number.isFinite(plan.prix) ||
      plan.prix < 0 ||
      typeof plan.devise !== "string" ||
      !/^[A-Z]{3}$/.test(plan.devise) ||
      (plan.remiseAnnuellePourcent != null &&
        (!Number.isFinite(plan.remiseAnnuellePourcent) ||
          plan.remiseAnnuellePourcent < 0 ||
          plan.remiseAnnuellePourcent > 100)) ||
      (plan.fonctionnalitesSupplementaires != null &&
        (!Array.isArray(plan.fonctionnalitesSupplementaires) ||
          !plan.fonctionnalitesSupplementaires.every(
            (feature) => typeof feature === "string",
          )))
    ) {
      throw new TypeError("Un forfait reçu de l’API contient des tarifs invalides.");
    }
  }

  return plans;
}
