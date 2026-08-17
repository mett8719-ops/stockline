/**
 * Middleware de validation base sur Zod.
 *
 * ══ DOUBLE ROLE — c'est le point cle de notre architecture ══
 *   1. il VALIDE et nettoie les donnees entrantes ;
 *   2. le MEME schema alimente automatiquement la documentation OpenAPI
 *      (voir openapi.js).
 *
 * Un seul schema ecrit = validation + documentation toujours a jour.
 *
 * Les donnees validees sont placees dans `req.validated` et NON dans `req.body` :
 * on est ainsi certain qu'un controleur ne lit jamais de donnee non validee.
 *
 * Usage :
 *   router.post("/", validate({ body: createProductSchema }), controller.create);
 */
const { ZodError } = require("zod");
const AppError = require("./app-error");

function validate(schemas = {}) {
  return (req, _res, next) => {
    try {
      req.validated = {};
      if (schemas.body)   req.validated.body   = schemas.body.parse(req.body ?? {});
      if (schemas.query)  req.validated.query  = schemas.query.parse(req.query ?? {});
      if (schemas.params) req.validated.params = schemas.params.parse(req.params ?? {});
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        // On renvoie le detail champ par champ : le frontend peut afficher
        // l'erreur sous le bon input du formulaire.
        // zod v4 expose `issues` (v3 : `errors`)
        const details = (err.issues ?? err.errors).map((e) => ({
          champ: e.path.join(".") || "(racine)",
          message: e.message,
        }));
        return next(AppError.unprocessable("Donnees invalides", details));
      }
      return next(err);
    }
  };
}

module.exports = validate;
