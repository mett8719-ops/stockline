import { useRef, useState } from "react";
import {
  FileText,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Badge from "@/components/ui/Badge.jsx";
import Button from "@/components/ui/Button.jsx";
import Input from "@/components/ui/Input.jsx";
import Modal from "@/components/ui/Modal.jsx";
import Textarea from "@/components/ui/Textarea.jsx";
import { parseApiError } from "@/core/api/errors.js";
import { useDebounce } from "@/core/hooks/useDebounce.js";
import { formatMoney } from "@/core/utils/formatMoney.js";
import {
  computeTotals,
  validateDocumentDraft,
} from "../createSchemas.js";
import {
  useCreateDocument,
  useDocumentCustomers,
  useDocumentProducts,
} from "../hooks.js";

function localDateValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function blankLine(key) {
  return {
    key,
    designation: "",
    quantite: "1",
    prixUnitaire: "",
    tauxTva: "0",
    remise: "0",
  };
}

function FieldError({ children }) {
  return children ? (
    <p className="mt-1 text-xs text-red-600" role="alert">
      {children}
    </p>
  ) : null;
}

function ProductPicker({ onAdd }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query.trim(), 250);
  const search = useDocumentProducts(
    debouncedQuery,
    isOpen && debouncedQuery.length > 0 && query.trim() === debouncedQuery,
  );

  return (
    <div className="relative">
      <label className="relative block">
        <span className="sr-only">Rechercher un produit du catalogue</span>
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <input
          aria-expanded={isOpen && query.trim().length > 0}
          aria-label="Rechercher un produit du catalogue"
          autoComplete="off"
          className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Rechercher un produit à ajouter..."
          role="combobox"
          value={query}
        />
      </label>

      {isOpen && query.trim() && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {search.isFetching || query.trim() !== debouncedQuery ? (
            <p className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500">
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              Recherche des produits…
            </p>
          ) : search.isError ? (
            <p className="px-3 py-3 text-sm text-red-600" role="alert">
              {parseApiError(search.error).message}
            </p>
          ) : search.data?.length ? (
            <ul aria-label="Produits trouvés">
              {search.data.map((product) => (
                <li key={product._id ?? product.id}>
                  <button
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                    onClick={() => {
                      onAdd(product);
                      setQuery("");
                      setIsOpen(false);
                    }}
                    onMouseDown={(event) => event.preventDefault()}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900">
                        {product.nom}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {product.unite || "Unité"} · {formatMoney(product.prixVente)}
                      </span>
                    </span>
                    <Plus aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-600" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm text-slate-500">
              Aucun produit trouvé. Tu peux ajouter une prestation libre.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CreateDocumentModal({ isOpen, onClose, onCreated }) {
  const lineKey = useRef(0);
  const [type, setType] = useState("facture");
  const [clientQuery, setClientQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientNom, setClientNom] = useState("");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [dateEmission, setDateEmission] = useState(localDateValue);
  const [dateEcheance, setDateEcheance] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([]);
  const [globalDiscount, setGlobalDiscount] = useState("0");
  const [errors, setErrors] = useState({});
  const debouncedClientQuery = useDebounce(clientQuery.trim(), 250);
  const customers = useDocumentCustomers(
    debouncedClientQuery,
    clientPickerOpen &&
      debouncedClientQuery.length > 0 &&
      clientQuery.trim() === debouncedClientQuery,
  );
  const createMutation = useCreateDocument();

  function handleClose() {
    if (!createMutation.isPending) onClose();
  }

  function addProduct(product) {
    setLines((current) => [
      ...current,
      {
        key: ++lineKey.current,
        produitId: product._id ?? product.id,
        designation: product.nom,
        quantite: "1",
        prixUnitaire: String(product.prixVente),
        tauxTva: String(product.tauxTva ?? 0),
        remise: "0",
      },
    ]);
  }

  function addFreeLine() {
    setLines((current) => [...current, blankLine(++lineKey.current)]);
  }

  function updateLine(key, field, value) {
    setLines((current) =>
      current.map((line) =>
        line.key === key ? { ...line, [field]: value } : line,
      ),
    );
  }

  function selectCustomer(customer) {
    setClientId(customer._id ?? customer.id);
    setClientNom(customer.nom);
    setClientQuery(customer.nom);
    setClientPickerOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const values = {
      type,
      clientId,
      clientNom,
      lignes: lines,
      remiseGlobale: globalDiscount,
      dateEmission,
      dateEcheance,
      notes,
    };
    const validationErrors = validateDocumentDraft(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    const document = {
      type,
      ...(clientId ? { clientId } : { clientNom: clientNom.trim() }),
      lignes: lines.map((line) => ({
        ...(line.produitId ? { produitId: line.produitId } : {}),
        designation: line.designation.trim(),
        quantite: Number(line.quantite),
        prixUnitaire: Number(line.prixUnitaire),
        tauxTva: Number(line.tauxTva || 0),
        remise: Number(line.remise || 0),
      })),
      remiseGlobale: Number(globalDiscount || 0),
      ...(dateEmission ? { dateEmission } : {}),
      ...(dateEcheance ? { dateEcheance } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    try {
      await createMutation.mutateAsync(document);
      onCreated(type);
    } catch {
      // Mutation error is rendered below with parseApiError.
    }
  }

  const totals = computeTotals(lines, globalDiscount || 0);
  const hasLines = lines.length > 0;

  return (
    <Modal
      className="max-h-[calc(100vh-2rem)] overflow-y-auto"
      footer={
        <>
          <Button
            className="w-full sm:w-auto"
            disabled={createMutation.isPending}
            onClick={handleClose}
            variant="secondary"
          >
            Annuler
          </Button>
          <Button
            className="w-full sm:w-auto"
            form="create-document-form"
            isLoading={createMutation.isPending}
            type="submit"
          >
            Créer
          </Button>
        </>
      }
      footerClassName="sm:justify-end"
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      title="Nouveau document"
    >
      <form
        className="space-y-5"
        id="create-document-form"
        onSubmit={handleSubmit}
      >
        {createMutation.isError && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            role="alert"
          >
            {parseApiError(createMutation.error).message}
          </div>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">
            Type de document
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "facture", label: "Facture" },
              { id: "devis", label: "Devis" },
            ].map((item) => (
              <button
                aria-pressed={type === item.id}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 px-3 text-sm font-semibold transition ${
                  type === item.id
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
                key={item.id}
                onClick={() => setType(item.id)}
                type="button"
              >
                <FileText aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="relative">
          <label
            className="mb-1.5 block text-sm font-medium text-slate-700"
            htmlFor="document-customer"
          >
            Client
          </label>
          <input
            aria-autocomplete="list"
            aria-expanded={clientPickerOpen && clientQuery.trim().length > 0}
            aria-label="Sélectionner ou saisir un client"
            autoComplete="off"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            id="document-customer"
            onBlur={() => window.setTimeout(() => setClientPickerOpen(false), 150)}
            onChange={(event) => {
              setClientId("");
              setClientNom(event.target.value);
              setClientQuery(event.target.value);
              setClientPickerOpen(true);
            }}
            onFocus={() => setClientPickerOpen(true)}
            placeholder="Sélectionner ou saisir un client"
            role="combobox"
            value={clientQuery}
          />
          {clientId && (
            <Badge className="mt-2" variant="success">
              Client du fichier
            </Badge>
          )}
          {errors.client && <FieldError>{errors.client}</FieldError>}
          {clientPickerOpen && clientQuery.trim() && (
            <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {customers.isFetching ||
              clientQuery.trim() !== debouncedClientQuery ? (
                <p className="px-3 py-3 text-sm text-slate-500">
                  Recherche des clients…
                </p>
              ) : customers.isError ? (
                <p className="px-3 py-3 text-sm text-red-600" role="alert">
                  {parseApiError(customers.error).message} Vous pouvez saisir le
                  nom manuellement.
                </p>
              ) : customers.data?.length ? (
                <ul aria-label="Clients trouvés">
                  {customers.data.map((customer) => (
                    <li key={customer._id ?? customer.id}>
                      <button
                        className="min-h-11 w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                        onClick={() => selectCustomer(customer)}
                        onMouseDown={(event) => event.preventDefault()}
                        type="button"
                      >
                        {customer.nom}
                        {customer.telephone && (
                          <span className="ml-2 text-xs text-slate-500">
                            {customer.telephone}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-3 text-sm text-slate-500">
                  Aucun client trouvé. Le nom saisi sera utilisé sur le document.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="document-issue-date"
            label="Date d’émission"
            onChange={(event) => setDateEmission(event.target.value)}
            type="date"
            value={dateEmission}
            error={errors.dateEmission}
          />
          <Input
            id="document-due-date"
            label="Date d’échéance"
            onChange={(event) => setDateEcheance(event.target.value)}
            type="date"
            value={dateEcheance}
            error={errors.dateEcheance}
          />
        </div>

        <section aria-labelledby="document-lines-title" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3
                className="text-sm font-semibold text-slate-900"
                id="document-lines-title"
              >
                Produits et prestations
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Les montants sont saisis TTC ; la TVA est incluse dans le prix.
              </p>
            </div>
            <Button
              className="!min-h-10"
              onClick={addFreeLine}
              type="button"
              variant="secondary"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Prestation libre
            </Button>
          </div>

          <ProductPicker onAdd={addProduct} />
          {errors.lignes && <FieldError>{errors.lignes}</FieldError>}

          {hasLines ? (
            <div className="space-y-3">
              {lines.map((line, index) => (
                <article
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                  key={line.key}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-600">
                      Ligne {index + 1}
                    </p>
                    <button
                      aria-label={`Supprimer la ligne ${index + 1}`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      onClick={() =>
                        setLines((current) =>
                          current.filter((entry) => entry.key !== line.key),
                        )
                      }
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                  {line.produitId && (
                    <Badge className="mb-2" variant="info">
                      Produit catalogue
                    </Badge>
                  )}
                  <Input
                    id={`document-line-${line.key}-designation`}
                    label="Désignation"
                    maxLength={200}
                    onChange={(event) =>
                      updateLine(line.key, "designation", event.target.value)
                    }
                    value={line.designation}
                    error={errors[`lignes.${index}.designation`]}
                  />
                  <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Input
                      id={`document-line-${line.key}-quantity`}
                      label="Quantité"
                      min="0.001"
                      onChange={(event) =>
                        updateLine(line.key, "quantite", event.target.value)
                      }
                      step="any"
                      type="number"
                      value={line.quantite}
                      error={errors[`lignes.${index}.quantite`]}
                    />
                    <Input
                      id={`document-line-${line.key}-price`}
                      label="Prix unitaire (FCFA)"
                      min="0"
                      onChange={(event) =>
                        updateLine(line.key, "prixUnitaire", event.target.value)
                      }
                      step="any"
                      type="number"
                      value={line.prixUnitaire}
                      error={errors[`lignes.${index}.prixUnitaire`]}
                    />
                    <Input
                      id={`document-line-${line.key}-tax`}
                      label="TVA (%)"
                      min="0"
                      max="100"
                      onChange={(event) =>
                        updateLine(line.key, "tauxTva", event.target.value)
                      }
                      step="any"
                      type="number"
                      value={line.tauxTva}
                      error={errors[`lignes.${index}.tauxTva`]}
                    />
                    <Input
                      id={`document-line-${line.key}-discount`}
                      label="Remise ligne (FCFA)"
                      min="0"
                      onChange={(event) =>
                        updateLine(line.key, "remise", event.target.value)
                      }
                      step="any"
                      type="number"
                      value={line.remise}
                      error={errors[`lignes.${index}.remise`]}
                    />
                  </div>
                  <p className="mt-3 text-right text-sm font-semibold text-slate-700">
                    Total ligne : {formatMoney(totals.lignes[index].totalLigne)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
              Recherchez un produit ou ajoutez une prestation libre.
            </div>
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
          <Textarea
            id="document-notes"
            label="Notes"
            maxLength={1000}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Conditions de paiement, remarques..."
            value={notes}
            error={errors.notes}
          />
          <div className="space-y-3 rounded-lg bg-slate-50 p-4">
            <p className="flex items-center justify-between gap-3 text-sm text-slate-600">
              <span>Sous-total</span>
              <strong className="text-slate-900">
                {formatMoney(totals.sousTotal)}
              </strong>
            </p>
            <p className="flex items-center justify-between gap-3 text-sm text-slate-600">
              <span>TVA incluse</span>
              <strong className="text-slate-900">
                {formatMoney(totals.montantTva)}
              </strong>
            </p>
            <Input
              id="document-global-discount"
              label="Remise globale (FCFA)"
              min="0"
              onChange={(event) => setGlobalDiscount(event.target.value)}
              step="any"
              type="number"
              value={globalDiscount}
              error={errors.remiseGlobale}
            />
            <p className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
              <span>Total à payer</span>
              <span>{formatMoney(totals.montantTotal)}</span>
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
