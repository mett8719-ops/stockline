const ERROR_MESSAGES = {
  QUOTA_EXCEEDED: "La limite prévue par votre forfait a été atteinte.",
  INSUFFICIENT_STOCK: "Le stock disponible est insuffisant.",
  PASSWORD_CHANGE_REQUIRED: "Vous devez changer votre mot de passe pour continuer.",
  SHOP_FROZEN: "Cette boutique est temporairement gelée.",
  SHOP_BANNED: "Cette boutique est suspendue définitivement.",
  SHOP_SUSPENDED: "Cette boutique est temporairement suspendue.",
};

export function parseApiError(err) {
  const apiError = err?.response?.data?.error;
  const code = apiError?.code ?? err?.code ?? null;
  const message =
    apiError?.message ??
    ERROR_MESSAGES[code] ??
    err?.message ??
    "Une erreur inattendue est survenue.";
  const details = apiError?.details;

  return {
    message,
    code,
    details: Array.isArray(details) ? details : details == null ? [] : [details],
  };
}
