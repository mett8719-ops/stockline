/**
 * Controleurs de la boite a suggestions (interne a chaque boutique).
 *
 * Les agents proposent, l'equipe vote, l'admin repond et fait evoluer le
 * statut. On stocke la LISTE des votants plutot qu'un simple compteur : c'est
 * ce qui permet d'empecher un double vote et d'afficher l'etat du bouton pour
 * l'utilisateur courant.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success, paginationMeta } = require("../../../../../core/response");
const { tenantScope, tenantPayload } = require("../../../../../core/tenant-guard");
const SuggestionModel = require("../model/suggestion.model");

/** GET /suggestions — Liste triee par votes, avec compteurs par statut. */
const list = asyncHandler(async (req, res) => {
  const { page, limit, module, statut } = req.validated.query;

  const criteres = {};
  if (module) criteres.module = module;
  if (statut) criteres.statut = statut;

  const filtre = tenantScope(req, criteres);

  const [suggestions, total, compteurs] = await Promise.all([
    SuggestionModel.find(filtre)
      // Les plus plebiscitees en premier
      .sort({ nombreVotes: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    SuggestionModel.countDocuments(filtre),

    // Les 4 compteurs affiches en haut de l'ecran
    SuggestionModel.aggregate([
      { $match: tenantScope(req, {}) },
      { $group: { _id: "$statut", total: { $sum: 1 } } },
    ]),
  ]);

  return success(
    res,
    {
      suggestions: suggestions.map((s) => ({
        ...s,
        // Etat du bouton de vote pour l'utilisateur courant
        aVote: s.votants?.some((v) => String(v) === req.user.id) || false,
      })),
      compteurs: compteurs.reduce(
        (acc, c) => ({ ...acc, [c._id]: c.total }),
        {}
      ),
    },
    200,
    paginationMeta(page, limit, total)
  );
});

/** POST /suggestions — Proposer une amelioration. */
const create = asyncHandler(async (req, res) => {
  const suggestion = await SuggestionModel.create(
    tenantPayload(req, {
      ...req.validated.body,
      auteurId: req.user.id,
      auteurNom: req.user.nom,
      // L'auteur vote automatiquement pour sa propre idee
      votants: [req.user.id],
      nombreVotes: 1,
    })
  );

  return success(res, suggestion, 201);
});

/** POST /suggestions/:id/vote — Vote ou retrait de vote (bascule). */
const toggleVote = asyncHandler(async (req, res) => {
  const suggestion = await SuggestionModel.findOne(
    tenantScope(req, { _id: req.validated.params.id })
  );

  if (!suggestion) throw AppError.notFound("Suggestion introuvable");

  const dejaVote = suggestion.votants.some((v) => String(v) === req.user.id);

  if (dejaVote) {
    suggestion.votants = suggestion.votants.filter(
      (v) => String(v) !== req.user.id
    );
  } else {
    suggestion.votants.push(req.user.id);
  }

  // Le compteur derive de la liste : impossible qu'ils divergent
  suggestion.nombreVotes = suggestion.votants.length;
  await suggestion.save();

  return success(res, {
    nombreVotes: suggestion.nombreVotes,
    aVote: !dejaVote,
  });
});

/**
 * PATCH /suggestions/:id — Reponse de l'equipe et changement de statut.
 * Reserve a l'administrateur de la boutique.
 */
const respond = asyncHandler(async (req, res) => {
  const { statut, reponse } = req.validated.body;

  const suggestion = await SuggestionModel.findOne(
    tenantScope(req, { _id: req.validated.params.id })
  );

  if (!suggestion) throw AppError.notFound("Suggestion introuvable");

  if (statut) suggestion.statut = statut;

  if (reponse) {
    suggestion.reponseEquipe = {
      texte: reponse,
      auteurId: req.user.id,
      auteurNom: req.user.nom,
      date: new Date(),
    };
  }

  await suggestion.save();
  return success(res, suggestion);
});

module.exports = { list, create, toggleVote, respond };
