/**
 * Generation et verification des jetons JWT.
 *
 * STRATEGIE :
 *  - access token  : 15 min, en-tete `Authorization: Bearer <token>`
 *  - refresh token : 7 jours, cookie httpOnly + SameSite
 *                    → inaccessible au JS du navigateur, donc protege du XSS
 *
 * Le payload ne contient QUE l'identifiant, le role et le shopId. Les
 * permissions sont relues en base a chaque requete (voir authenticate.js) :
 * ainsi, retirer un droit a un agent prend effet IMMEDIATEMENT, sans attendre
 * l'expiration de son jeton.
 */
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/** Jeton d'acces courte duree. */
function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      shopId: user.shopId ? user.shopId.toString() : null,
      typ: "access",
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_TTL || "15m", issuer: "stockline-api" }
  );
}

/** Jeton de rafraichissement. `tokenId` permet de le revoquer individuellement. */
function signRefreshToken(user, tokenId) {
  return jwt.sign(
    { sub: user._id.toString(), jti: tokenId, typ: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_TTL || "7d", issuer: "stockline-api" }
  );
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    issuer: "stockline-api",
  });
  // Empeche d'utiliser un refresh token comme access token
  if (payload.typ !== "access") throw new jwt.JsonWebTokenError("Type de jeton incorrect");
  return payload;
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    issuer: "stockline-api",
  });
  if (payload.typ !== "refresh") throw new jwt.JsonWebTokenError("Type de jeton incorrect");
  return payload;
}

/** Identifiant unique d'une session (permet la revocation ciblee). */
const newTokenId = () => crypto.randomUUID();

/**
 * Genere un mot de passe temporaire LISIBLE pour l'email d'activation.
 * Les caracteres ambigus (I, l, O, 0, 1) sont exclus : le proprietaire doit
 * pouvoir le recopier sans se tromper, ou se le faire dicter au telephone.
 */
function generateTemporaryPassword() {
  const maj = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sans I ni O
  const min = "abcdefghijkmnopqrstuvwxyz"; // sans l
  const num = "23456789";                  // sans 0 ni 1
  const spe = "@#$%&*";

  const pick = (s) => s[crypto.randomInt(s.length)];
  const base = [pick(maj), pick(min), pick(num), pick(spe)];
  const pool = maj + min + num;
  while (base.length < 12) base.push(pick(pool));

  // Melange de Fisher-Yates avec source aleatoire cryptographique
  for (let i = base.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base.join("");
}

/**
 * Options du cookie portant le refresh token.
 * `sameSite: none` en production car l'API (api.stockline.cg) et le frontend
 * (app.stockline.cg) sont sur des sous-domaines differents.
 */
function refreshCookieOptions() {
  return {
    httpOnly: true,                                 // anti-XSS
    secure: process.env.NODE_ENV === "production",  // HTTPS uniquement en prod
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,                // 7 jours
  };
}

module.exports = {
  signAccessToken, signRefreshToken,
  verifyAccessToken, verifyRefreshToken,
  newTokenId, generateTemporaryPassword, refreshCookieOptions,
};
