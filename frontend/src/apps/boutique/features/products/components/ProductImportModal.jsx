import { useEffect, useRef, useState } from "react";
import { FileUp, X } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { useImportProducts } from "../hooks.js";
import { parseProductCsv } from "../csv.js";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_ROWS = 1000;

function ImportReport({ report }) {
  if (!report) return null;

  const { crees = 0, ignores = [], erreurs = [], totalLignes = 0 } = report;
  const avertissements = report.avertissements || [];

  return (
    <section
      aria-live="polite"
      className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
      aria-label="Rapport d’import"
      role="status"
    >
      <div>
        <h3 className="font-semibold text-slate-900">
          {report.completed ? "Import terminé" : "Vérification du fichier"}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {totalLignes} ligne{totalLignes === 1 ? "" : "s"} dans le fichier
        </p>
      </div>
      {report.completed && (
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-white p-2">
            <dt className="text-xs text-slate-500">Créés</dt>
            <dd className="mt-1 font-semibold text-emerald-700">{crees}</dd>
          </div>
          <div className="rounded-md bg-white p-2">
            <dt className="text-xs text-slate-500">Ignorés</dt>
            <dd className="mt-1 font-semibold text-amber-700">{ignores.length}</dd>
          </div>
          <div className="rounded-md bg-white p-2">
            <dt className="text-xs text-slate-500">En erreur</dt>
            <dd className="mt-1 font-semibold text-red-700">{erreurs.length}</dd>
          </div>
        </dl>
      )}
      {!report.completed && (
        <p className="text-sm text-slate-600">
          {report.validRows} ligne{report.validRows === 1 ? "" : "s"} prête
          {report.validRows === 1 ? "" : "s"} à importer · {erreurs.length} ligne
          {erreurs.length === 1 ? "" : "s"} à corriger
        </p>
      )}
      {avertissements.length > 0 && (
        <ul className="space-y-1 text-xs text-amber-800">
          {avertissements.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      {ignores.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-amber-800">
            Détails des produits ignorés ({ignores.length})
          </summary>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-slate-600">
            {ignores.map((item, index) => (
              <li key={`${item.ligne}-${item.nom}-${index}`}>
                Ligne {item.ligne} · {item.nom || "Sans nom"} : {item.raison}
              </li>
            ))}
          </ul>
        </details>
      )}
      {erreurs.length > 0 && (
        <details className="text-sm" open={!report.completed}>
          <summary className="cursor-pointer font-medium text-red-800">
            Détails des erreurs ({erreurs.length})
          </summary>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-600">
            {erreurs.map((item, index) => (
              <li key={`${item.ligne}-${item.nom}-${index}`}>
                Ligne {item.ligne} · {item.nom || "Sans nom"} : {item.raison}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export default function ProductImportModal({ onClose, onImported }) {
  const dialogRef = useRef(null);
  const importMutation = useImportProducts();
  const [fileName, setFileName] = useState("");
  const [parsedFile, setParsedFile] = useState(null);
  const [report, setReport] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return undefined;

    dialog.showModal();
    dialog.querySelector("input")?.focus();

    return () => dialog.close();
  }, []);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setParsedFile(null);
    setReport(null);
    setErrorMessage("");
    setFileName(file?.name || "");

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErrorMessage("Sélectionnez un fichier au format .csv.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage("Le fichier dépasse la limite de 2 Mo acceptée par l’API.");
      return;
    }

    setIsParsing(true);

    try {
      const result = await parseProductCsv(file);

      if (result.totalLignes > MAX_ROWS) {
        setReport({
          totalLignes: result.totalLignes,
          validRows: 0,
          erreurs: [
            {
              ligne: MAX_ROWS + 2,
              nom: "",
              raison: `Le fichier dépasse la limite de ${MAX_ROWS} produits par import.`,
            },
          ],
        });
        return;
      }

      const requestSize = new Blob([
        JSON.stringify({
          produits: result.produits.map(({ produit }) => produit),
        }),
      ]).size;

      if (requestSize > MAX_FILE_SIZE) {
        setReport({
          totalLignes: result.totalLignes,
          validRows: 0,
          erreurs: [
            {
              ligne: 1,
              nom: "",
              raison: "Les données dépassent la limite de 2 Mo acceptée par l’API après conversion.",
            },
          ],
        });
        return;
      }

      setParsedFile(result);
      setReport({
        totalLignes: result.totalLignes,
        validRows: result.produits.length,
        erreurs: result.erreurs,
        avertissements: result.produits.some((row) => row.hasCodeBarre)
          ? ["Le code-barres figure dans le fichier, mais l’API d’import actuelle ne le prend pas en charge."]
          : [],
      });
    } catch (error) {
      setErrorMessage(parseApiError(error).message);
    } finally {
      setIsParsing(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!parsedFile?.produits.length) {
      setErrorMessage("Aucune ligne valide à importer.");
      return;
    }

    try {
      const rows = parsedFile.produits;
      const result = await importMutation.mutateAsync(
        rows.map(({ produit }) => produit),
      );
      const mapServerLines = (items = []) =>
        items.map((item) => ({
          ...item,
          ligne: rows[item.ligne - 1]?.ligne ?? item.ligne,
        }));

      setReport({
        completed: true,
        totalLignes: parsedFile.totalLignes,
        crees: result.crees || 0,
        ignores: mapServerLines(result.ignores),
        erreurs: [
          ...parsedFile.erreurs,
          ...mapServerLines(result.erreurs),
        ],
        avertissements: parsedFile.produits.some((row) => row.hasCodeBarre)
          ? ["Le code-barres figure dans le fichier, mais l’API d’import actuelle ne le prend pas en charge."]
          : [],
      });
      onImported();
    } catch (error) {
      const apiError = parseApiError(error);
      setErrorMessage(
        apiError.code === "QUOTA_EXCEEDED"
          ? `${apiError.message} Réduisez le nombre de produits ou passez à un forfait supérieur.`
          : apiError.message,
      );
    }
  }

  const isBusy = isParsing || importMutation.isPending;

  return (
    <dialog
      aria-labelledby="product-import-title"
      aria-modal="true"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-transparent p-0 backdrop:bg-slate-950/50"
      onClick={(event) => {
        if (event.target === dialogRef.current && !isBusy) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!isBusy) onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex min-h-full items-start justify-center px-3 py-4 sm:items-center sm:px-5 sm:py-8">
        <section className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-modal sm:max-h-[calc(100vh-4rem)]">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900" id="product-import-title">
                Importer un catalogue CSV
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                1 000 produits maximum · fichier de 2 Mo maximum
              </p>
            </div>
            <button
              aria-label="Fermer la fenêtre"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50"
              disabled={isBusy}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </header>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
              <p className="text-sm leading-6 text-slate-600">
                Le CSV doit contenir les colonnes{" "}
                <code className="rounded bg-slate-100 px-1">nom</code>,{" "}
                <code className="rounded bg-slate-100 px-1">prixAchat</code> et{" "}
                <code className="rounded bg-slate-100 px-1">prixVente</code>.
                Les lignes invalides seront détaillées dans le rapport.
                {" "}Le code-barres exporté ne peut pas être restauré par l’API d’import actuelle.
              </p>

              <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-brand-400 hover:bg-brand-50/40">
                <FileUp aria-hidden="true" className="h-6 w-6 text-brand-600" />
                <span className="mt-2 text-sm font-medium text-slate-800">
                  {fileName || "Choisir un fichier CSV"}
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  Format .csv, séparateur détecté automatiquement
                </span>
                <input
                  accept=".csv,text/csv"
                  className="sr-only"
                  disabled={isBusy}
                  onChange={handleFileChange}
                  type="file"
                />
              </label>

              {isParsing && (
                <p className="text-sm text-slate-500" role="status">
                  Lecture et validation du fichier…
                </p>
              )}

              {errorMessage && (
                <p
                  aria-live="assertive"
                  className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
                  role="alert"
                >
                  {errorMessage}
                </p>
              )}

              <ImportReport report={report} />
            </div>

            <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-32"
                disabled={isBusy}
                onClick={onClose}
                type="button"
              >
                {report?.completed ? "Fermer" : "Annuler"}
              </button>
              {!report?.completed && (
                <button
                  className="h-11 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-40"
                  disabled={isBusy || !parsedFile?.produits.length}
                  type="submit"
                >
                  {isParsing
                    ? "Analyse…"
                    : importMutation.isPending
                      ? "Importation…"
                      : `Importer ${parsedFile?.produits.length || 0} produit${parsedFile?.produits.length === 1 ? "" : "s"}`}
                </button>
              )}
            </footer>
          </form>
        </section>
      </div>
    </dialog>
  );
}
